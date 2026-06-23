import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("output");

const routes = [
  ["", "social-engine-title-v02.png"],
  ["#/howto", "social-engine-howto-v02.png"],
  ["#/demo-main", "social-engine-main-v02.png"],
  ["#/demo-graph-hover", "social-engine-graph-hover-v02.png"],
  ["#/community", "social-engine-community-choice-v02.png"],
  ["#/create", "social-engine-create-group-v02.png"],
  ["#/demo-feed", "social-engine-feed-event-v02.png"],
  ["#/demo-viral", "social-engine-viral-event-v02.png"],
  ["#/demo-collapse", "social-engine-context-collapse-v02.png"],
  ["#/demo-paths", "social-engine-victory-paths-v02.png"],
  ["#/demo-victory", "social-engine-victory-v02.png"],
  ["#/demo-failure", "social-engine-failure-v02.png"],
  ["#/scores", "social-engine-highscores-v02.png"],
];

const sampleRuns = [
  {
    id: "sample-community-v02",
    date: new Date().toISOString(),
    outcome: "victory",
    title: "Hybrid Victory: Community + Knowledge",
    score: 11280,
    day: 30,
    followers: {
      closeFriends: 7,
      nicheMembers: 312,
      casualFollowers: 830,
      dramaFollowers: 34,
      opportunityContacts: 11,
      realityRelatives: 6,
    },
    trust: 78,
    biggestViralEvent: "Your Linux rant went viral, then became a tutorial.",
    bestRelationship: "Linux Forum Mentor",
    worstContextCollapse: "Golf joke reached coworkers.",
    community: "Barn LAN and Donut Society",
    headline: "Local niche survives the feed by becoming useful on purpose.",
  },
  {
    id: "sample-collapse-v02",
    date: new Date(Date.now() - 86400000).toISOString(),
    outcome: "failure",
    title: "Context Collapse",
    score: 4220,
    day: 23,
    followers: {
      closeFriends: 1,
      nicheMembers: 154,
      casualFollowers: 960,
      dramaFollowers: 401,
      opportunityContacts: 3,
      realityRelatives: 34,
    },
    trust: 18,
    biggestViralEvent: "Blurry camping photo escaped containment.",
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
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
}

await browser.close();
