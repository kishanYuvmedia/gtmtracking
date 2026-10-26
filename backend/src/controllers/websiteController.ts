import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createWebsite, getWebsitesByUserId, getWebsiteByIdWithStats, getWebsiteEvents, getWebsiteAdSummary, getWebsiteEventNames, getWebsiteEventReport, Website } from '../database/models/Website';
import { Workspace, ensureWorkspaceForUser } from '../database/models/Workspace';
import { setUserWorkspaceId } from '../database/models/User';
import { Source, ensureWebsiteSource } from '../database/models/Source';
import { AppError } from '../middleware/errorHandler';
import { getEcommerceStatus } from '../services/ecommerceStatusService';
import { COUNTRIES, CURRENCIES, findCountry } from '../utils/countries';

const DISCONNECTED = 'disconnected';

/** Validates country (+ optional currency override) → { country, currency, timezone }. */
function countrySettings(country: unknown, currency: unknown, required: boolean) {
  if ((country === undefined || country === null || country === '') && !required) return null;
  const info = findCountry(country);
  if (!info) throw new AppError(400, 'Select the country your website sells in');
  let selectedCurrency = info.currency;
  if (currency !== undefined && currency !== null && currency !== '') {
    if (typeof currency !== 'string' || !CURRENCIES.includes(currency.trim().toUpperCase())) {
      throw new AppError(400, `Currency must be one of ${CURRENCIES.join(', ')}`);
    }
    selectedCurrency = currency.trim().toUpperCase();
  }
  return { country: info.code, currency: selectedCurrency, timezone: info.timezone };
}

