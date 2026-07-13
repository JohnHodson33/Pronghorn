// PWA manifest — makes the platform installable on John's phone (he reviews
// on mobile constantly). Served at /manifest.webmanifest by Next.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pronghorn Platform",
    short_name: "Pronghorn",
    description: "Deal sourcing & CRM — Pronghorn Equity Partners",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF9F2",
    theme_color: "#17301F",
    icons: [
      {
        src: "/pronghorn-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
