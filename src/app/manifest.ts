import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mohalla — book a ground nearby",
    short_name: "Mohalla",
    description: "Find turfs and sports venues, book a slot, or join a pickup game.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#0e3b2e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
