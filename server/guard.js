// Keeps other websites away from this server. Listening on 127.0.0.1 stops other computers, but any page open in
// the owner's browser can still send requests to localhost. So:
//   - every request must be addressed to localhost / 127.0.0.1 / [::1] on our own port (the Host header), which
//     defeats DNS rebinding (an attacker's domain re-pointed at 127.0.0.1);
//   - every /api/ request must carry `X-Job-Hunt: 1`. Browsers won't add a custom header to a cross-site request
//     without a CORS preflight, and this server never approves one;
//   - when the browser says where a request came from (Origin, Sec-Fetch-Site), it must be this page.
// Command-line tools and tests send none of the browser headers, only the custom one.
export const API_HEADER = 'x-job-hunt';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function checkRequest(req, pathname) {
  const port = req.socket.localPort;
  const allowed = LOCAL_HOSTS.map(h => `${h}:${port}`);
  if (!allowed.includes((req.headers.host || '').toLowerCase())) return 'Unknown host';
  if (!pathname.startsWith('/api/')) return '';
  if (req.headers[API_HEADER] !== '1') return 'Missing X-Job-Hunt header (refresh the page)';
  const origin = req.headers.origin;
  if (origin && !allowed.some(h => origin.toLowerCase() === `http://${h}`)) return 'Cross-site request';
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return 'Cross-site request';
  return '';
}
