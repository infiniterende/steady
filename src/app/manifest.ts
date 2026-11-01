import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Steady: habits, planner and journal",
    short_name: "Steady",
    description: "A calmer way to build habits. Short blocks, honest streaks, and a plan you can see.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F1EB",
    theme_color: "#6B705C",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Planner", url: "/app/planner", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Journal", url: "/app/journal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
