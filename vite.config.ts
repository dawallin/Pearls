import { defineConfig } from "vite";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isPages = process.env.GITHUB_PAGES === "true";
const configuredBasePath = process.env.PAGES_BASE_PATH;

function normalizeBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  const trimmed = basePath.replace(/^\/+|\/+$/g, "");
  return `/${trimmed}/`;
}

export default defineConfig({
  base: configuredBasePath
    ? normalizeBasePath(configuredBasePath)
    : isPages && repo
      ? `/${repo}/`
      : "/"
});
