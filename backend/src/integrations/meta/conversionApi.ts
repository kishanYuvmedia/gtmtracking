const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

interface MetaEventRequest {
  pixelId: string;
  accessToken: string;
  events: Array<{
    event_name: string;
    event_time: number;
    action_source: string;
    user_data: Record<string, string>;
    event_source_url?: string;
    event_id?: string;
    custom_data?: Record<string, unknown>;
  }>;
  testEventCode?: string;
}

export async function sendMetaEvents(data: MetaEventRequest) {
  const url = `${META_GRAPH_URL}/${data.pixelId}/events`;

  const body: Record<string, unknown> = {
    data: data.events,
    access_token: data.accessToken,
  };

  if (data.testEventCode) {
    body.test_event_code = data.testEventCode;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json();
}

export async function getMetaPixelStats(pixelId: string, accessToken: string) {
  const url = `${META_GRAPH_URL}/${pixelId}/stats?access_token=${accessToken}`;

  const response = await fetch(url);
  return response.json();
}
