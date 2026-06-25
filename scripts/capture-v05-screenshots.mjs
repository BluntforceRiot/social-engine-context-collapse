import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const release = process.argv.includes("--v100") ? "v100" : "v051";
const titleVersion = release === "v100" ? "v1.0" : "v0.5.1";
const outDir = path.resolve(`output/social-engine-${release}`);
await mkdir(outDir, { recursive: true });

const v051Shots = [
  ["premium-title", "", 1440, 900],
  ["interest-selection", "", 1440, 900],
  ["six-card-daily-hand", "#/demo-main", 1440, 900],
  ["victory-paths-drawer", "#/demo-main", 1440, 900],
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
  ["desktop-1920", "#/demo-main", 1920, 1080],
  ["desktop-1366", "#/demo-main", 1366, 768],
  ["desktop-1280", "#/demo-main", 1280, 720],
];

const v100Shots = [
  ["premium-title", "", 1440, 900],
  ["main-dashboard", "#/demo-main", 1440, 900],
  ["victory-paths", "#/demo-main", 1280, 720],
  ["create-group", "#/create", 1440, 900],
  ["about-credits", "#/credits", 1440, 900],
  ["organizer-victory", "#/demo-victory-organizer", 1440, 900],
  ["context-collapse", "#/demo-collapse", 1440, 900],
];

const shots = release === "v100" ? v100Shots : v051Shots;

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
  if (name === "victory-paths-drawer" || name === "victory-paths") {
    await page.getByRole("button", { name: "Victory Paths" }).first().click();
    await page.waitForTimeout(120);
  }
  const filePath = path.join(outDir, `social-engine-${release}-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  captured.push(filePath);
}

await browser.close();

const manifest = [
  `# Social Engine ${titleVersion} Screenshot Manifest`,
  "",
  `Base URL: ${baseUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...captured.map((item) => `- ${item}`),
  "",
].join("\n");
await writeFile(path.join(outDir, `SCREENSHOT_MANIFEST_SOCIAL_ENGINE_${release.toUpperCase()}.md`), manifest, "utf8");
console.log(manifest);
