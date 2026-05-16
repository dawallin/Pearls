import { createPearlsGame } from "./runtime/game/createPearlsGame";
import {
  findTestBySlug,
  TEST_CATALOG,
  type TestCatalogEntry
} from "./runtime/game/testCatalog";

function buildTestUrl(slug: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("test", slug);
  return `${url.pathname}${url.search}${url.hash}`;
}

function renderSelector(app: HTMLElement, invalidSlug: string | null): void {
  const warning = invalidSlug
    ? `<p style="color:#ffb4a2;margin:0 0 20px;">Unknown test: <code>${invalidSlug}</code></p>`
    : "";

  const cards = TEST_CATALOG.map(
    (test) => `
      <a
        href="${buildTestUrl(test.slug)}"
        style="
          display:block;
          padding:18px 20px;
          border:1px solid rgba(200,215,230,0.18);
          border-radius:16px;
          background:rgba(20,35,48,0.72);
          color:#f3efe4;
          text-decoration:none;
        "
      >
        <div style="font-size:20px;font-weight:700;margin-bottom:6px;">${test.title}</div>
        <div style="font-size:14px;color:#d6d0c1;">${test.description}</div>
        <div style="font-size:12px;color:#9eb0bf;margin-top:10px;">${buildTestUrl(test.slug)}</div>
      </a>
    `
  ).join("");

  app.innerHTML = `
    <div
      style="
        min-height:100vh;
        background:radial-gradient(circle at top, #193246 0%, #0b1117 60%);
        color:#f3efe4;
        font-family:Georgia, 'Times New Roman', serif;
        padding:48px 20px;
        box-sizing:border-box;
      "
    >
      <div style="max-width:760px;margin:0 auto;">
        <h1 style="margin:0 0 12px;font-size:42px;">Pearls Test Boards</h1>
        <p style="margin:0 0 24px;color:#d6d0c1;font-size:18px;">
          Choose a test board or open a direct URL with <code>?test=...</code>.
        </p>
        ${warning}
        <div style="display:grid;gap:14px;">${cards}</div>
      </div>
    </div>
  `;
}

function renderGameHeader(app: HTMLElement, test: TestCatalogEntry): void {
  app.innerHTML = `
    <div
      style="
        min-height:100vh;
        background:#0b1117;
        color:#f3efe4;
        box-sizing:border-box;
      "
    >
      <div
        style="
          position:fixed;
          top:12px;
          left:12px;
          z-index:10;
          display:flex;
          gap:12px;
          align-items:center;
          font-family:Georgia, 'Times New Roman', serif;
        "
      >
        <a
          href="${window.location.pathname}"
          style="
            color:#d6d0c1;
            text-decoration:none;
            background:rgba(20,35,48,0.78);
            padding:8px 12px;
            border-radius:999px;
            border:1px solid rgba(200,215,230,0.18);
          "
        >
          All Tests
        </a>
        <span style="color:#d6d0c1;background:rgba(20,35,48,0.78);padding:8px 12px;border-radius:999px;border:1px solid rgba(200,215,230,0.18);">
          ${test.title}
        </span>
      </div>
      <div id="game-root"></div>
    </div>
  `;
}

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error('Expected an element with id "app".');
}

const requestedSlug = new URLSearchParams(window.location.search).get("test");
const selectedTest = findTestBySlug(requestedSlug);

if (!selectedTest) {
  renderSelector(app, requestedSlug);
} else {
  renderGameHeader(app, selectedTest);
  createPearlsGame("game-root", selectedTest);
}
