import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Turbopack's wasm loader makes Next's file tracing match all of node_modules,
  // and the Cloudflare adapter bundles every traced .wasm. The only wasm the Worker
  // needs is Prisma's engine under src/generated, so exclude node_modules wasm.
  outputFileTracingExcludes: { "*": ["./node_modules/**/*.wasm"] },
  // Except Next's own OG image renderer, which the adapter's handler imports
  // statically: excluding these two breaks the Worker bundle at link time.
  outputFileTracingIncludes: {
    "*": ["./node_modules/next/dist/compiled/@vercel/og/*.wasm"],
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Mirror the widths /img serves so next/image never asks for another.
    deviceSizes: [640, 960, 1280, 1920, 2560],
    imageSizes: [320],
    qualities: [80],
  },
};

export default nextConfig;

// Gives `getCloudflareContext()` and Worker bindings to `next dev`.
initOpenNextCloudflareForDev();
