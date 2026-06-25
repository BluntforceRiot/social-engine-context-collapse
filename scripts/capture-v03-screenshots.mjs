import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("output");

const routes = [
  ["", "social-engine-title-v03.png"],
  ["#/howto", "social-engine-howto-v03.png"],
  ["#/demo-main", "social-engine-main-v03.png"],
  ["#/demo-graph-hover", "social-engine-graph-hover-v03.png"],
  ["#/community", "social-engine-community-choice-v03.png"],
  ["#/create", "social-engine-create-group-v03.png"],
  ["#/demo-feed", "social-engine-feed-event-v03.png"],
  ["#/demo-viral", "social-engine-viral-event-v03.png"],
  ["#/demo-collapse", "social-engine-context-collapse-v03.png"],
  ["#/demo-paths", "social-engine-victory-paths-v03.png"],
  ["#/demo-victory", "social-engine-victory-v03.png"],
  ["#/demo-failure", "social-engine-failure-v03.png"],
  ["#/scores", "social-engine-highscores-v03.png"],
];

const sampleRuns = [
  {
    id: "sample-community-v03",
    date: new Date().toISOString(),
    outcome: "victory",
    title: "Hybrid Victory: Community + Knowledge",
    score: 12840,
    day: 30,
    followers: {
      closeFriends: 8,
      nicheMembers: 356,
      casualFollowers: 910,
      dramaFollowers: 26,
      opportunityContacts: 14,
      realityRelatives: 5,
    },
    trust: 82,
    biggestViralEvent: "A niche expert cited your guide.",
    bestRelationship: "Linux Forum Mentor",
    worstContextCollapse: "Golf joke nearly reached coworkers.",
    community: "Barn LAN and Donut Society",
    headline: "Local niche survives the feed by becoming useful on purpose.",
  },
  {
    id: "sample-collapse-v03",
    date: new Date(Date.now() - 86400000).toISOString(),
    outcome: "failure",
    title: "Context Collapse",
    score: 4180,
    day: 24,
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
await page.screenshot({ path: path.join(outputDir, "social-engine-mobile-v03.png"), fullPage: true });
console.log("Captured social-engine-mobile-v03.png");

await browser.close();

async function assertSocialEngine(page, url) {
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${url}, but got page title "${title}". Set SOCIAL_ENGINE_BASE_URL to the correct preview port.`);
  }
}
