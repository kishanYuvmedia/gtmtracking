// Compares hostnames ignoring scheme, port, path and a leading "www." so a website saved as
// "https://example.com/" accepts pixel requests from https://www.example.com.
export function normalizeHost(value: string): string {
  const input = value.trim().toLowerCase();
  if (!input) return '';
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//.test(input) ? input : `https://${input}`).hostname.replace(/^www\./, '');
  } catch {
    return input.replace(/^www\./, '');
  }
}
