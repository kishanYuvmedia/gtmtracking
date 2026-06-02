'use client';

import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useState } from 'react';

export default function SettingsPage() {
  const [apiKey] = useState('sk_live_xxxxxxxxxxxx');
  const [webhookUrl, setWebhookUrl] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <Card title="API Keys">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Live API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(apiKey)}>
                  Copy
                </Button>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Regenerate Key
            </Button>
          </div>
        </Card>

        <Card title="Webhooks">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <Button>Save Webhook</Button>
          </div>
        </Card>

        <Card title="Meta Integration">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pixel ID</label>
              <input
                type="text"
                placeholder="Enter Meta Pixel ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
              <input
                type="password"
                placeholder="Enter Meta Access Token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <Button>Connect Meta</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