function collectorBaseUrl(req: Request): string {
  const configuredUrl = process.env.COLLECTOR_URL || process.env.CDN_URL;
  const value = configuredUrl || `${req.protocol}://${req.get('host')}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError(500, 'COLLECTOR_URL must be a valid absolute URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AppError(500, 'COLLECTOR_URL must use HTTP or HTTPS and cannot include credentials');
  }

  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function normalizeDomain(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'Each domain must be a non-empty string');
  }

  const input = value.trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) {
    throw new AppError(400, `Invalid domain: ${input}`);
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new AppError(400, `Invalid domain: ${input}`);
  }

  const domain = url.hostname.toLowerCase().replace(/\.$/, '');
  const labels = domain.split('.');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    domain.length > 253 ||
    labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  ) {
    throw new AppError(400, `Invalid domain: ${input}`);
  }

  return domain;
}

export const websiteController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { domain, domains, name, website_type, country, currency } = req.body;
      const requestedDomains: unknown[] = Array.isArray(domains)
        ? domains
        : domain
          ? [domain]
          : [];
      if (requestedDomains.length === 0) throw new AppError(400, 'At least one domain is required');
      if (requestedDomains.length > 100) throw new AppError(400, 'A maximum of 100 domains can be added at once');

      const normalizedDomains = requestedDomains.map(normalizeDomain);
      if (new Set(normalizedDomains).size !== normalizedDomains.length) {
        throw new AppError(400, 'The domain list contains duplicates');
      }

      if (name !== undefined && typeof name !== 'string') throw new AppError(400, 'Website name must be a string');
      if (website_type !== undefined && typeof website_type !== 'string') {
        throw new AppError(400, 'Website type must be a string');
      }
      const websiteName = typeof name === 'string' ? name.trim() : '';
      if (websiteName.length > 120) throw new AppError(400, 'Website name must be 120 characters or fewer');
      const websiteType = typeof website_type === 'string' ? website_type.trim() : '';
      const locale = countrySettings(country, currency, true)!;

      const bareDomain = (value: string) => value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split(/[/?#]/, 1)[0]
        .replace(/\.$/, '');
      const existingWebsites = await Website.find({ user_id: req.user!.userId })
        .select('_id domain status').lean<{ _id: string; domain: string; status: string }[]>();
      const connected = new Set(existingWebsites.filter(website => website.status !== DISCONNECTED).map(website => bareDomain(website.domain)));
      const existingDomain = normalizedDomains.find(websiteDomain => connected.has(websiteDomain));
      if (existingDomain) throw new AppError(409, `Domain already connected: ${existingDomain}`);
      // Re-adding a disconnected domain reconnects it (same pixel key, history kept).
      const reconnect = new Map(existingWebsites
        .filter(website => website.status === DISCONNECTED)
        .map(website => [bareDomain(website.domain), website._id]));

      const workspace = await ensureWorkspaceForUser(req.user!.userId);
      await setUserWorkspaceId(req.user!.userId, workspace.id);
      const reconnected = await Promise.all(normalizedDomains.filter(domain => reconnect.has(domain)).map(async domain => {
        const id = reconnect.get(domain)!;
        await Website.updateOne({ _id: id, user_id: req.user!.userId }, {
          $set: {
            status: 'active', disconnected_at: null, website_type: websiteType || null,
            ...(websiteName ? { name: websiteName } : {}), ...locale,
          },
        });
        await Source.updateMany({ website_id: id }, { $set: { enabled: true } });
        return Website.findById(id).lean<Record<string, unknown>>().then(doc => ({ ...doc!, id: doc!._id, reconnected: true }));
      }));
      const websites = await Promise.all(normalizedDomains.filter(domain => !reconnect.has(domain)).map(domain =>
        createWebsite({
          id: uuidv4(),
          user_id: req.user!.userId,
          workspace_id: workspace.id,
          domain,
          name: websiteName || domain,
          website_type: websiteType || null,
          country: locale.country,
          currency: locale.currency,
          api_key: crypto.randomBytes(32).toString('hex'),
          status: 'active',
          description: null,
          timezone: locale.timezone,
          last_event_at: null,
        })
      ));

      const websitesWithSources = await Promise.all(websites.map(async website => {
        const source = await ensureWebsiteSource(workspace.id, {
          id: website.id,
          name: website.name,
          domain: website.domain,
          api_key: website.api_key,
        });
        await Website.updateOne({ _id: website.id }, { $set: { source_id: source._id } });
        return { ...website, source_id: source._id };
      }));

      const all = [...websitesWithSources, ...reconnected];
      res.status(201).json({ websites: all, website: all[0] });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const websites = await getWebsitesByUserId(req.user!.userId);
      res.json({ websites });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const website = await getWebsiteByIdWithStats(id, req.user!.userId);
      if (!website) throw new AppError(404, 'Website not found');

      const adSummary = await getWebsiteAdSummary(id, req.user!.userId);
      const eventNames = await getWebsiteEventNames(id, req.user!.userId);

      res.json({ website, adSummary, eventNames });
    } catch (err) {
      next(err);
    }
  },

  async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const website = await getWebsiteByIdWithStats(id, req.user!.userId);
      if (!website) throw new AppError(404, 'Website not found');

      const events = await getWebsiteEvents(id, req.user!.userId, limit, offset);
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },

  async script(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const websites = await getWebsitesByUserId(req.user!.userId);
      const website = websites.find((w: { id: string }) => w.id === id);
      if (!website) throw new AppError(404, 'Website not found');

      const collectorUrl = collectorBaseUrl(req);
      const scriptUrl = `${collectorUrl}/tracker.v3.js`;
      const websiteType = typeof website.website_type === 'string' ? website.website_type : '';
      // Website currency (from its country) wins; older websites fall back to the workspace's.
      const workspace = !website.currency && website.workspace_id
        ? await Workspace.findById(website.workspace_id).select('currency').lean<{ currency?: string }>()
        : null;
      const currency = website.currency || findCountry(website.country)?.currency || workspace?.currency || 'INR';
      // E-Commerce sites auto-capture ViewContent / AddToCart / InitiateCheckout / Purchase.
      const ecommerceConfig = websiteType === 'ecommerce'
        ? `,\n  websiteType: "ecommerce",\n  ecommerce: true,\n  country: ${JSON.stringify(website.country || '')},\n  currency: ${JSON.stringify(currency)}`
        : websiteType ? `,\n  websiteType: ${JSON.stringify(websiteType)}` : '';
      const script = `<!-- GTM Tracking Pixel v3 -->
<script>
window._gtmConfig = {
  apiKey: ${JSON.stringify(website.api_key)},
  websiteId: ${JSON.stringify(website.id)},
  endpoint: ${JSON.stringify(collectorUrl)}${ecommerceConfig}
};
var script = document.createElement('script');
script.async = true;
script.src = ${JSON.stringify(scriptUrl)};
document.head.appendChild(script);
</script>`;

      // A snippet only works on a live site when the collector is public and HTTPS.
      const warnings: string[] = [];
      const collectorHost = new URL(collectorUrl).hostname;
      if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(collectorHost)) {
        warnings.push(`This snippet points at ${collectorUrl}, which only works on this computer. Visitors' browsers cannot reach it, so a live website will send no events. Set COLLECTOR_URL to your public HTTPS backend (or an HTTPS tunnel for testing) and copy the snippet again.`);
      } else if (collectorUrl.startsWith('http://')) {
        warnings.push(`This snippet uses http://. Browsers block it on https:// websites. Set COLLECTOR_URL to an https:// address.`);
      }
      res.json({ script, website, warnings });
    } catch (err) {
      next(err);
    }
  },

  async eventReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await getWebsiteEventReport(id, req.user!.userId, {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        period: req.query.period as string,
        eventName: req.query.event_name as string,
        visitorId: req.query.visitor_id as string,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      });
      if (!report) throw new AppError(404, 'Website not found');
      res.json(report);
    } catch (err) {
      next(err);
    }
  },

  async ecommerceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await getEcommerceStatus(req.user!.userId, req.params.id));
    } catch (err) {
      next(err);
    }
  },

  countries(_req: Request, res: Response) {
    res.json({ countries: COUNTRIES, currencies: CURRENCIES });
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, website_type, country, currency } = req.body || {};
      const set: Record<string, unknown> = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
          throw new AppError(400, 'Website name must be between 1 and 120 characters');
        }
        set.name = name.trim();
      }
      if (website_type !== undefined) {
        if (typeof website_type !== 'string') throw new AppError(400, 'Website type must be a string');
        set.website_type = website_type.trim() || null;
      }
      const locale = countrySettings(country, currency, false);
      if (locale) Object.assign(set, locale);
      else if (currency !== undefined) throw new AppError(400, 'Send country together with currency');
      if (!Object.keys(set).length) throw new AppError(400, 'Nothing to update');
      const updated = await Website.findOneAndUpdate(
        { _id: req.params.id, user_id: req.user!.userId },
        { $set: set },
        { returnDocument: 'after' }
      ).lean<Record<string, unknown>>();
      if (!updated) throw new AppError(404, 'Website not found');
      res.json({ website: { ...updated, id: updated._id } });
    } catch (err) {
      next(err);
    }
  },

  // Stops tracking without deleting data: the pixel key is rejected from now on, the site
  // leaves the Sites list, and its events stay in reports. Re-adding the domain reconnects it.
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const website = await Website.findOneAndUpdate(
        { _id: req.params.id, user_id: req.user!.userId },
        { $set: { status: DISCONNECTED, disconnected_at: new Date() } },
        { returnDocument: 'after' }
      ).select('_id domain status').lean<{ _id: string; domain: string; status: string }>();
      if (!website) throw new AppError(404, 'Website not found');
      await Source.updateMany({ website_id: website._id }, { $set: { enabled: false } });
      res.json({ website: { id: website._id, domain: website.domain, status: website.status } });
    } catch (err) {
      next(err);
    }
  },
};
