import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SOCIAL_ENGINE_BASE_URL ?? "http://127.0.0.1:4173/";
const outputPath = path.resolve("PLAYTEST_REPORT_SOCIAL_ENGINE_V05.md");
const projectUrl = "https://merlinforge.substack.com/p/founding-father-ai-a-real-llm-in";
const sourceUrl = "https://github.com/myles-mf/summer-into-ai-2026/tree/main/week-1/founding-father";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  localStorage.setItem("social-engine.contextCollapse.muted.v1", "true");
});
const page = await context.newPage();
const results = [];

await goto("");
results.push(check("Premium title lockup visible", await page.getByText("The Social Engine").isVisible()));
results.push(check("Submission build text visible", await page.getByText("v1.0 submission build").isVisible()));
results.push(check("Old v0.4 public note removed", (await page.getByText("full systems rebuild").count()) === 0));

await page.getByRole("button", { name: "Start Run" }).click();
results.push(check("Six daily action cards visible", (await visibleActionCardCount()) === 6));
results.push(check("Hand refresh button visible", await page.getByRole("button", { name: /Refresh Free/ }).isVisible()));
const handBefore = await page.locator(".action-card strong").allTextContents();
await page.getByRole("button", { name: /Refresh Free/ }).click();
const handAfter = await page.locator(".action-card strong").allTextContents();
results.push(check("Refresh changes the hand", handBefore.join("|") !== handAfter.join("|")));
results.push(check("Fatigue labels shown on cards", (await page.locator(".freshness").count()) === 6));

await goto("#/demo-graph-hover");
results.push(check("Avatar graph renders person avatars", (await page.locator(".person-node-avatar").count()) >= 8));
results.push(check("Inspector is below graph, not overlaying nodes", await page.locator(".node-inspector .person-avatar").first().isVisible()));
const graphLabelState = await graphLabelReport();
results.push(check("Graph labels only reveal focused/active nodes", graphLabelState.visibleCount <= 6));
results.push(check("Visible graph labels do not collide", graphLabelState.overlaps.length === 0));

await goto("#/create");
results.push(check("Actual create-group forecast visible", await page.getByText("Live launch forecast").isVisible()));
results.push(check("Create launch button visible before launch", await page.getByRole("button", { name: "Launch Group" }).isVisible()));
await goto("#/demo-manage-group");
results.push(check("Manage-group state shown after launch/demo state", await page.getByText(/already live/i).isVisible()));

await goto("#/demo-qwen-invitation");
results.push(check("Qwen invitation present", await page.getByText("QWEN FRANKLIN HAS SENT YOU AN INVITATION").isVisible()));
results.push(check("Qwen invitation choices present", (await page.locator('[data-ui="respond"]').count()) === 4));
await assertExternalLink("Visit Founding Father A.I.", projectUrl, "Qwen project link active");
await assertExternalLink("View Source", sourceUrl, "Qwen source link active");

await goto("#/demo-qwen-community");
results.push(check("Founders Society community card visible", await page.getByText("Founders & Future Society").isVisible()));
results.push(check("Founders Society joined-state protected", await page.locator(".guest-community button", { hasText: "JOINED" }).isDisabled()));

await goto("#/demo-qwen-collapse");
results.push(check("Aunt JPEG Qwen collapse present", await page.getByText("AUNT JPEG THINKS QWEN FRANKLIN IS REAL").isVisible()));
results.push(check("Aunt JPEG has five responses", (await page.locator('[data-ui="respond"]').count()) === 5));

const victories = {
  community: "Community Victory",
  viral: "Viral Victory",
  knowledge: "Knowledge Victory",
  relationship: "Relationship Victory",
  creator: "Creator Victory",
  organizer: "Organizer Victory",
  escape: "Escape Victory",
};
for (const [route, expected] of Object.entries(victories)) {
  await goto(`#/demo-victory-${route}`);
  const title = await page.locator(".end-card h2").textContent();
  results.push(check(`${expected} route has correct primary ending`, title?.includes(expected)));
  results.push(check(`${expected} shows completed milestones`, (await page.locator(".ending-explain-grid li").count()) > 0));
  results.push(check(`${expected} shows strategy explanation`, await page.getByText("Different Strategy").isVisible()));
}

