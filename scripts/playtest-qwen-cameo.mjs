import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const projectUrl = "https://merlinforge.substack.com/p/founding-father-ai-a-real-llm-in";
const sourceUrl = "https://github.com/myles-mf/summer-into-ai-2026/tree/main/week-1/founding-father";
const outputPath = path.resolve("PLAYTEST_SOCIAL_ENGINE_QWEN_REFERENCE_V2.txt");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(() => {
  localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
});

const page = await context.newPage();
const results = [];

await goto("#/community");
results.push(check("Founders society locked on normal community route", (await page.getByText("Founders & Future Society").count()) === 0));

await goto("#/demo-qwen-invitation");
await assertQwenInvitation("Demo route invitation");
results.push(check("Invitation has four choices", (await page.locator('[data-ui="respond"]').count()) === 4));
await assertProjectLink("Invitation project link");
await assertSourceLink("Invitation source link");
await assertNoMissingLinkUi("Invitation has no source-link placeholder UI");

await goto("");
await page.getByRole("button", { name: "Start Run" }).click();
for (let index = 0; index < 7; index += 1) {
  await playQualifyingAction();
  results.push(check(`No Qwen invitation before Day ${index + 2}`, (await qwenInvitationVisible()) === false));
  await resolveCurrentReport();
}
await playQualifyingAction();
results.push(check("Invitation reachable during qualifying run by Day 8", await qwenInvitationVisible()));

await goto("");
await page.getByRole("button", { name: "Start Run" }).click();
const dayBeforePreview = await currentDayLabel();
await goto("#/credits");
await page.getByRole("button", { name: "Preview Featured Guest Signal" }).click();
results.push(check("Preview event opens from About/Credits", await page.locator('[data-preview="qwen"]').isVisible()));
results.push(check("Preview choices are non-scoring disabled buttons", (await page.locator(".preview-choices button:disabled").count()) === 4));
await assertProjectLink("Preview project link");
await assertSourceLink("Preview source link");
await page.getByRole("button", { name: "Close Preview" }).click();
await goto("#/game");
results.push(check("Preview event does not mutate run day", (await currentDayLabel()) === dayBeforePreview));

await goto("#/demo-qwen-community");
results.push(check("Unlocked community card is visible", (await page.getByText("Founders & Future Society").count()) >= 1));
results.push(check("Community card shows guest avatar", (await page.locator(".community-card.guest-community .guest-avatar").count()) >= 1));
results.push(check("Joined community shows JOINED state", await page.locator(".community-card.guest-community button", { hasText: "JOINED" }).isDisabled()));
results.push(check("Joined community cannot be joined repeatedly", (await page.locator('.community-card.guest-community button[data-ui="join-community"]:not(:disabled)').count()) === 0));

await goto("#/demo-qwen-collapse");
results.push(check("Aunt JPEG context-collapse modal is present", await page.getByText("AUNT JPEG THINKS QWEN FRANKLIN IS REAL").isVisible()));
results.push(check("Aunt JPEG event has five responses", (await page.locator('[data-ui="respond"]').count()) === 5));
results.push(check("Credited-project response is visible", await page.locator('[data-ui="respond"][data-response="letProjectSpeak"]', { hasText: "Open the Credited Project" }).isVisible()));
results.push(check("Old credit-note response text is absent", (await page.getByText(["Point to", "the credit note"].join(" ")).count()) === 0));
await assertProjectLink("Aunt JPEG project link");
await assertSourceLink("Aunt JPEG source link");
const popupPromise = page.waitForEvent("popup");
await page.locator('[data-ui="respond"][data-response="letProjectSpeak"]').click();
const popup = await popupPromise;
await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
results.push(check("Open Credited Project opens the confirmed article", popup.url().startsWith(projectUrl)));
await popup.close();
results.push(check("Open Credited Project resolves the response", (await page.locator(".event-modal").count()) === 0));

await goto("#/credits");
results.push(check("Credits page shows competitor-reference card", await page.getByText("GUEST SIGNAL FROM THE COMPETITION").first().isVisible()));
await assertProjectLink("Credits project link");
await assertSourceLink("Credits source link");
await assertNoMissingLinkUi("Credits has no source-link placeholder UI");

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]) {
  await page.setViewportSize(viewport);
  for (const route of ["#/demo-qwen-invitation", "#/demo-qwen-collapse", "#/demo-qwen-community", "#/credits"]) {
    await goto(route);
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(check(`No horizontal overflow at ${viewport.width}x${viewport.height} on ${route}`, overflow <= 1));
  }
}

