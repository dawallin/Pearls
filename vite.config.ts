import { defineConfig } from "vite";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isPages && repo ? `/${repo}/` : "/"
});
