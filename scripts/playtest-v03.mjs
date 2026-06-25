import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputPath = path.resolve("PLAYTEST_SOCIAL_ENGINE_V03.txt");

const strategies = [
  {
    name: "Balanced repair/community",
    actions: [
      "share-tip",
      "ask-question",
      "private-message",
      "join-community",
      "pin-useful-thread",
      "host-event",
      "celebrate-win",
      "moderate-thread",
      "take-break",
      "tiny-build-log",
      "ask-expert",
      "small-town-meetup",
      "refuse-argue",
      "signal-boost",
      "touch-grass",
    ],
    responses: ["friend", "private", "clarify", "pin", "tutorial", "mute", "logoff"],
  },
  {
    name: "Creator/viral pressure",
    actions: [
      "tiny-build-log",
      "post-joke",
      "reply-thread",
      "blurry-camping-photo",
      "share-tip",
      "signal-boost",
      "group-challenge",
      "delete-post",
      "ask-expert",
      "post-update",
      "block-mute",
      "weekend-offline",
    ],
    responses: ["pin", "clarify", "tutorial", "lean", "mute", "delete", "logoff"],
  },
  {
    name: "Community organizer",
    actions: [
      "ask-linux-help",
      "retro-repair",
      "join-community",
      "create-group",
      "recruit-members",
      "moderate-fight",
      "host-event",
      "small-town-meetup",
      "celebrate-win",
      "pin-useful-thread",
      "dm-person",
      "weekend-offline",
    ],
    responses: ["friend", "tutorial", "private", "clarify", "apologize", "mute", "logoff"],
  },
];

const browser = await chromium.launch();
const results = [];

for (const strategy of strategies) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertSocialEngine(page, baseUrl);
  await page.locator('[data-ui="start"]').first().click();

  const log = [];
  let turns = 0;

  for (turns = 0; turns < 35; turns += 1) {
    if (await page.locator(".end-card").count()) {
      break;
    }

    const actionId = strategy.actions[turns % strategy.actions.length];
    await playAction(page, actionId, log);
    await resolveReport(page, strategy.responses, log);
  }

  const title = await page.locator(".end-card h2").textContent().catch(() => "No ending reached");
  const score = await page
    .locator(".summary-grid div")
    .filter({ hasText: "Final Score" })
    .locator("strong")
    .textContent()
    .catch(() => "n/a");
  const day = await page
    .locator(".summary-grid div")
    .filter({ hasText: "Day Reached" })
    .locator("strong")
    .textContent()
    .catch(() => "n/a");

  results.push({
    name: strategy.name,
    ending: title?.trim() ?? "No ending reached",
    score: score?.trim() ?? "n/a",
    day: day?.trim() ?? "n/a",
    turns,
    log,
  });

  await context.close();
}

await browser.close();

const report = [
  "# Social Engine v0.3 Automated 30-Day Playtests",
  "",
  `Base URL: ${baseUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.flatMap((result, index) => [
    `## Run ${index + 1}: ${result.name}`,
    "",
    `Ending: ${result.ending}`,
    `Score: ${result.score}`,
    `Day reached: ${result.day}`,
    `Turns attempted: ${result.turns}`,
    "",
    "Action/response log:",
    ...result.log.map((line) => `- ${line}`),
    "",
  ]),
].join("\n");

await writeFile(outputPath, report, "utf8");
console.log(report);
console.log(`Wrote ${outputPath}`);

async function playAction(page, actionId, log) {
  let action = page.locator(`.action-card[data-action-id="${actionId}"]`).first();
  if (!(await action.count())) {
    action = page.locator(".action-card").first();
    if (!(await action.count())) {
      log.push(`Skipped ${actionId}; no action hand present.`);
      await page.goto(`${baseUrl.replace(/\/$/, "/")}#/game`, { waitUntil: "networkidle" });
      return;
    }
    const fallbackId = await action.getAttribute("data-action-id");
    log.push(`Preferred ${actionId} was not in today's hand; used ${fallbackId ?? "visible fallback"}.`);
  }
  await action.scrollIntoViewIfNeeded();
  const playedId = await action.getAttribute("data-action-id");
  await action.click();

  if (await page.locator(".community-card").count()) {
    const joinButton = page.locator('.community-card .primary:not(:disabled)').first();
    if (await joinButton.count()) {
      await joinButton.click();
      log.push("Joined first available community.");
    } else {
      await page.goto(`${baseUrl.replace(/\/$/, "/")}#/game`, { waitUntil: "networkidle" });
      log.push("Skipped community join; available rooms were already joined.");
    }
  } else if (await page.locator("#create-group-form").count()) {
    await page.locator('[data-ui="create-group"]').click();
    log.push("Created default forecast group.");
  } else {
    log.push(`Played ${playedId ?? actionId}.`);
  }
}

async function assertSocialEngine(page, url) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${url}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
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
