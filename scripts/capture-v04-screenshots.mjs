import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("output");

const routes = [
  ["", "social-engine-title-v04.png"],
  ["#/howto", "social-engine-howto-v04.png"],
  ["#/credits", "social-engine-credits-v04.png"],
  ["#/demo-main", "social-engine-main-v04.png"],
  ["#/demo-graph-hover", "social-engine-graph-hover-v04.png"],
  ["#/community", "social-engine-community-choice-v04.png"],
  ["#/create", "social-engine-create-group-v04.png"],
  ["#/demo-feed", "social-engine-feed-event-v04.png"],
  ["#/demo-viral", "social-engine-viral-event-v04.png"],
  ["#/demo-collapse", "social-engine-context-collapse-v04.png"],
  ["#/demo-qwen-invitation", "social-engine-qwen-invitation-v04.png"],
  ["#/demo-qwen-community", "social-engine-qwen-community-v04.png"],
  ["#/demo-qwen-collapse", "social-engine-qwen-collapse-v04.png"],
  ["#/demo-paths", "social-engine-victory-paths-v04.png"],
  ["#/demo-victory", "social-engine-victory-v04.png"],
  ["#/demo-failure", "social-engine-failure-v04.png"],
  ["#/scores", "social-engine-highscores-v04.png"],
];

const sampleRuns = [
  {
    id: "sample-community-v04",
    date: new Date().toISOString(),
    outcome: "victory",
    title: "Hybrid Victory: Community + Knowledge",
    score: 13220,
    day: 30,
    followers: {
      closeFriends: 8,
      nicheMembers: 372,
      casualFollowers: 880,
      dramaFollowers: 24,
      opportunityContacts: 15,
      realityRelatives: 5,
    },
    trust: 84,
    biggestViralEvent: "Qwen Franklin's guest post found the history-and-AI people.",
    bestRelationship: "Linux Forum Mentor",
    worstContextCollapse: "Aunt JPEG thought Qwen Franklin was real.",
    community: "Founders & Future Society, Barn LAN and Donut Society",
    headline: "Local niche survives the feed by becoming useful on purpose.",
  },
  {
    id: "sample-collapse-v04",
    date: new Date(Date.now() - 86400000).toISOString(),
    outcome: "failure",
    title: "Context Collapse",
    score: 4230,
    day: 23,
    followers: {
      closeFriends: 1,
      nicheMembers: 166,
      casualFollowers: 1040,
      dramaFollowers: 385,
      opportunityContacts: 3,
      realityRelatives: 32,
    },
    trust: 14,
    biggestViralEvent: "Satire lost its label.",
    bestRelationship: "Old Friend Nate",
    worstContextCollapse: "The wrong room found it.",
    community: "Blurry Evidence Desk",
    headline: "SignalBarn user discovers every audience can fit in one terrible room.",
  },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

await context.addInitScript((runs) => {
  localStorage.setItem("social-engine.contextCollapse.runs.v1", JSON.stringify(runs));
  localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
}, sampleRuns);

const page = await context.newPage();

for (const [route, fileName] of routes) {
  const url = `${baseUrl.replace(/\/$/, "/")}${route}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await assertSocialEngine(page, url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl.replace(/\/$/, "/")}#/demo-main`, { waitUntil: "networkidle" });
await assertSocialEngine(page, `${baseUrl.replace(/\/$/, "/")}#/demo-main`);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outputDir, "social-engine-mobile-v04.png"), fullPage: true });
console.log("Captured social-engine-mobile-v04.png");

await browser.close();

async function assertSocialEngine(page, url) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${url}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
}
