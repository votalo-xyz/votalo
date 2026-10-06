import type { MetadataRoute } from "next";

// Colors are the Plaza ink (the app opens in its dark theme by default); the icons come from public/pwa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Votalo",
    short_name: "Votalo",
    description: "Decide en grupo, una persona un voto, resultados que nadie puede manipular.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D0B12",
    theme_color: "#0D0B12",
    lang: "es",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
