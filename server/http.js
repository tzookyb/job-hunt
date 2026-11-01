// Small helpers around Node's http response/request objects.

export function send(res, status, body = '', type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

export const sendJson = (res, status, value) => send(res, status, JSON.stringify(value), 'application/json');

// Collects the request body as bytes, refusing anything over `limit` bytes.
export function readBuffer(req, limit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// The request body as text.
export const readBody = async (req, limit) => (await readBuffer(req, limit)).toString('utf8');
