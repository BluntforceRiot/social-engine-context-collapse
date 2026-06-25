import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("output");

const routes = [
  ["#/demo-qwen-invitation", "social-engine-qwen-invitation.png"],
  ["#/demo-qwen-community", "social-engine-qwen-society-community.png"],
  ["#/demo-qwen-collapse", "social-engine-qwen-aunt-jpeg-context-collapse.png"],
  ["#/credits", "social-engine-qwen-credits.png"],
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

await context.addInitScript(() => {
  localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
});

const page = await context.newPage();

for (const [route, fileName] of routes) {
  const url = `${baseUrl.replace(/\/$/, "/")}${route}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await assertSocialEngine(page, url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
}

await page.goto(`${baseUrl.replace(/\/$/, "/")}#/credits`, { waitUntil: "networkidle" });
await assertSocialEngine(page, `${baseUrl}#/credits`);
await page.getByRole("button", { name: "Preview Qwen Franklin Event" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outputDir, "social-engine-qwen-preview-event.png"), fullPage: false });
console.log("Captured social-engine-qwen-preview-event.png");

await browser.close();

async function assertSocialEngine(page, url) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${url}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
}
