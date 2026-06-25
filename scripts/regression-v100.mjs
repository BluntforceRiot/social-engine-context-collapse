import * as esbuild from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outDir = path.resolve(".tmp-regression-v100");
const bundlePath = path.join(outDir, "sim-bundle.mjs");
const reportPath = path.resolve("REGRESSION_REPORT_SOCIAL_ENGINE_V100.md");

const METRIC_LABELS = {
  reach: "Reach",
  trust: "Trust",
  agency: "Agency",
  belonging: "Belonging",
  drama: "Drama",
  burnout: "Burnout",
  heat: "Algorithm Heat",
  realityDrift: "Reality Drift",
  skillCred: "Skill Cred",
};

const FOLLOWER_LABELS = {
  closeFriends: "Close Friends",
  nicheMembers: "Niche Members",
  casualFollowers: "Casual Followers",
  dramaFollowers: "Drama Followers",
  opportunityContacts: "Opportunity Contacts",
  realityRelatives: "Reality-Friction Relatives",
};

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await esbuild.build({
  entryPoints: ["src/sim.ts"],
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "silent",
});

const sim = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);
const results = [];

results.push(check("Initial scorePreview equals calculated score", () => {
  const state = sim.createInitialState();
  return state.scorePreview === sim.calculateScore(state) && state.scorePreview > 0;
}));

results.push(check("Community join report shows actual clamped deltas", () => {
  const before = sim.createInitialState();
  before.metrics.skillCred = 95;
  before.metrics.trust = 90;
  before.metrics.agency = 80;
  const after = sim.joinCommunity(before, "linux-forum");
  return reportMatchesStateDelta(before, after, after.report, { relationships: false });
}));

results.push(check("Create Group report shows actual clamped deltas", () => {
  const before = sim.createInitialState();
  before.metrics.skillCred = 92;
  before.metrics.agency = 88;
  const after = sim.createGroup(before, {
    name: "Truthful Test Room",
    premise: "Local creator circle",
    tone: "technical",
    rules: "cite your sources",
    firstPost: "What are you building this week?",
    members: 0,
    health: 0,
  });
  return reportMatchesStateDelta(before, after, after.report, { relationships: false });
}));

results.push(check("Create Group forecast shows actual clamped launch deltas", () => {
  const before = sim.createInitialState();
  before.metrics.trust = 90;
  before.metrics.agency = 91;
  before.metrics.skillCred = 94;
  const premise = "Local creator circle";
  const tone = "technical";
  const rules = "cite your sources";
  const firstPost = "What are you building this week?";
  const forecast = sim.getGroupLaunchForecast(before, premise, tone, rules, firstPost);
  const after = sim.createGroup(before, {
    name: "Forecast Truth Room",
    premise,
    tone,
    rules,
    firstPost,
    members: 0,
    health: 0,
  });
  const parsed = parseEffects(forecast.effectsText);
  const deltas = diffState(before, after);
  return (
    parsed.get("Trust") === deltas.metrics.trust &&
    parsed.get("Agency") === deltas.metrics.agency &&
    parsed.get("Skill Cred") === deltas.metrics.skillCred &&
    !forecast.effectsText.some((item) => item.includes("+7 Trust"))
  );
}));

results.push(check("Context-collapse demo has no duplicated or nonexistent follower summary", () => {
  const state = sim.createDemoState("collapse");
  const text = state.report.effectsText.join("|");
  return (
    !state.report.followerBreakdown &&
    text.includes("+12 Drama Followers") &&
    !text.includes("+15 Drama Followers") &&
    !text.includes("-1 Close Friend")
  );
}));

results.push(check("Viral demo uses one authoritative effects list", () => {
  const state = sim.createDemoState("viral");
  const text = state.report.effectsText.join("|");
  return !state.report.followerBreakdown && text.includes("+54 Casual Followers") && text.includes("+28 Drama Followers");
}));

results.push(check("Repeated risky actions scale benefits without reducing hazards", () => {
  const freshBefore = sim.createInitialState();
  freshBefore.day = 10;
  const repeatedBefore = sim.createInitialState();
  repeatedBefore.day = 10;
  repeatedBefore.actionUseDays["blurry-camping-photo"] = [6, 7, 8];

  const freshAfter = withRandom(0.99, () => sim.playAction(freshBefore, "blurry-camping-photo"));
  const repeatedAfter = withRandom(0.99, () => sim.playAction(repeatedBefore, "blurry-camping-photo"));
  const fresh = diffState(freshBefore, freshAfter);
  const repeated = diffState(repeatedBefore, repeatedAfter);

  return (
    repeated.metrics.reach < fresh.metrics.reach &&
    repeated.metrics.belonging < fresh.metrics.belonging &&
    repeated.followers.nicheMembers < fresh.followers.nicheMembers &&
    repeated.metrics.drama === fresh.metrics.drama &&
    repeated.metrics.heat === fresh.metrics.heat &&
    repeated.metrics.realityDrift === fresh.metrics.realityDrift &&
    repeated.followers.dramaFollowers === fresh.followers.dramaFollowers &&
    repeated.followers.realityRelatives === fresh.followers.realityRelatives
  );
}));

