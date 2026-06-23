import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("output");

const routes = [
  ["", "social-engine-title-v01.png"],
  ["#/howto", "social-engine-howto-v01.png"],
  ["#/demo-main", "social-engine-main-v01.png"],
  ["#/community", "social-engine-community-choice-v01.png"],
  ["#/create", "social-engine-create-group-v01.png"],
  ["#/demo-viral", "social-engine-viral-event-v01.png"],
  ["#/demo-collapse", "social-engine-context-collapse-v01.png"],
  ["#/demo-victory", "social-engine-victory-v01.png"],
  ["#/demo-failure", "social-engine-failure-v01.png"],
  ["#/scores", "social-engine-highscores-v01.png"],
];

const sampleRuns = [
  {
    id: "sample-community",
    date: new Date().toISOString(),
    outcome: "victory",
    title: "Hybrid Victory: Community + Knowledge",
    score: 8420,
    day: 30,
    followers: {
      closeFriends: 7,
      nicheMembers: 231,
      casualFollowers: 640,
      dramaFollowers: 28,
      opportunityContacts: 9,
      realityRelatives: 5,
    },
    trust: 74,
    biggestViralEvent: "Your Linux rant went viral.",
    bestRelationship: "Linux Forum Mentor",
    worstContextCollapse: "Golf joke reached coworkers.",
    community: "Barn LAN and Donut Society",
    headline: "Local niche survives the feed by becoming useful on purpose.",
  },
  {
    id: "sample-collapse",
    date: new Date(Date.now() - 86400000).toISOString(),
    outcome: "failure",
    title: "Context Collapse",
    score: 3150,
    day: 22,
    followers: {
      closeFriends: 2,
      nicheMembers: 88,
      casualFollowers: 970,
      dramaFollowers: 420,
      opportunityContacts: 2,
      realityRelatives: 31,
    },
    trust: 11,
    biggestViralEvent: "Post Joke escaped the barn.",
    bestRelationship: "Aunt JPEG",
    worstContextCollapse: "The wrong room found it.",
    community: "Blurry Evidence Club",
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
}, sampleRuns);

const page = await context.newPage();

for (const [route, fileName] of routes) {
  const url = `${baseUrl.replace(/\/$/, "/")}${route}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
}

await browser.close();
