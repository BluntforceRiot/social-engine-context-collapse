import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputPath = path.resolve("PLAYTEST_SOCIAL_ENGINE_V04_BALANCE.txt");

const strategies = [
  {
    name: "Knowledge community with Qwen reference",
    seed: 41001,
    interests: ["technology", "history", "community"],
    actions: ["share-tip", "ask-linux-help", "ask-expert", "pin-useful-thread", "retro-repair", "moderate-thread"],
    responses: ["joinSociety", "inviteQwenGuestPost", "tutorial", "pin", "friend", "private", "clarify", "mute"],
  },
  {
    name: "Creator pressure with repairs",
    seed: 41002,
    interests: ["creator", "coding", "relationships"],
    actions: ["tiny-build-log", "post-joke", "reply-thread", "signal-boost", "ask-expert", "dm-person", "weekend-offline"],
    responses: ["pin", "tutorial", "clarify", "private", "mute", "delete", "logoff"],
  },
  {
    name: "Local organizer",
    seed: 41003,
    interests: ["local", "community", "hobby"],
    actions: ["small-town-meetup", "host-event", "join-community", "create-group", "recruit-members", "celebrate-win", "moderate-fight"],
    responses: ["friend", "private", "apologize", "clarify", "mute", "logoff"],
  },
  {
    name: "Weird internet containment",
    seed: 41004,
    interests: ["weird", "relationships", "technology"],
    actions: ["blurry-camping-photo", "correct-ai-image", "refuse-argue", "block-mute", "ask-expert", "touch-grass"],
    responses: ["explainSynthetic", "pinMediaLiteracy", "clarify", "friend", "private", "muteQwenThread", "logoff"],
  },
];

const browser = await chromium.launch();
const results = [];

for (const strategy of strategies) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript((seed) => {
    localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
    let state = seed >>> 0;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }, strategy.seed);

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertSocialEngine(page, baseUrl);
  await configureInterests(page, strategy.interests);
  await page.locator('[data-ui="start"]').first().click();

  const log = [];
  let turns = 0;
  let qwenSeen = false;

  for (turns = 0; turns < 38; turns += 1) {
    if (await page.locator(".end-card").count()) break;
    await playAction(page, strategy.actions[turns % strategy.actions.length], log);
    qwenSeen = qwenSeen || (await page.getByText("QWEN FRANKLIN HAS SENT YOU AN INVITATION").isVisible().catch(() => false));
    await resolveReport(page, strategy.responses, log);
  }

  const ending = await page.locator(".end-card h2").textContent().catch(() => "No ending reached");
  const score = await readSummaryValue(page, "Final Score");
  const day = await readSummaryValue(page, "Day Reached");
  const topPath = await readSummaryValue(page, "Top Path");

  results.push({
    name: strategy.name,
    seed: strategy.seed,
    interests: strategy.interests.join(", "),
    ending: ending?.trim() ?? "No ending reached",
    score,
    day,
    topPath,
    qwenSeen,
    turns,
    log,
  });

  await context.close();
}

await browser.close();

const failed = results.filter((result) => result.ending === "No ending reached" || result.day === "n/a");
const report = [
  "# Social Engine v0.4 Deterministic Balance Suite",
  "",
  `Base URL: ${baseUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.flatMap((result, index) => [
    `## Run ${index + 1}: ${result.name}`,
    "",
    `Seed: ${result.seed}`,
    `Starting interests: ${result.interests}`,
    `Ending: ${result.ending}`,
    `Top path: ${result.topPath}`,
    `Score: ${result.score}`,
    `Day reached: ${result.day}`,
    `Turns attempted: ${result.turns}`,
    `Qwen invitation seen: ${result.qwenSeen ? "yes" : "no"}`,
    "",
    "Action/response log:",
    ...result.log.map((line) => `- ${line}`),
    "",
  ]),
  failed.length ? `Failed deterministic runs: ${failed.length}` : "All deterministic v0.4 balance runs reached an ending.",
  "",
].join("\n");

await writeFile(outputPath, report, "utf8");
console.log(report);

if (failed.length) {
  process.exit(1);
}

async function configureInterests(page, desired) {
  for (const chip of await page.locator(".interest-chip").all()) {
    const id = await chip.getAttribute("data-interest-id");
    const selected = (await chip.getAttribute("aria-pressed")) === "true";
    if (id && selected && !desired.includes(id)) {
      await chip.click();
    }
  }
  for (const id of desired) {
    const chip = page.locator(`.interest-chip[data-interest-id="${id}"]`).first();
    if ((await chip.getAttribute("aria-pressed")) !== "true") {
      await chip.click();
    }
  }
}

async function playAction(page, actionId, log) {
  let action = page.locator(`.action-card[data-action-id="${actionId}"]`).first();
  if (!(await action.count())) {
    action = page.locator(".action-card").first();
    const fallbackId = await action.getAttribute("data-action-id").catch(() => "none");
    log.push(`Preferred ${actionId} not in hand; used ${fallbackId}.`);
  }
  await action.scrollIntoViewIfNeeded();
  const playedId = await action.getAttribute("data-action-id");
  await action.click();

  if (await page.locator(".community-card").count()) {
    const joinButton = page.locator('.community-card .primary:not(:disabled)').first();
    if (await joinButton.count()) {
      await joinButton.click();
      log.push("Joined first available community.");
      return;
    }
    await page.goto(`${baseUrl.replace(/\/$/, "/")}#/game`, { waitUntil: "networkidle" });
    log.push("No unjoined community available.");
    return;
  }

  if (await page.locator("#create-group-form").count()) {
    await page.locator('[data-ui="create-group"]').click();
    log.push("Created forecast group.");
    return;
  }

  log.push(`Played ${playedId ?? actionId}.`);
}

async function resolveReport(page, preferredResponses, log) {
  const modal = page.locator(".event-modal");
  if (!(await modal.count())) return;

  for (const response of preferredResponses) {
    const responseButton = page.locator(`[data-ui="respond"][data-response="${response}"]`).first();
    if (await responseButton.count()) {
      await responseButton.click();
      log.push(`Responded with ${response}.`);
      return;
    }
  }

  const fallbackResponse = page.locator('[data-ui="respond"]').first();
  if (await fallbackResponse.count()) {
    const response = await fallbackResponse.getAttribute("data-response");
    await fallbackResponse.click();
    log.push(`Responded with fallback ${response ?? "unknown"}.`);
    return;
  }

  const continueButton = page.locator('[data-ui="continue-report"]').first();
  if (await continueButton.count()) {
    await continueButton.click();
    log.push("Continued feed report.");
  }
}

async function readSummaryValue(page, label) {
  return page
    .locator(".summary-grid div")
    .filter({ hasText: label })
    .locator("strong")
    .textContent()
    .then((value) => value?.trim() ?? "n/a")
    .catch(() => "n/a");
}

async function assertSocialEngine(page, url) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${url}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
}
