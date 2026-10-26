import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

const operators = [
  'Contains', 'Does not contain', 'Equals', 'Does not equal',
  'Starts with', 'Ends with', 'Is empty', 'Is not empty',
];

const numericOperators = [
  'Equals', 'Not equal', 'Greater than', 'Greater than or equal',
  'Less than', 'Less than or equal', 'Between',
];

const platforms = ['All Platforms', 'Website', 'Shopify', 'WooCommerce', 'WordPress', 'Mobile App', 'Android', 'iOS'];
const events = ['All Events', 'PageView', 'ViewContent', 'Click', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Payment', 'Lead', 'Appointment', 'SignUp', 'Login'];
const devices = ['All Devices', 'Desktop', 'Mobile', 'Tablet', 'Smart TV', 'Other'];
const osList = ['All OS', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'ChromeOS', 'Other'];
const browsers = ['All Browsers', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'Samsung Internet', 'Other'];
const countries = ['All Countries', 'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'UAE', 'Germany', 'Singapore', 'Other'];
const dateRanges = ['Today', 'Yesterday', 'Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Last 90 Days', 'This Month', 'Last Month', 'Custom Range'];
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD'];

const regionData: Record<string, string[]> = {
  India: ['Rajasthan', 'Maharashtra', 'Delhi', 'Gujarat', 'Karnataka', 'Uttar Pradesh', 'Haryana', 'Punjab', 'Tamil Nadu', 'West Bengal', 'Other'],
  'United States': ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Other'],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Other'],
};

const cityData: Record<string, string[]> = {
  Rajasthan: ['Ajmer', 'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Other'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Other'],
  Delhi: ['New Delhi', 'Dwarka', 'Other'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Other'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Other'],
};

interface FilterState {
  destinationPlatform: string;
  eventName: string;
  campaignName: { operator: string; value: string };
  adName: { operator: string; value: string };
  utmSource: { operator: string; value: string };
  utmMedium: { operator: string; value: string };
  eventSource: { operator: string; value: string };
  eventSourceId: { operator: string; value: string };
  deviceCategory: string;
  deviceOS: string;
  browser: string;
  country: string;
  region: string;
  city: string;
  productName: { operator: string; value: string };
  value: { operator: string; value: string };
  currency: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
}

const initialFilterState: FilterState = {
  destinationPlatform: '',
  eventName: '',
  campaignName: { operator: 'Contains', value: '' },
  adName: { operator: 'Contains', value: '' },
  utmSource: { operator: 'Contains', value: '' },
  utmMedium: { operator: 'Contains', value: '' },
  eventSource: { operator: 'Equals', value: '' },
  eventSourceId: { operator: 'Contains', value: '' },
  deviceCategory: '',
  deviceOS: '',
  browser: '',
  country: '',
  region: '',
  city: '',
  productName: { operator: 'Contains', value: '' },
  value: { operator: 'Greater than', value: '' },
  currency: 'INR',
  dateRange: '',
  startDate: '',
  endDate: '',
  timeStart: '',
  timeEnd: '',
};

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}

function SelectField({ label, value, onChange, options, placeholder = 'Select' }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#374151]">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full h-[36px] px-3 flex items-center justify-between border border-[#B8B8B8] rounded-[7px] bg-white text-[13px] text-left hover:border-[#9CA3AF] transition-colors"
        >
          <span className={value ? 'text-[#111111]' : 'text-[#9CA3AF]'}>{value || placeholder}</span>
          <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 py-1 max-h-[200px] overflow-hidden">
            {options.length > 6 && (
              <div className="px-2 py-1.5 border-b border-[#E5E7EB]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-[28px] pl-7 pr-2 text-[12px] border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-[160px]">
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt === placeholder ? '' : opt); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                    value === opt || (!value && opt === placeholder)
                      ? 'bg-[#F3F4F6] text-[#111111] font-medium'
                      : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OperatorTextField({ label, operator, operatorOnChange, value, valueOnChange, placeholder }: {
  label: string;
  operator: string;
  operatorOnChange: (val: string) => void;
  value: string;
  valueOnChange: (val: string) => void;
  placeholder: string;
}) {
  const [opOpen, setOpOpen] = useState(false);
  const opRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (opRef.current && !opRef.current.contains(e.target as Node)) setOpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#374151]">{label}</label>
      <div className="flex gap-1.5">
        <div ref={opRef} className="relative">
          <button
            type="button"
            onClick={() => setOpOpen(!opOpen)}
            className="h-[36px] w-[110px] px-2 flex items-center justify-between border border-[#B8B8B8] rounded-[7px] bg-white text-[12px] hover:border-[#9CA3AF] transition-colors"
          >
            <span className="text-[#111111] truncate">{operator}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          </button>
          {opOpen && (
            <div className="absolute top-full left-0 mt-1 w-[160px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 py-1">
              {operators.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => { operatorOnChange(op); setOpOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                    operator === op ? 'bg-[#F3F4F6] font-medium' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => valueOnChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
        />
      </div>
    </div>
  );
}

function NumericField({ label, operator, operatorOnChange, value, valueOnChange, placeholder }: {
  label: string;
  operator: string;
  operatorOnChange: (val: string) => void;
  value: string;
  valueOnChange: (val: string) => void;
  placeholder: string;
}) {
  const [opOpen, setOpOpen] = useState(false);
  const opRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (opRef.current && !opRef.current.contains(e.target as Node)) setOpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#374151]">{label}</label>
      <div className="flex gap-1.5">
        <div ref={opRef} className="relative">
          <button
            type="button"
            onClick={() => setOpOpen(!opOpen)}
            className="h-[36px] w-[110px] px-2 flex items-center justify-between border border-[#B8B8B8] rounded-[7px] bg-white text-[12px] hover:border-[#9CA3AF] transition-colors"
          >
            <span className="text-[#111111] truncate">{operator}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          </button>
          {opOpen && (
            <div className="absolute top-full left-0 mt-1 w-[180px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 py-1">
              {numericOperators.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => { operatorOnChange(op); setOpOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                    operator === op ? 'bg-[#F3F4F6] font-medium' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          )}
        </div>
        {operator === 'Between' ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => valueOnChange(e.target.value)}
              placeholder="Min"
              className="flex-1 h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
            <span className="text-[12px] text-[#9CA3AF]">To</span>
            <input
              type="text"
              placeholder="Max"
              className="flex-1 h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => valueOnChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold text-[#111111]">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Divider() {
  return <hr className="border-[#E5E7EB] my-4" />;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState<FilterState>(currentFilters);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    if (isOpen) {
      setOverlayVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDrawerVisible(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setDrawerVisible(false);
      setTimeout(() => setOverlayVisible(false), 300);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) onClose();
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedFilter = (key: keyof FilterState, field: string, value: string) => {
    setFilters(prev => {
      const nested = prev[key] as Record<string, string>;
      return { ...prev, [key]: { ...nested, [field]: value } };
    });
  };

  const clearAll = () => {
    setFilters({ ...initialFilterState });
  };

  const getActiveCount = () => {
    let count = 0;
    if (filters.destinationPlatform) count++;
    if (filters.eventName) count++;
    if (filters.campaignName.value) count++;
    if (filters.adName.value) count++;
    if (filters.utmSource.value) count++;
    if (filters.utmMedium.value) count++;
    if (filters.eventSource.value) count++;
    if (filters.eventSourceId.value) count++;
    if (filters.deviceCategory) count++;
    if (filters.deviceOS) count++;
    if (filters.browser) count++;
    if (filters.country) count++;
    if (filters.region) count++;
    if (filters.city) count++;
    if (filters.productName.value) count++;
    if (filters.value.value) count++;
    if (filters.dateRange) count++;
    return count;
  };

  const activeCount = getActiveCount();

  if (!overlayVisible) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out
          w-full md:w-[420px] lg:w-[480px]
          ${drawerVisible ? 'translate-x-0' : 'translate-x-full'}
          rounded-tl-[12px] rounded-bl-[12px]`}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[#111111]">Filters</h2>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] text-[#3B82F6] hover:text-[#2563EB] transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[#F3F4F6] transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Section title="Events & Platform">
            <SelectField
              label="Destination Platform"
              value={filters.destinationPlatform}
              onChange={(v) => updateFilter('destinationPlatform', v)}
              options={platforms}
            />
            <SelectField
              label="Event Name"
              value={filters.eventName}
              onChange={(v) => updateFilter('eventName', v)}
              options={events}
            />
          </Section>

          <Divider />

          <Section title="Attribution">
            <OperatorTextField
              label="Campaign Name"
              operator={filters.campaignName.operator}
              operatorOnChange={(v) => updateNestedFilter('campaignName', 'operator', v)}
              value={filters.campaignName.value}
              valueOnChange={(v) => updateNestedFilter('campaignName', 'value', v)}
              placeholder="Enter campaign name"
            />
            <OperatorTextField
              label="Ad Name"
              operator={filters.adName.operator}
              operatorOnChange={(v) => updateNestedFilter('adName', 'operator', v)}
              value={filters.adName.value}
              valueOnChange={(v) => updateNestedFilter('adName', 'value', v)}
              placeholder="Enter ad name"
            />
            <OperatorTextField
              label="UTM Source"
              operator={filters.utmSource.operator}
              operatorOnChange={(v) => updateNestedFilter('utmSource', 'operator', v)}
              value={filters.utmSource.value}
              valueOnChange={(v) => updateNestedFilter('utmSource', 'value', v)}
              placeholder="Enter UTM source"
            />
            <OperatorTextField
              label="UTM Medium"
              operator={filters.utmMedium.operator}
              operatorOnChange={(v) => updateNestedFilter('utmMedium', 'operator', v)}
              value={filters.utmMedium.value}
              valueOnChange={(v) => updateNestedFilter('utmMedium', 'value', v)}
              placeholder="Enter UTM medium"
            />
            <OperatorTextField
              label="Event Source"
              operator={filters.eventSource.operator}
              operatorOnChange={(v) => updateNestedFilter('eventSource', 'operator', v)}
              value={filters.eventSource.value}
              valueOnChange={(v) => updateNestedFilter('eventSource', 'value', v)}
              placeholder="Enter event source"
            />
            <OperatorTextField
              label="Event Source ID"
              operator={filters.eventSourceId.operator}
              operatorOnChange={(v) => updateNestedFilter('eventSourceId', 'operator', v)}
              value={filters.eventSourceId.value}
              valueOnChange={(v) => updateNestedFilter('eventSourceId', 'value', v)}
              placeholder="Enter event source ID"
            />
          </Section>

          <Divider />

          <Section title="Device Group">
            <SelectField
              label="Device Category"
              value={filters.deviceCategory}
              onChange={(v) => updateFilter('deviceCategory', v)}
              options={devices}
            />
            <SelectField
              label="Device (OS)"
              value={filters.deviceOS}
              onChange={(v) => updateFilter('deviceOS', v)}
              options={osList}
            />
            <SelectField
              label="Browser"
              value={filters.browser}
              onChange={(v) => updateFilter('browser', v)}
              options={browsers}
            />
          </Section>

          <Divider />

          <Section title="Geography Group">
            <SelectField
              label="Country"
              value={filters.country}
              onChange={(v) => { updateFilter('country', v); updateFilter('region', ''); updateFilter('city', ''); }}
              options={countries}
            />
            <SelectField
              label="Region"
              value={filters.region}
              onChange={(v) => { updateFilter('region', v); updateFilter('city', ''); }}
              options={['All Regions', ...(regionData[filters.country] || [])]}
            />
            <SelectField
              label="City"
              value={filters.city}
              onChange={(v) => updateFilter('city', v)}
              options={['All Cities', ...(cityData[filters.region] || [])]}
            />
          </Section>

          <Divider />

          <Section title="E-Commerce Group">
            <OperatorTextField
              label="Product Name"
              operator={filters.productName.operator}
              operatorOnChange={(v) => updateNestedFilter('productName', 'operator', v)}
              value={filters.productName.value}
              valueOnChange={(v) => updateNestedFilter('productName', 'value', v)}
              placeholder="Enter product name"
            />
            <NumericField
              label="Value"
              operator={filters.value.operator}
              operatorOnChange={(v) => updateNestedFilter('value', 'operator', v)}
              value={filters.value.value}
              valueOnChange={(v) => updateNestedFilter('value', 'value', v)}
              placeholder="Enter value"
            />
          </Section>

          <Divider />

          <Section title="Date & Time">
            <SelectField
              label="Date Range"
              value={filters.dateRange}
              onChange={(v) => updateFilter('dateRange', v)}
              options={dateRanges}
            />
            {filters.dateRange === 'Custom Range' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[#374151]">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                    className="w-full h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[#374151]">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                    className="w-full h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#374151]">Time Start</label>
                <input
                  type="time"
                  value={filters.timeStart}
                  onChange={(e) => updateFilter('timeStart', e.target.value)}
                  className="w-full h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#374151]">Time End</label>
                <input
                  type="time"
                  value={filters.timeEnd}
                  onChange={(e) => updateFilter('timeEnd', e.target.value)}
                  className="w-full h-[36px] px-3 border border-[#B8B8B8] rounded-[7px] text-[13px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
              </div>
            </div>
          </Section>

          <Divider />

          <Section title="Conversion & Revenue">
            <NumericField
              label="Event Value"
              operator={filters.value.operator}
              operatorOnChange={(v) => updateNestedFilter('value', 'operator', v)}
              value={filters.value.value}
              valueOnChange={(v) => updateNestedFilter('value', 'value', v)}
              placeholder="Enter value"
            />
            <SelectField
              label="Currency"
              value={filters.currency}
              onChange={(v) => updateFilter('currency', v)}
              options={currencies}
            />
          </Section>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E5E7EB] flex items-center gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[38px] border border-[#D1D5DB] rounded-[7px] text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onApply(filters); onClose(); }}
            disabled={activeCount === 0}
            className={`flex-1 h-[38px] rounded-[7px] text-[13px] font-medium text-white transition-colors ${
              activeCount > 0
                ? 'bg-[#3B82F6] hover:bg-[#2563EB]'
                : 'bg-[#D1D5DB] cursor-not-allowed'
            }`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export type { FilterState };
