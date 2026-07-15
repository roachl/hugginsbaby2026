import { getStore } from '@netlify/blobs';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});
const safeName = value => String(value || '').trim().replace(/[^a-z0-9 .,'-]/gi, '').slice(0, 24);
const validGames = new Set(['mini', 'wordle', 'connections', 'strands']);

export default async request => {
  const store = getStore({ name: 'baby-shower-leaderboard', consistency: 'strong' });
  if (request.method === 'GET') {
    const { blobs } = await store.list();
    const entries = await Promise.all(blobs.slice(0, 200).map(({ key }) => store.get(key, { type: 'json' })));
    return json(entries.filter(Boolean));
  }
  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid submission' }, 400); }
    const name = safeName(body.name);
    const playerId = String(body.playerId || '').replace(/[^a-z0-9-]/gi, '').slice(0, 64);
    const game = String(body.game || '');
    const score = Math.round(Number(body.score));
    if (!name || !playerId || !validGames.has(game) || !Number.isFinite(score) || score < 0 || score > 1500) return json({ error: 'Invalid submission' }, 400);
    const entry = { playerId, name, game, score, elapsed: Math.max(0, Math.round(Number(body.elapsed) || 0)), detail: body.detail || {}, completedAt: new Date().toISOString() };
    await store.setJSON(`${playerId}-${game}`, entry);
    return json({ ok: true }, 201);
  }
  if (request.method === 'DELETE') {
    const expected = process.env.LEADERBOARD_ADMIN_PASSWORD;
    if (!expected) return json({ error: 'Admin password is not configured' }, 503);
    if (request.headers.get('x-admin-password') !== expected) return json({ error: 'Unauthorized' }, 401);
    await store.deleteAll();
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};