const failures = {
  context: "Context Collapse",
  "feed-rot": "Feed Rot",
  unfriended: "Unfriended by Christmas",
  niche: "Niche Capture",
  burnout: "Burnout Spiral",
  "reply-guy": "Reply Guy Singularity",
  algorithm: "Algorithm Dependent",
};
for (const [route, expected] of Object.entries(failures)) {
  await goto(`#/demo-failure-${route}`);
  const body = await page.locator("body").innerText();
  results.push(check(`${expected} route has correct failure`, body.includes(expected)));
  results.push(check(`${expected} does not show contradictory missing collapse`, !body.includes("Worst Context Collapse\nNo context collapse yet")));
  results.push(check(`${expected} uses Failure Cause label`, body.includes("Failure Cause")));
}

await goto("#/credits");
results.push(check("About/Credits competitor card visible", await page.getByText("GUEST SIGNAL FROM THE COMPETITION").isVisible()));
await assertExternalLink("Visit Founding Father A.I.", projectUrl, "Credits project link active");
await assertExternalLink("View Source", sourceUrl, "Credits source link active");

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]) {
  await page.setViewportSize(viewport);
  for (const route of ["#/demo-main", "#/demo-graph-hover", "#/demo-victory-organizer", "#/credits"]) {
    await goto(route);
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(check(`No horizontal overflow at ${viewport.width}x${viewport.height} on ${route}`, overflow <= 1));
    if (route === "#/demo-main") {
      results.push(check(`Six cards visible at ${viewport.width}x${viewport.height}`, (await visibleActionCardCount()) === 6));
    }
  }
}

await browser.close();

const failed = results.filter((result) => !result.pass);
const report = [
  "# Social Engine v0.5 Browser Playtest Report",
  "",
  `Base URL: ${baseUrl}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.map((result) => `- ${result.pass ? "PASS" : "FAIL"}: ${result.name}`),
  "",
  failed.length ? `Failed checks: ${failed.length}` : "All browser checks passed.",
  "",
].join("\n");

await writeFile(outputPath, report, "utf8");
console.log(report);

if (failed.length) {
  process.exit(1);
}

async function goto(route) {
  await page.goto(`${baseUrl.replace(/\/$/, "/")}${route}`, { waitUntil: "networkidle" });
  const title = await page.title();
  if (!title.includes("The Social Engine")) {
    throw new Error(`Expected The Social Engine at ${route}, got "${title}"`);
  }
}

async function assertExternalLink(label, expected, name) {
  const link = page.getByRole("link", { name }).count ? page.getByRole("link", { name: label }).first() : page.locator(`a:has-text("${label}")`).first();
  const href = await link.getAttribute("href");
  const target = await link.getAttribute("target");
  const rel = await link.getAttribute("rel");
  results.push(check(`${name}: href`, href === expected));
  results.push(check(`${name}: new tab`, target === "_blank"));
  results.push(check(`${name}: noopener noreferrer`, rel?.includes("noopener") && rel?.includes("noreferrer")));
}

async function visibleActionCardCount() {
  return page.locator(".action-card").evaluateAll((cards) => {
    const viewport = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };

    return cards.filter((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) {
        return false;
      }

      let bounds = { ...viewport };
      let current = card.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        const clipping = `${style.overflow}${style.overflowX}${style.overflowY}`;
        if (/(hidden|clip|auto|scroll)/.test(clipping)) {
          const currentRect = current.getBoundingClientRect();
          bounds = {
            left: Math.max(bounds.left, currentRect.left),
            top: Math.max(bounds.top, currentRect.top),
            right: Math.min(bounds.right, currentRect.right),
            bottom: Math.min(bounds.bottom, currentRect.bottom),
          };
        }
        current = current.parentElement;
      }

      return (
        rect.left >= bounds.left - 1 &&
        rect.right <= bounds.right + 1 &&
        rect.top >= bounds.top - 1 &&
        rect.bottom <= bounds.bottom + 1
      );
    }).length;
  });
}

async function graphLabelReport() {
  return page.locator(".social-graph .node-label").evaluateAll((labels) => {
    const visible = labels
      .map((label) => {
        const style = window.getComputedStyle(label);
        const rect = label.getBoundingClientRect();
        return {
          text: label.textContent ?? "",
          opacity: Number.parseFloat(style.opacity || "1"),
          visibility: style.visibility,
          display: style.display,
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
        };
      })
      .filter(
        (item) =>
          item.text.trim() &&
          item.opacity > 0.1 &&
          item.visibility !== "hidden" &&
          item.display !== "none" &&
          item.rect.width > 1 &&
          item.rect.height > 1,
      );

    const overlaps = [];
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i].rect;
        const b = visible[j].rect;
        const separated = a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1;
        if (!separated) {
          overlaps.push(`${visible[i].text} / ${visible[j].text}`);
        }
      }
    }

    return { visibleCount: visible.length, overlaps };
  });
}

function check(name, pass) {
  return { name, pass: Boolean(pass) };
}
