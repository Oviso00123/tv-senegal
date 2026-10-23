import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const channelId = url.searchParams.get("id");
  const forceRefresh = url.searchParams.get("refresh") === "true";

  if (!channelId) {
    return new Response(JSON.stringify({ error: "Channel ID required" }), { status: 400 });
  }

  try {
    const store = getStore("tv-senegal-streams");
    let streamData = await store.get(channelId, { type: "json" });

    if (!streamData || forceRefresh) {
      const fallbackStreams = {
        "rts1": "https://stream.rts.sn/live/rts1/playlist.m3u8",
        "tfm": "https://d2e1asnsl7br7b.cloudfront.net/7782/master.m3u8",
        "walftv": "https://walf-live.akamaized.net/hls/live/walf/index.m3u8",
        "itv": "https://itv-live.akamaized.net/live/master.m3u8"
      };

      streamData = {
        id: channelId,
        url: fallbackStreams[channelId] || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        status: "LIVE",
        updatedAt: new Date().toISOString()
      };
      await store.setJSON(channelId, streamData);
    }

    return new Response(JSON.stringify(streamData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
