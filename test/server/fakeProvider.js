// A fake AI provider on a random port: records requests and answers with whatever `reply(req)` returns.
import http from 'node:http';

export async function fakeProvider(reply) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const r = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
    requests.push(r);
    const { status = 200, json, text, delay = 0 } = await reply(r, requests.length);
    if (delay) await new Promise(ok => setTimeout(ok, delay));
    if (res.destroyed) return;
    res.writeHead(status, { 'Content-Type': json ? 'application/json' : 'text/plain' });
    res.end(json ? JSON.stringify(json) : text ?? '');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); }) };
}

export const chatReply = content => ({ json: { choices: [{ message: { role: 'assistant', content } }] } });