results.push(check("High harmful meters do not get saturation padding", () => {
  const state = sim.createInitialState();
  state.metrics.drama = 80;
  state.metrics.heat = 80;
  state.metrics.realityDrift = 80;
  const forecast = sim.getGroupLaunchForecast(
    state,
    "Bigfoot weird room",
    "chaotic",
    "open rules",
    "hello everyone",
  );
  return (
    forecast.effectDeltas.drama === 6 &&
    forecast.effectDeltas.heat === 13 &&
    forecast.effectDeltas.realityDrift === 6
  );
}));

results.push(check("Repeated action milestone credit scales with freshness", () => {
  const freshBefore = sim.createInitialState();
  freshBefore.day = 10;
  const repeatedBefore = sim.createInitialState();
  repeatedBefore.day = 10;
  repeatedBefore.actionUseDays["tiny-build-log"] = [6, 7, 8];

  const freshAfter = withRandom(0.99, () => sim.playAction(freshBefore, "tiny-build-log"));
  const repeatedAfter = withRandom(0.99, () => sim.playAction(repeatedBefore, "tiny-build-log"));

  return (
    freshAfter.pathMilestones.creator.buildLogsPosted === 1 &&
    repeatedAfter.pathMilestones.creator.buildLogsPosted === 0.5 &&
    repeatedAfter.pathMilestones.creator.usefulOutputsPublished < freshAfter.pathMilestones.creator.usefulOutputsPublished
  );
}));

results.push(check("Create forecast UI uses actual launch forecast helper", async () => {
  const main = await readFile("src/main.ts", "utf8");
  return main.includes("getGroupLaunchForecast(game") && !main.includes("Object.entries(forecast.effects).map");
}));

results.push(check("Hybrid closest alternative excludes credited primary and secondary paths", () => {
  const demos = [
    "victoryCommunity",
    "victoryViral",
    "victoryKnowledge",
    "victoryRelationship",
    "victoryCreator",
    "victoryOrganizer",
    "victoryEscape",
  ].map((kind) => sim.createDemoState(kind));
  return demos.every((state) => {
    const summary = state.summary;
    if (!summary?.secondaryEnding) return true;
    return (
      summary.strongestRemainingPath !== summary.primaryEnding &&
      summary.strongestRemainingPath !== summary.secondaryEnding
    );
  });
}));

results.push(check("Mandatory milestone summary excludes optional milestones", () => {
  const state = sim.createDemoState("victory");
  const milestones = sim.getVictoryMilestones(state);
  return state.summary.completedMilestones.every((label) => {
    const [pathName, ...labelParts] = label.split(": ");
    const milestoneLabel = labelParts.join(": ");
    return milestones.some((item) => item.path === pathName && item.label === milestoneLabel && item.mandatory);
  });
}));

results.push(check("Package verifier leaves verification report adjacent to the exact tested zip", async () => {
  const script = await readFile("scripts/package-v051-review.mjs", "utf8");
  return script.includes("Verification report placement: adjacent to the zip") && !script.includes("await cp(verifyReportPath");
}));

const settledResults = await Promise.all(results);
const report = [
  "# Social Engine v1.0 Regression Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...settledResults.map((result) => `- ${result.pass ? "PASS" : "FAIL"}: ${result.name}${result.error ? ` (${result.error})` : ""}`),
  "",
  settledResults.every((result) => result.pass) ? "All regression checks passed." : "Regression failures present.",
  "",
].join("\n");

await writeFile(reportPath, report, "utf8");
await rm(outDir, { recursive: true, force: true });
console.log(report);

if (settledResults.some((result) => !result.pass)) {
  process.exit(1);
}

function check(name, fn) {
  try {
    const value = fn();
    if (value && typeof value.then === "function") {
      return value
        .then((pass) => ({ name, pass: Boolean(pass) }))
        .catch((error) => ({ name, pass: false, error: error.message }));
    }
    return { name, pass: Boolean(value) };
  } catch (error) {
    return { name, pass: false, error: error.message };
  }
}

function reportMatchesStateDelta(before, after, report, options = {}) {
  if (!report || report.followerBreakdown) return false;
  const parsed = parseEffects(report.effectsText);
  const deltas = diffState(before, after);
  const expected = new Map();
  for (const [key, value] of Object.entries(deltas.metrics)) {
    expected.set(METRIC_LABELS[key], value);
  }
  for (const [key, value] of Object.entries(deltas.followers)) {
    expected.set(FOLLOWER_LABELS[key], value);
  }
  if (options.relationships) {
    for (const [key, value] of Object.entries(deltas.relationships)) {
      expected.set(key, value);
    }
  }
  return [...expected.entries()].every(([label, value]) => parsed.get(label) === value);
}

function parseEffects(items) {
  const parsed = new Map();
  for (const item of items) {
    const match = item.match(/^([+-]?\d+) (.+)$/);
    if (!match) continue;
    parsed.set(match[2], Number(match[1]));
  }
  return parsed;
}

function diffState(before, after) {
  return {
    metrics: diffRecord(before.metrics, after.metrics),
    followers: diffRecord(before.followers, after.followers),
    relationships: diffRecord(before.relationships, after.relationships),
  };
}

function diffRecord(before, after) {
  const deltas = {};
  for (const key of Object.keys(after)) {
    const delta = after[key] - before[key];
    if (delta) {
      deltas[key] = delta;
    }
  }
  return deltas;
}

function withRandom(value, fn) {
  const oldRandom = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = oldRandom;
  }
}
