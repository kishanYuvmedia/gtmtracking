import React, { useState } from 'react';
import { ChevronRight, Pencil, Check, X } from 'lucide-react';

interface CrmConfigurationProps {
  onBack: () => void;
  onManageWebhook?: () => void;
  onViewLogs?: () => void;
  onDisconnect?: () => void;
}

interface FieldMappingRow {
  clickOwlField: string;
  mappedField: string;
}

interface LeadMappingRow {
  crmField: string;
  analyticsField: string;
  type: 'Positive' | 'Negative';
}

const initialFieldMapping: FieldMappingRow[] = [
  { clickOwlField: 'Email', mappedField: 'email' },
  { clickOwlField: 'Phone No.', mappedField: 'not-mapped' },
  { clickOwlField: 'Date of Birth', mappedField: 'not mapped' },
  { clickOwlField: 'Gender', mappedField: 'first name' },
  { clickOwlField: 'Zip code', mappedField: 'postal_code' },
];

const initialLeadMapping: LeadMappingRow[] = [
  { crmField: 'Qualified', analyticsField: 'Qualified Lead', type: 'Positive' },
  { crmField: 'Closed Won', analyticsField: 'Purchased', type: 'Positive' },
  { crmField: 'Irrelevant lead', analyticsField: '— not counted —', type: 'Negative' },
  { crmField: 'Not answering', analyticsField: '— not counted —', type: 'Negative' },
  { crmField: 'Converted', analyticsField: 'Purchase', type: 'Negative' },
];

export const CrmConfigurationScreen: React.FC<CrmConfigurationProps> = ({ onBack, onManageWebhook, onViewLogs, onDisconnect }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'configuration'>('configuration');
  const [fieldMapping, setFieldMapping] = useState<FieldMappingRow[]>(initialFieldMapping);
  const [leadMapping, setLeadMapping] = useState<LeadMappingRow[]>(initialLeadMapping);
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [editingLeadIdx, setEditingLeadIdx] = useState<number | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  const [editLeadField, setEditLeadField] = useState('');
  const [editLeadAnalytics, setEditLeadAnalytics] = useState('');
  const [editLeadType, setEditLeadType] = useState<'Positive' | 'Negative'>('Positive');

  const handleStartEditField = (idx: number) => {
    setEditingFieldIdx(idx);
    setEditFieldValue(fieldMapping[idx].mappedField);
  };

  const handleSaveField = (idx: number) => {
    setFieldMapping((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, mappedField: editFieldValue } : row))
    );
    setEditingFieldIdx(null);
  };

  const handleStartEditLead = (idx: number) => {
    setEditingLeadIdx(idx);
    setEditLeadField(leadMapping[idx].crmField);
    setEditLeadAnalytics(leadMapping[idx].analyticsField);
    setEditLeadType(leadMapping[idx].type);
  };

  const handleSaveLead = (idx: number) => {
    setLeadMapping((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, crmField: editLeadField, analyticsField: editLeadAnalytics, type: editLeadType }
          : row
      )
    );
    setEditingLeadIdx(null);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">CRM Connection</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Connect Shopify</span>
      </nav>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {(['logs', 'configuration'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'configuration' && (
        <div className="space-y-8">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-bg">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Field Mapping</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Click Owl Field</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Mapped Field</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {fieldMapping.map((row, idx) => (
                    <tr key={row.clickOwlField} className="hover:bg-bg/50 transition-colors group">
                      <td className="px-5 py-3 text-sm text-ink font-medium">{row.clickOwlField}</td>
                      <td className="px-5 py-3">
                        {editingFieldIdx === idx ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editFieldValue}
                              onChange={(e) => setEditFieldValue(e.target.value)}
                              autoFocus
                              className="input"
                            />
                            <button onClick={() => handleSaveField(idx)} className="p-1 rounded text-success hover:bg-success/10 transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingFieldIdx(null)} className="p-1 rounded text-muted hover:bg-bg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-sm ${row.mappedField === 'not-mapped' || row.mappedField === 'not mapped' ? 'text-muted italic' : 'text-ink'}`}>
                            {row.mappedField}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {editingFieldIdx !== idx && (
                          <button
                            onClick={() => handleStartEditField(idx)}
                            className="p-1 rounded text-muted hover:text-ink hover:bg-bg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-bg">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Lead Mapping</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[550px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">CRM Field</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Analytics Field</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Type</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {leadMapping.map((row, idx) => (
                    <tr key={idx} className="hover:bg-bg/50 transition-colors group">
                      <td className="px-5 py-3">
                        {editingLeadIdx === idx ? (
                          <input
                            type="text"
                            value={editLeadField}
                            onChange={(e) => setEditLeadField(e.target.value)}
                            autoFocus
                            className="input"
                          />
                        ) : (
                          <span className="text-sm text-ink font-medium">{row.crmField}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editingLeadIdx === idx ? (
                          <input
                            type="text"
                            value={editLeadAnalytics}
                            onChange={(e) => setEditLeadAnalytics(e.target.value)}
                            className="input"
                          />
                        ) : (
                          <span className={`text-sm ${row.analyticsField.includes('not counted') ? 'text-muted italic' : 'text-ink'}`}>
                            {row.analyticsField}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editingLeadIdx === idx ? (
                          <select
                            value={editLeadType}
                            onChange={(e) => setEditLeadType(e.target.value as 'Positive' | 'Negative')}
                            className="select"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            row.type === 'Positive'
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}>
                            {row.type}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {editingLeadIdx === idx ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleSaveLead(idx)} className="p-1 rounded text-success hover:bg-success/10 transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingLeadIdx(null)} className="p-1 rounded text-muted hover:bg-bg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditLead(idx)}
                            className="p-1 rounded text-muted hover:text-ink hover:bg-bg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onDisconnect}
              className="px-4 py-2 text-xs font-semibold text-danger border border-danger/20 rounded-lg hover:bg-danger/5 transition-colors"
            >
              Disconnect
            </button>
            <div className="flex items-center gap-2">
              {onManageWebhook && (
                <button
                  onClick={onManageWebhook}
                  className="px-4 py-2 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-bg transition-colors"
                >
                  Manage Webhook
                </button>
              )}
              {onViewLogs && (
                <button
                  onClick={onViewLogs}
                  className="px-4 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors"
                >
                  View Logs
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Logs will appear here.</p>
        </div>
      )}
    </div>
  );
};
