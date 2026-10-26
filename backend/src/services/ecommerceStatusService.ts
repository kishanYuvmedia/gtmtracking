import { Event } from '../database/models/Event';
import { Website, pixelStatus } from '../database/models/Website';
import { AppError } from '../middleware/errorHandler';

// Standard e-commerce funnel, in the order a shopper goes through it. `required` events are
// the minimum for Meta/Google conversion optimisation.
export const ECOMMERCE_EVENTS = [
  { name: 'ViewContent', label: 'Product viewed', required: true },
  { name: 'ViewCategory', label: 'Category viewed', required: false },
  { name: 'Search', label: 'Search', required: false },
  { name: 'AddToCart', label: 'Added to cart', required: true },
  { name: 'RemoveFromCart', label: 'Removed from cart', required: false },
  { name: 'ViewCart', label: 'Cart viewed', required: false },
  { name: 'InitiateCheckout', label: 'Checkout started', required: true },
  { name: 'AddShippingInfo', label: 'Shipping info added', required: false },
  { name: 'AddPaymentInfo', label: 'Payment info added', required: false },
  { name: 'Purchase', label: 'Purchase', required: true },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getEcommerceStatus(userId: string, websiteId: string) {
  const website = await Website.findOne({ _id: websiteId, user_id: userId })
    .select('_id website_type').lean<{ _id: string; website_type?: string | null }>();
  if (!website) throw new AppError(404, 'Website not found');
  const since = new Date(Date.now() - 7 * DAY_MS);
  const names = ECOMMERCE_EVENTS.map(event => event.name);

  const [byEvent, lastEvent, visits] = await Promise.all([
    Event.aggregate<{ _id: string; total: number; last_7d: number; last_seen: Date; sources: (string | null)[]; value_7d: number }>([
      { $match: { website_id: websiteId, event_name: { $in: names } } },
      {
        $group: {
          _id: '$event_name',
          total: { $sum: 1 },
          last_7d: { $sum: { $cond: [{ $gte: ['$created_at', since] }, 1, 0] } },
          value_7d: {
            $sum: {
              $cond: [
                { $gte: ['$created_at', since] },
                { $convert: { input: '$properties.value', to: 'double', onError: 0, onNull: 0 } },
                0,
              ],
            },
          },
          last_seen: { $max: '$created_at' },
          sources: { $addToSet: '$properties.capture_source' },
        },
      },
    ]),
    Event.findOne({ website_id: websiteId }).sort({ created_at: -1 })
      .select('created_at event_name page_info.page_url page_info.url context.visit')
      .lean<{ created_at: Date; event_name: string; page_info?: Record<string, unknown>; context?: { visit?: Record<string, unknown> } }>(),
    // One row per session (its first event) to count new vs returning visits.
    Event.aggregate<{ sessions: number; returning: number }>([
      { $match: { website_id: websiteId, created_at: { $gte: since } } },
      { $sort: { created_at: 1 } },
      { $group: { _id: '$session_id', visit: { $first: '$context.visit' } } },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          returning: { $sum: { $cond: [{ $eq: ['$visit.is_returning', true] }, 1, 0] } },
        },
      },
    ]).allowDiskUse(true),
  ]);

  const rows = new Map(byEvent.map(row => [row._id, row]));
  const lastEventAt = lastEvent?.created_at || null;
  return {
    website_id: websiteId,
    website_type: website.website_type || null,
    ecommerce_enabled: website.website_type === 'ecommerce',
    pixel_status: pixelStatus(lastEventAt),
    last_visit: lastEvent
      ? {
        at: lastEvent.created_at,
        event_name: lastEvent.event_name,
        page_url: lastEvent.page_info?.page_url || lastEvent.page_info?.url || null,
        visit_count: lastEvent.context?.visit?.visit_count ?? null,
        is_returning: lastEvent.context?.visit?.is_returning ?? null,
      }
      : null,
    visits_7d: { sessions: visits[0]?.sessions || 0, returning: visits[0]?.returning || 0 },
    events: ECOMMERCE_EVENTS.map(event => {
      const row = rows.get(event.name);
      return {
        ...event,
        total: row?.total || 0,
        last_7d: row?.last_7d || 0,
        value_7d: Math.round((row?.value_7d || 0) * 100) / 100,
        last_seen: row?.last_seen || null,
        capture_sources: (row?.sources || []).filter((source): source is string => !!source).sort(),
        status: !row ? 'missing' : row.last_7d ? 'receiving' : 'stale',
      };
    }),
  };
}
