import crypto from 'crypto';
import mongoose from 'mongoose';
import { Event } from '../../src/database/models/Event';
import { Identity } from '../../src/database/models/Identity';
import { Profile } from '../../src/database/models/Profile';
import { ensureWebsiteSource } from '../../src/database/models/Source';
import { User, setUserWorkspaceId } from '../../src/database/models/User';
import { Website } from '../../src/database/models/Website';
import { ensureWorkspaceForUser } from '../../src/database/models/Workspace';
import { VisitorProfile } from '../../src/database/models/VisitorProfile';
import { requireDevDatabase, testConnection } from '../../src/database';

const WRITE_BATCH_SIZE = 500;
const CLICK_ID_FIELDS = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid'] as const;

interface WebsiteMigrationRow {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  source_id?: string | null;
  name: string | null;
  domain: string;
  api_key: string;
  timezone?: string;
}

interface VisitorGroup {
  _id: { workspace_id: string; visitor_id: string };
  event_count: number;
  first_seen: Date;
  last_seen: Date;
  first_utm: Record<string, unknown>;
  last_utm: Record<string, unknown>;
  revenue: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function profileIdFor(workspaceId: string, anonymousId: string): string {
  return crypto.createHash('sha256').update(`${workspaceId}:${anonymousId}`).digest('hex');
}

function getDomainHost(value: string): string {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

async function flushEventUpdates(
  operations: mongoose.AnyBulkWriteOperation[],
): Promise<void> {
  if (operations.length) await Event.bulkWrite(operations, { ordered: false });
}

async function main() {
  requireDevDatabase();
  if (process.env.CDP_MIGRATION_CONFIRM !== 'YES_BACKFILL_CDP') {
    throw new Error('Set CDP_MIGRATION_CONFIRM=YES_BACKFILL_CDP to explicitly authorize this backfill');
  }
  if (!await testConnection(1, 0)) throw new Error('Could not connect to MongoDB');

  const users = await User.find().select('_id name company timezone').lean();
  const websiteById = new Map<string, WebsiteMigrationRow>();
  const sourceByWebsiteId = new Map<string, string>();

  for (const user of users) {
    const userId = String(user._id);
    const workspace = await ensureWorkspaceForUser(
      userId,
      (typeof user.company === 'string' && user.company.trim()) || user.name || 'My Workspace',
      typeof user.timezone === 'string' && user.timezone.trim() ? user.timezone : 'UTC'
    );
    await setUserWorkspaceId(userId, workspace._id);

    const websites = await Website.find({ user_id: userId })
      .select('_id user_id workspace_id source_id name domain api_key timezone')
      .lean();
    for (const website of websites) {
      const websiteId = String(website._id);
      const row: WebsiteMigrationRow = {
        id: websiteId,
        user_id: userId,
        workspace_id: workspace._id,
        source_id: website.source_id,
        name: website.name,
        domain: website.domain,
        api_key: website.api_key,
        timezone: website.timezone,
      };
      const source = await ensureWebsiteSource(workspace._id, {
        id: websiteId,
        name: website.name,
        domain: getDomainHost(website.domain),
        api_key: website.api_key,
      });
      await Website.updateOne(
        { _id: website._id },
        { $set: { workspace_id: workspace._id, source_id: source._id } }
      );
      row.source_id = source._id;
      websiteById.set(websiteId, row);
      sourceByWebsiteId.set(websiteId, source._id);
    }
  }

  const visitorGroupByKey = new Map<string, VisitorGroup>();
  const workspaceIdsByVisitorId = new Map<string, Set<string>>();
  if (websiteById.size) {
    const groupsByWebsite = await Event.aggregate<{
      _id: { website_id: string; visitor_id: string };
      event_count: number;
      first_seen: Date;
      last_seen: Date;
      first_utm: Record<string, unknown>;
      last_utm: Record<string, unknown>;
      revenue: number;
    }>([
      { $match: { website_id: { $in: [...websiteById.keys()] } } },
      { $sort: { created_at: 1 } },
      {
        $project: {
          website_id: 1,
          visitor_id: 1,
          event_name: 1,
          created_at: 1,
          utm: {
            $mergeObjects: [
              { $ifNull: ['$payload.attribution', {}] },
              { $ifNull: ['$properties.utm', {}] },
              { $ifNull: ['$url_params', {}] },
            ],
          },
          purchase_value: {
            $cond: [
              { $eq: ['$event_name', 'Purchase'] },
              { $convert: { input: '$properties.value', to: 'double', onError: 0, onNull: 0 } },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: { website_id: '$website_id', visitor_id: '$visitor_id' },
          event_count: { $sum: 1 },
          first_seen: { $first: '$created_at' },
          last_seen: { $last: '$created_at' },
          first_utm: { $first: '$utm' },
          last_utm: { $last: '$utm' },
          revenue: { $sum: '$purchase_value' },
        },
      },
    ]);

    for (const group of groupsByWebsite) {
      const workspaceId = websiteById.get(group._id.website_id)?.workspace_id;
      if (!workspaceId) continue;
      const workspaceIds = workspaceIdsByVisitorId.get(group._id.visitor_id) || new Set<string>();
      workspaceIds.add(workspaceId);
      workspaceIdsByVisitorId.set(group._id.visitor_id, workspaceIds);
      const key = `${workspaceId}:${group._id.visitor_id}`;
      const existing = visitorGroupByKey.get(key);
      if (existing) {
        existing.event_count += group.event_count;
        if (group.first_seen < existing.first_seen) existing.first_seen = group.first_seen;
        if (group.first_seen <= existing.first_seen) existing.first_utm = group.first_utm;
        if (group.last_seen >= existing.last_seen) {
          existing.last_seen = group.last_seen;
          existing.last_utm = group.last_utm;
        }
        existing.revenue += group.revenue;
      } else {
        visitorGroupByKey.set(key, {
          _id: { workspace_id: workspaceId, visitor_id: group._id.visitor_id },
          event_count: group.event_count,
          first_seen: group.first_seen,
          last_seen: group.last_seen,
          first_utm: group.first_utm,
          last_utm: group.last_utm,
          revenue: group.revenue,
        });
      }
    }
  }

  const visitorProfileScopeOperations: mongoose.AnyBulkWriteOperation[] = [
    ...workspaceIdsByVisitorId.entries(),
  ]
    .filter(([, workspaceIds]) => workspaceIds.size === 1)
    .map(([visitorId, workspaceIds]) => ({
      updateOne: {
        filter: { _id: visitorId, workspace_id: null },
        update: { $set: { workspace_id: [...workspaceIds][0] } },
      },
    }));
  if (visitorProfileScopeOperations.length) {
    await VisitorProfile.bulkWrite(visitorProfileScopeOperations, { ordered: false });
  }

  const visitorGroups = [...visitorGroupByKey.values()];
  const profileIdByVisitor = new Map<string, string>();
  const seenEmailIdentities = new Set<string>();
  const seenPhoneIdentities = new Set<string>();

  for (let index = 0; index < visitorGroups.length; index += WRITE_BATCH_SIZE) {
    const groupBatch = visitorGroups.slice(index, index + WRITE_BATCH_SIZE);
    const visitorIds = [...new Set(groupBatch.map(group => group._id.visitor_id))];
    const workspaceIds = [...new Set(groupBatch.map(group => group._id.workspace_id))];
    const [legacyProfiles, existingIdentities] = await Promise.all([
      VisitorProfile.find({
        _id: { $in: visitorIds },
        workspace_id: { $in: workspaceIds },
      }).lean(),
      Identity.find({
        workspace_id: { $in: workspaceIds },
        type: 'anonymous_id',
        value: { $in: visitorIds },
      }).select('workspace_id value profile_id').lean(),
    ]);
    const legacyProfileByVisitor = new Map(legacyProfiles.map(profile => [String(profile._id), profile]));
    const profileIdByIdentity = new Map(
      existingIdentities.map(identity => [`${identity.workspace_id}:${identity.value}`, identity.profile_id])
    );
    const profileOperations: mongoose.AnyBulkWriteOperation[] = [];
    const identityOperations: mongoose.AnyBulkWriteOperation[] = [];

    for (const group of groupBatch) {
      const { workspace_id: workspaceId, visitor_id: visitorId } = group._id;
      const profileId = profileIdFor(workspaceId, visitorId);
      profileIdByVisitor.set(`${workspaceId}:${visitorId}`, profileId);
      const legacyProfile = legacyProfileByVisitor.get(visitorId);
      const canonicalProfileId = profileIdByIdentity.get(`${workspaceId}:${visitorId}`) || profileId;
      profileIdByVisitor.set(`${workspaceId}:${visitorId}`, canonicalProfileId);

      const customData = asRecord(legacyProfile?.custom_data);
      const profileTraits: Record<string, unknown> = {
        ...customData,
        ...(legacyProfile?.first_name ? { first_name: legacyProfile.first_name } : {}),
        ...(legacyProfile?.last_name ? { last_name: legacyProfile.last_name } : {}),
        ...(legacyProfile?.city ? { city: legacyProfile.city } : {}),
        ...(legacyProfile?.zip ? { zip: legacyProfile.zip } : {}),
        ...(legacyProfile?.birth_date ? { birth_date: legacyProfile.birth_date } : {}),
        ...(legacyProfile?.gender ? { gender: legacyProfile.gender } : {}),
      };

      profileOperations.push({
        updateOne: {
          filter: { _id: canonicalProfileId },
          update: {
            $setOnInsert: {
              _id: canonicalProfileId,
              workspace_id: workspaceId,
              traits: profileTraits,
              email: typeof legacyProfile?.email === 'string'
                ? legacyProfile.email.trim().toLowerCase() || null
                : null,
              phone: legacyProfile?.phone || null,
              first_seen: group.first_seen,
              country: legacyProfile?.country || null,
              device: legacyProfile?.device_info || null,
              first_utm: group.first_utm,
            },
            $set: {
              last_seen: group.last_seen,
              event_count: group.event_count,
              last_utm: group.last_utm,
              revenue: group.revenue,
              ...(legacyProfile?.location_info?.country
                ? { country: legacyProfile.location_info.country }
                : {}),
              ...(legacyProfile?.device_info ? { device: legacyProfile.device_info } : {}),
            },
          },
          upsert: true,
        },
      });

      if (!profileIdByIdentity.has(`${workspaceId}:${visitorId}`)) {
        identityOperations.push({
          updateOne: {
            filter: { workspace_id: workspaceId, type: 'anonymous_id', value: visitorId },
            update: {
              $setOnInsert: {
                workspace_id: workspaceId,
                profile_id: canonicalProfileId,
                type: 'anonymous_id',
                value: visitorId,
              },
            },
            upsert: true,
          },
        });
      }

      const email = typeof legacyProfile?.email === 'string'
        ? legacyProfile.email.trim().toLowerCase()
        : '';
      if (email) {
        const identityKey = `${workspaceId}:${email}`;
        if (!seenEmailIdentities.has(identityKey)) {
          seenEmailIdentities.add(identityKey);
          identityOperations.push({
            updateOne: {
              filter: { workspace_id: workspaceId, type: 'email', value: email },
              update: {
                $setOnInsert: {
                  workspace_id: workspaceId,
                  profile_id: canonicalProfileId,
                  type: 'email',
                  value: email,
                },
              },
              upsert: true,
            },
          });
        }
      }

      const phone = typeof legacyProfile?.phone === 'string'
        ? legacyProfile.phone.trim()
        : '';
      if (phone) {
        const identityKey = `${workspaceId}:${phone}`;
        if (!seenPhoneIdentities.has(identityKey)) {
          seenPhoneIdentities.add(identityKey);
          identityOperations.push({
            updateOne: {
              filter: { workspace_id: workspaceId, type: 'phone', value: phone },
              update: {
                $setOnInsert: {
                  workspace_id: workspaceId,
                  profile_id: canonicalProfileId,
                  type: 'phone',
                  value: phone,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (profileOperations.length) await Profile.bulkWrite(profileOperations, { ordered: false });
    if (identityOperations.length) await Identity.bulkWrite(identityOperations, { ordered: false });
  }

  let eventOperations: mongoose.AnyBulkWriteOperation[] = [];
  let migratedEvents = 0;
  const eventCursor = Event.find({ website_id: { $in: [...websiteById.keys()] } })
    .select('_id website_id visitor_id event_name payload properties page_info device_info location_info network_info performance_info url_params created_at')
    .lean()
    .cursor({ batchSize: WRITE_BATCH_SIZE });

  for await (const event of eventCursor) {
    const websiteId = String(event.website_id);
    const website = websiteById.get(websiteId);
    if (!website?.workspace_id) continue;

    const workspaceId = website.workspace_id;
    const visitorId = String(event.visitor_id);
    const payload = asRecord(event.payload);
    const properties = asRecord(event.properties);
    const attribution = {
      ...asRecord(payload.attribution),
      ...asRecord(properties.utm),
      ...asRecord(event.url_params),
    };
    const clickIds: Record<string, string> = {};
    for (const field of CLICK_ID_FIELDS) {
      const value = attribution[field] ?? properties[field] ?? payload[field];
      if (typeof value === 'string' && value) clickIds[field] = value;
    }
    const location = asRecord(event.location_info);
    const device = asRecord(event.device_info);
    const eventName = String(event.event_name);
    const eventType = eventName.toLowerCase() === 'identify'
      ? 'identify'
      : eventName.toLowerCase() === 'pageview' || eventName.toLowerCase() === 'page_view'
        ? 'page'
        : 'track';
    const createdAt = event.created_at instanceof Date ? event.created_at : new Date(event.created_at || Date.now());

    eventOperations.push({
      updateOne: {
        filter: { _id: event._id },
        update: {
          $set: {
            workspace_id: workspaceId,
            source_id: sourceByWebsiteId.get(websiteId) || null,
            profile_id: profileIdByVisitor.get(`${workspaceId}:${visitorId}`) || null,
            anonymous_id: visitorId,
            event_type: eventType,
            utm: attribution,
            click_ids: clickIds,
            ip: typeof location.ip_address === 'string' ? location.ip_address : null,
            country: typeof location.country === 'string' ? location.country : null,
            device,
            browser: asRecord(device.browser),
            timestamp: createdAt,
            received_at: createdAt,
          },
        },
      },
    });
    migratedEvents++;

    if (eventOperations.length >= WRITE_BATCH_SIZE) {
      await flushEventUpdates(eventOperations);
      eventOperations = [];
    }
  }
  await flushEventUpdates(eventOperations);

  console.log(JSON.stringify({
    workspaces: users.length,
    sources: sourceByWebsiteId.size,
    profiles: profileIdByVisitor.size,
    events: migratedEvents,
  }));
}

main()
  .catch((error: unknown) => {
    console.error('CDP backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
