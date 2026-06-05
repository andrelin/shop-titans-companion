import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site under /<repo>/ — set base accordingly so assets resolve.
// VITE_BASE lets the GH Actions deploy override it if the repo is ever renamed.
const base = process.env.VITE_BASE ?? "/shop-titans-companion/";

export default defineConfig({
  base,
  plugins: [react()],
});
