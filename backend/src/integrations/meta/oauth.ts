const META_OAUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const META_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export function getAuthorizationUrl(config: MetaOAuthConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state,
    scope: ['ads_management', 'ads_read', 'business_management'].join(','),
    response_type: 'code',
  });

  return `${META_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  config: MetaOAuthConfig,
  code: string
) {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  return response.json();
}

export async function refreshAccessToken(
  config: MetaOAuthConfig,
  accessToken: string
) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: accessToken,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  return response.json();
}
