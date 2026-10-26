import React, { useState } from 'react';
import { Search, ChevronRight, CheckCircle2, Link2 } from 'lucide-react';

type Category = 'All' | 'Advertising' | 'Analytics' | 'Data Warehouse' | 'CRM' | 'Messaging' | 'Customer Success' | 'Database';

const categories: Category[] = [
  'All',
  'Advertising',
  'Analytics',
  'Data Warehouse',
  'CRM',
  'Messaging',
  'Customer Success',
  'Database',
];

interface Destination {
  name: string;
  status: 'connected' | 'not_connected';
  category: string;
  description: string;
  iconBg: string;
  iconLetter: string;
}

const destinations: Destination[] = [
  {
    name: 'Segment',
    status: 'connected',
    category: 'Analytics',
    description: 'Forward all your events to Segment for downstream routing and enrichment.',
    iconBg: '#1A1A2E',
    iconLetter: 'S',
  },
  {
    name: 'Google Ads',
    status: 'connected',
    category: 'Advertising',
    description: 'Send conversion events to Google Ads to measure and optimize your advertising ROI.',
    iconBg: '#FFFFFF',
    iconLetter: 'G',
  },
  {
    name: 'BigQuery',
    status: 'not_connected',
    category: 'Data Warehouse',
    description: 'Stream your event data directly into Google BigQuery for analysis and reporting.',
    iconBg: '#FFFFFF',
    iconLetter: 'B',
  },
  {
    name: 'Facebook Ads',
    status: 'not_connected',
    category: 'Advertising',
    description: 'Send conversion events and audiences to Facebook Ads to optimize your ad campaigns.',
    iconBg: '#FFFFFF',
    iconLetter: 'F',
  },
  {
    name: 'Salesforce',
    status: 'connected',
    category: 'CRM',
    description: 'Sync events and contacts with Salesforce to enrich your CRM data pipeline.',
    iconBg: '#00A1E0',
    iconLetter: 'S',
  },
  {
    name: 'Mixpanel',
    status: 'not_connected',
    category: 'Analytics',
    description: 'Send events to Mixpanel for product analytics and user behavior insights.',
    iconBg: '#7856FF',
    iconLetter: 'M',
  },
  {
    name: 'Snowflake',
    status: 'not_connected',
    category: 'Data Warehouse',
    description: 'Load event data into Snowflake for advanced analytics and data engineering.',
    iconBg: '#29B5E8',
    iconLetter: 'S',
  },
  {
    name: 'Intercom',
    status: 'not_connected',
    category: 'Messaging',
    description: 'Forward events to Intercom for targeted messaging and customer engagement.',
    iconBg: '#1F8DED',
    iconLetter: 'I',
  },
  {
    name: 'HubSpot',
    status: 'not_connected',
    category: 'CRM',
    description: 'Sync your event data with HubSpot for marketing automation and lead scoring.',
    iconBg: '#FF7A59',
    iconLetter: 'H',
  },
  {
    name: 'Amplitude',
    status: 'not_connected',
    category: 'Analytics',
    description: 'Send events to Amplitude for product analytics and growth insights.',
    iconBg: '#1A1A2E',
    iconLetter: 'A',
  },
  {
    name: 'PostgreSQL',
    status: 'not_connected',
    category: 'Database',
    description: 'Stream events directly into your PostgreSQL database for custom analysis.',
    iconBg: '#336791',
    iconLetter: 'P',
  },
  {
    name: 'Zendesk',
    status: 'not_connected',
    category: 'Customer Success',
    description: 'Forward events to Zendesk to enrich support tickets with user activity data.',
    iconBg: '#03363D',
    iconLetter: 'Z',
  },
];

interface DestinationsScreenProps {
  onSelectDestination?: (name: string) => void;
}

export const DestinationsScreen: React.FC<DestinationsScreenProps> = ({ onSelectDestination }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = destinations.filter((d) => {
    const matchesCategory = activeCategory === 'All' || d.category === activeCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="text-xs text-muted flex items-center gap-1.5">
        <span>Destinations</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-ink">Destinations</h1>
        <p className="text-sm text-muted mt-1.5">
          Connect your data to the tools your team already uses.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-ink text-white'
                  : 'text-muted hover:text-ink hover:bg-surface/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search pl-9 w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((dest) => (
          <div
            key={dest.name}
            onClick={() => onSelectDestination?.(dest.name)}
            className="group bg-surface border border-border rounded-xl p-6 hover:border-ink/20 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-border"
                  style={{ backgroundColor: dest.iconBg }}
                >
                  {dest.status === 'connected' ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className="text-base font-bold"
                      style={{ color: dest.iconBg === '#FFFFFF' ? '#171717' : '#FFFFFF' }}
                    >
                      {dest.iconLetter}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-ink">{dest.name}</h3>
                    {dest.status === 'connected' && (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wide">
                        Connected
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-bg text-muted text-[10px] font-medium">
                      {dest.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">
                    {dest.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-sm text-muted">No destinations match your search.</p>
        </div>
      )}
    </div>
  );
};
