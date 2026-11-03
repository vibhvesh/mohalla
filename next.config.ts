import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bookings, sessions, and map search are request-time. Leaving Cache Components
  // off keeps those route handlers dynamic instead of failing the prerender.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