await browser.close();

const failed = results.filter((result) => !result.pass);
const report = [
  "# Social Engine Qwen Franklin Reference V2 Playtest",
  "",
  `Base URL: ${baseUrl}`,
  `Project URL: ${projectUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.map((result) => `- ${result.pass ? "PASS" : "FAIL"}: ${result.name}`),
  "",
  failed.length ? `Failed checks: ${failed.length}` : "All Qwen reference V2 checks passed.",
  "",
].join("\n");

await writeFile(outputPath, report, "utf8");
console.log(report);

if (failed.length) {
  process.exit(1);
}

async function goto(route) {
  await page.goto(`${baseUrl.replace(/\/$/, "/")}${route}`, { waitUntil: "networkidle" });
  await assertSocialEngine(route || "#/");
}

async function playAction(actionId) {
  await page.locator(`[data-ui="play-action"][data-action-id="${actionId}"]`).click();
}

async function playQualifyingAction() {
  const candidates = ["share-tip", "ask-linux-help", "tiny-build-log", "ask-expert", "pin-useful-thread", "join-community"];
  for (const actionId of candidates) {
    const action = page.locator(`[data-ui="play-action"][data-action-id="${actionId}"]`).first();
    if (await action.count()) {
      await action.click();
      return;
    }
  }
  await page.locator('[data-ui="play-action"]').first().click();
}

async function qwenInvitationVisible() {
  return page.getByText("QWEN FRANKLIN HAS SENT YOU AN INVITATION").isVisible().catch(() => false);
}

async function resolveCurrentReport() {
  const continueButton = page.locator('[data-ui="continue-report"]').first();
  if ((await continueButton.count()) > 0) {
    await continueButton.click();
    return;
  }
  const preferred = page.locator('[data-ui="respond"][data-response="private"]').first();
  if ((await preferred.count()) > 0) {
    await preferred.click();
    return;
  }
  const firstResponse = page.locator('[data-ui="respond"]').first();
  if ((await firstResponse.count()) > 0) {
    await firstResponse.click();
  }
}

async function currentDayLabel() {
  return page.locator(".game-header h2").innerText();
}

async function assertQwenInvitation(name) {
  results.push(check(`${name} is present`, await qwenInvitationVisible()));
  results.push(check(`${name} shows featured guest banner`, (await page.getByText("FEATURED GUEST SIGNAL FROM MYLES'S FOUNDING FATHER A.I.").count()) >= 1));
  results.push(check(`${name} uses compact chips`, (await page.locator(".effects-list span").count()) === 3));
  results.push(check(`${name} omits victory chip`, (await page.getByText(["Not required", "for victory"].join(" ")).count()) === 0));
}

async function assertProjectLink(name) {
  const link = page.getByRole("link", { name: "Visit Founding Father A.I." }).first();
  const href = await link.getAttribute("href");
  const target = await link.getAttribute("target");
  const rel = await link.getAttribute("rel");
  results.push(check(`${name} is active and correct`, href === projectUrl));
  results.push(check(`${name} opens in a new tab`, target === "_blank"));
  results.push(check(`${name} uses noopener noreferrer`, rel?.includes("noopener") && rel?.includes("noreferrer")));
}

async function assertSourceLink(name) {
  const link = page.getByRole("link", { name: "View Source" }).first();
  const href = await link.getAttribute("href");
  const target = await link.getAttribute("target");
  const rel = await link.getAttribute("rel");
  results.push(check(`${name} is active and correct`, href === sourceUrl));
  results.push(check(`${name} opens in a new tab`, target === "_blank"));
  results.push(check(`${name} uses noopener noreferrer`, rel?.includes("noopener") && rel?.includes("noreferrer")));
}

async function assertNoMissingLinkUi(name) {
  const bodyText = await page.locator("body").innerText();
  const staleTextPattern = new RegExp(
    [
      ["pend", "ing link"].join(""),
      ["pend", "ing-link"].join(""),
      ["not", " supplied"].join(""),
      ["inactive", " until URLs"].join(""),
      ["disabled", " until"].join(""),
    ].join("|"),
    "i",
  );
  results.push(check(`${name}: no disabled link buttons`, (await page.locator(".button-link.disabled").count()) === 0));
  results.push(check(`${name}: no stale missing-link text`, !staleTextPattern.test(bodyText)));
}

async function assertSocialEngine(route) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${route}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
}

function check(name, pass) {
  return { name, pass: Boolean(pass) };
}
