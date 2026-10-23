import { getStore } from "@netlify/blobs";

export const config = { schedule: "*/30 * * * *" };

export default async () => {
  const channelList = [
    { id: "rts1", url: "https://stream.rts.sn/live/rts1/playlist.m3u8" },
    { id: "tfm", url: "https://d2e1asnsl7br7b.cloudfront.net/7782/master.m3u8" },
    { id: "walftv", url: "https://walf-live.akamaized.net/hls/live/walf/index.m3u8" },
    { id: "itv", url: "https://itv-live.akamaized.net/live/master.m3u8" }
  ];

  const store = getStore("tv-senegal-streams");
  const results = [];

  for (const ch of channelList) {
    let alive = false;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 5000);
      const res = await fetch(ch.url, { method: "HEAD", signal: c.signal });
      clearTimeout(t);
      alive = res.ok;
    } catch (e) { alive = false; }

    const item = { id: ch.id, url: ch.url, status: alive ? "LIVE" : "OFFLINE", lastChecked: new Date().toISOString() };
    await store.setJSON(ch.id, item);
    results.push(item);
  }

  return new Response(JSON.stringify({ success: true, results }), { status: 200 });
};
