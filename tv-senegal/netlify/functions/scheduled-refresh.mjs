import { getStore } from "@netlify/blobs";
import { loadChannels, resolveChannel } from "./lib/extract.mjs";

// Ogni 30 minuti (gira solo sul deploy di produzione)
export const config = {
  schedule: "*/30 * * * *"
};

export default async () => {
  const origin = process.env.URL;
  if (!origin) {
    console.error("Variabile URL non disponibile: aggiornamento saltato");
    return;
  }

  const channels = (await loadChannels(origin)).filter((c) => c.type === "hls");
  const store = getStore("tv-senegal-streams");

  // In parallelo, per restare nei tempi massimi delle funzioni
  await Promise.all(
    channels.map(async (ch) => {
      const data = await resolveChannel(ch);
      await store.setJSON(ch.id, data);
    })
  );
};
