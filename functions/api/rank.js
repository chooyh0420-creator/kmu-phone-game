// 계명인의 폰 — 사건 4 「02:17」 랭킹 (Cloudflare Pages Function + KV 바인딩 이름: RANK)
const GAMES = { c4: { minSec: 90, maxBat: 15, maxClues: 10 }, c5: { minSec: 120, maxBat: 0, maxClues: 8 } }, KEEP = 300;
const gameOf = req => { const g = new URL(req.url).searchParams.get('g'); return GAMES[g] ? g : 'c4' };
const BAD = ['씨발','시발','ㅅㅂ','병신','ㅂㅅ','개새','새끼','좆','존나','지랄','미친','엠창','니애미','느금','섹스','fuck','shit','bitch','sex'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const sortL = l => l.sort((a, b) => b.score - a.score || a.sec - b.sec || a.ts - b.ts);
async function load(env, key) { try { return JSON.parse((await env.RANK.get(key)) || '[]') } catch (e) { return [] } }
const pub = e => ({ id: e.id, name: e.name, score: e.score, sec: e.sec, bat: e.bat, clues: e.clues, ts: e.ts });

export async function onRequestGet({ request, env }) {
  if (!env.RANK) return json({ ok: false, err: 'nokv' }, 503);
  const l = await load(env, gameOf(request));
  return json({ ok: true, total: l.length, list: l.slice(0, 100).map(pub) });
}

export async function onRequestPost({ request, env }) {
  if (!env.RANK) return json({ ok: false, err: 'nokv' }, 503);
  const key = gameOf(request), G = GAMES[key];
  let b; try { b = await request.json() } catch (e) { return json({ ok: false, err: 'bad' }, 400) }
  let name = String(b.name || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);
  const score = Math.round(+b.score), sec = Math.round(+b.sec), bat = Math.round(+b.bat || 0), clues = Math.round(+b.clues || 0);
  if (!name) return json({ ok: false, err: 'name' }, 400);
  const low = name.toLowerCase().replace(/\s/g, '');
  if (BAD.some(w => low.includes(w))) return json({ ok: false, err: 'badword' }, 400);
  if (!(score >= 0 && score <= 100 && sec >= G.minSec && sec <= 14400 && bat >= 0 && bat <= G.maxBat && clues >= 0 && clues <= G.maxClues)) return json({ ok: false, err: 'range' }, 400);
  const e = { id: crypto.randomUUID().slice(0, 8), name, score, sec, bat, clues, ts: Date.now() };
  const l = sortL([...(await load(env, key)), e]).slice(0, KEEP);
  await env.RANK.put(key, JSON.stringify(l));
  const rank = l.findIndex(x => x.id === e.id) + 1;
  return json({ ok: true, id: e.id, rank, total: l.length, list: l.slice(0, 100).map(pub) });
}
