import { getStore } from "@netlify/blobs";
import { loadChannels, resolveChannel } from "./lib/extract.mjs";

// GET /api/stream/:id            -> ultimo URL salvato (rinnovato se più vecchio di 30 minuti)
// GET /api/stream/:id?refresh=true -> riestrae subito l'URL (usato dal player in caso di errore)
export const config = {
  path: "/api/stream/:id"
};

const MAX_AGE_MS = 30 * 60 * 1000;

const json = (body, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache }
  });

export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const id = context.params && context.params.id;
    const force = url.searchParams.get("refresh") === "true";

    const channels = await loadChannels(url.origin);
    const channel = channels.find((c) => c.id === id && c.type === "hls");
    if (!channel) return json({ error: "Canale HLS non trovato" }, 404);

    const store = getStore("tv-senegal-streams");
    let data = await store.get(id, { type: "json" });

    const fresh = data && Date.now() - new Date(data.checkedAt).getTime() < MAX_AGE_MS;
    if (force || !fresh) {
      data = await resolveChannel(channel);
      await store.setJSON(id, data);
    }

    return json(data, 200, force ? "no-store" : "public, max-age=60");
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
