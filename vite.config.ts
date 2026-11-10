
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Vercel sets this variable during deployment.
// @ts-expect-error Vite config runs in Node.
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  nitro: isVercel ? { preset: "vercel" } : true,

  tanstackStart: {
    server: { entry: "server" },
  },
});
