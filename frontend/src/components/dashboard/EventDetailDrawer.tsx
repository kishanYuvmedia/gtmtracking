import React, { useState, useEffect, useCallback } from 'react';
import { X, Clipboard, Download, ChevronRight } from 'lucide-react';

interface EventDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    name: string;
    eventId: string;
    processingTime: string;
    dataSize: string;
    rawData: Record<string, unknown>;
    userContext: { region: string; ip: string; userAgent: string };
  } | null;
}

const formatJsonSyntax = (obj: Record<string, unknown>, indent: number = 0): React.ReactNode[] => {
  const lines: React.ReactNode[] = [];
  const entries = Object.entries(obj);
  const spacing = '  '.repeat(indent + 1);
  const closingSpacing = '  '.repeat(indent);

  entries.forEach(([key, value], idx) => {
    const isLast = idx === entries.length - 1;
    const comma = isLast ? '' : ',';

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(
        <div key={`${indent}-${key}-start`}>
          {spacing}
          <span className="text-[#C62828]">"{key}"</span>
          <span className="text-[#111111]">: {'{'}</span>
        </div>
      );
      lines.push(...formatJsonSyntax(value as Record<string, unknown>, indent + 1));
      lines.push(
        <div key={`${indent}-${key}-end`}>
          {closingSpacing}
          <span className="text-[#111111]">{'}'}{comma}</span>
        </div>
      );
    } else if (Array.isArray(value)) {
      lines.push(
        <div key={`${indent}-${key}-arr-start`}>
          {spacing}
          <span className="text-[#C62828]">"{key}"</span>
          <span className="text-[#111111]">: [</span>
        </div>
      );
      value.forEach((item, i) => {
        const itemComma = i === value.length - 1 ? '' : ',';
        const itemVal = typeof item === 'string'
          ? JSON.stringify(item)
          : item !== null && typeof item === 'object'
            ? JSON.stringify(item)
            : String(item);
        lines.push(
          <div key={`${indent}-${key}-arr-${i}`}>
            {spacing}  <span className="text-[#16803C]">{itemVal}</span>{itemComma}
          </div>
        );
      });
      lines.push(
        <div key={`${indent}-${key}-arr-end`}>
          {spacing}<span className="text-[#111111]">]{comma}</span>
        </div>
      );
    } else {
      let valueClass = 'text-[#16803C]';
      let displayValue = `"${String(value)}"`;
      if (typeof value === 'number') {
        valueClass = 'text-[#2563EB]';
        displayValue = String(value);
      } else if (typeof value === 'boolean') {
        valueClass = 'text-[#2563EB]';
        displayValue = String(value);
      }
      lines.push(
        <div key={`${indent}-${key}-val`}>
          {spacing}
          <span className="text-[#C62828]">"{key}"</span>
          <span className="text-[#111111]">: </span>
          <span className={valueClass}>{displayValue}</span>{comma}
        </div>
      );
    }
  });

  return lines;
};

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({ isOpen, onClose, event }) => {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'headers'>('overview');
  const [rawDataExpanded, setRawDataExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleCopyEventId = () => {
    if (event) {
      navigator.clipboard.writeText(event.eventId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    if (event) {
      const blob = new Blob([JSON.stringify(event.rawData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.eventId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!overlayVisible || !event) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 h-full bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out
          w-full md:w-[420px] lg:w-[480px]
          ${drawerVisible ? 'translate-x-0' : 'translate-x-full'}
          rounded-tl-[12px] rounded-bl-[12px]`}
      >
        {/* Top Bar with Close */}
        <div className="shrink-0 px-6 pt-4 pb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-[18px] font-bold text-[#111111] leading-tight">{event.name}</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-mono">{event.eventId}</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-[#E5E7EB]">
            {(['overview', 'headers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-[1px] capitalize ${
                  activeTab === tab
                    ? 'border-[#111111] text-[#111111]'
                    : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] px-4 py-3">
                  <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Processing Time</p>
                  <p className="text-[16px] font-bold text-[#111111] mt-0.5">{event.processingTime}</p>
                </div>
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] px-4 py-3">
                  <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Data Size</p>
                  <p className="text-[16px] font-bold text-[#111111] mt-0.5">{event.dataSize}</p>
                </div>
              </div>

              {/* Raw Event Data */}
              <div>
                <button
                  type="button"
                  onClick={() => setRawDataExpanded(!rawDataExpanded)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-[#111111] w-full text-left mb-2"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform duration-200 ${rawDataExpanded ? 'rotate-90' : ''}`}
                  />
                  Raw Event Data
                </button>
                {rawDataExpanded && (
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] p-4 overflow-x-auto">
                    <pre className="text-[11px] leading-relaxed font-mono whitespace-pre">
                      {'{\n'}
                      {formatJsonSyntax(event.rawData)}
                      {'\n}'}
                    </pre>
                  </div>
                )}
              </div>

              {/* User Context */}
              <div>
                <h3 className="text-[13px] font-semibold text-[#111111] mb-2">User Context</h3>
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                  {[
                    { label: 'Region', value: event.userContext.region },
                    { label: 'IP Address', value: event.userContext.ip },
                    { label: 'User Agent', value: event.userContext.userAgent },
                  ].map((item, idx) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        idx < 2 ? 'border-b border-[#E5E7EB]' : ''
                      }`}
                    >
                      <span className="text-[12px] text-[#9CA3AF]">{item.label}</span>
                      <span className="text-[12px] font-medium text-[#111111]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'headers' && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] p-4">
              <p className="text-[12px] text-[#9CA3AF] text-center py-8">No headers recorded for this event.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E5E7EB] space-y-2 bg-white">
          <button
            type="button"
            onClick={handleCopyEventId}
            className="w-full h-[38px] flex items-center justify-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D1D5DB] rounded-[8px] text-[13px] font-medium text-[#374151] transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Event ID'}
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="w-full h-[38px] flex items-center justify-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D1D5DB] rounded-[8px] text-[13px] font-medium text-[#374151] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Full JSON
          </button>
        </div>
      </div>
    </div>
  );
};
