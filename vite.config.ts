import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "audio-fft/index.html",
        "spring/index.html",
      ],
    },
  },
});
