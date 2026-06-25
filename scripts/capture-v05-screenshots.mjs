import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outDir = path.resolve("output/social-engine-v05");
await mkdir(outDir, { recursive: true });

const shots = [
  ["premium-title", "", 1440, 900],
  ["interest-selection", "", 1440, 900],
  ["six-card-daily-hand", "#/demo-main", 1440, 900],
  ["avatar-graph", "#/demo-main", 1440, 900],
  ["graph-person-focus", "#/demo-graph-hover", 1440, 900],
  ["healthy-community", "#/community", 1440, 900],
  ["risky-community", "#/community", 1440, 900],
  ["create-group-forecast", "#/create", 1440, 900],
  ["manage-group", "#/demo-manage-group", 1440, 900],
  ["qwen-invitation", "#/demo-qwen-invitation", 1440, 900],
  ["qwen-community", "#/demo-qwen-community", 1440, 900],
  ["aunt-jpeg-collapse", "#/demo-qwen-collapse", 1440, 900],
  ["normal-viral-event", "#/demo-viral", 1440, 900],
  ["normal-context-collapse", "#/demo-collapse", 1440, 900],
  ["relationship-repair", "#/demo-victory-relationship", 1440, 900],
  ["victory-community", "#/demo-victory-community", 1440, 900],
  ["victory-viral", "#/demo-victory-viral", 1440, 900],
  ["victory-knowledge", "#/demo-victory-knowledge", 1440, 900],
  ["victory-relationship", "#/demo-victory-relationship", 1440, 900],
  ["victory-creator", "#/demo-victory-creator", 1440, 900],
  ["victory-organizer", "#/demo-victory-organizer", 1440, 900],
  ["victory-escape", "#/demo-victory-escape", 1440, 900],
  ["failure-context", "#/demo-failure-context", 1440, 900],
  ["failure-feed-rot", "#/demo-failure-feed-rot", 1440, 900],
  ["failure-unfriended", "#/demo-failure-unfriended", 1440, 900],
  ["failure-burnout", "#/demo-failure-burnout", 1440, 900],
  ["ending-explanation", "#/demo-victory-organizer", 1440, 900],
  ["run-history", "#/scores", 1440, 900],
  ["about-credits", "#/credits", 1440, 900],
  ["mobile-smoke", "#/demo-main", 390, 844],
];

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
await context.addInitScript(() => {
  localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
});
const page = await context.newPage();
const captured = [];

for (const [name, route, width, height] of shots) {
  await page.setViewportSize({ width, height });
  await page.goto(`${baseUrl.replace(/\/$/, "/")}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(180);
  if (name === "interest-selection") {
    await page.locator(".interest-picker").scrollIntoViewIfNeeded();
  }
  const filePath = path.join(outDir, `social-engine-v05-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  captured.push(filePath);
}

await browser.close();

const manifest = [
  "# Social Engine v0.5 Screenshot Manifest",
  "",
  `Base URL: ${baseUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...captured.map((item) => `- ${item}`),
  "",
].join("\n");
await writeFile(path.join(outDir, "SCREENSHOT_MANIFEST_SOCIAL_ENGINE_V05.md"), manifest, "utf8");
console.log(manifest);
