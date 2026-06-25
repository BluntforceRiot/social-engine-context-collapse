import * as esbuild from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(".tmp-balance-v05");
const bundlePath = path.join(outDir, "sim-bundle.mjs");
const reportPath = path.resolve("BALANCE_REPORT_SOCIAL_ENGINE_V05.md");

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

const STRATEGIES = [
  strategy("random", ["technology", "community", "creator"], {}, []),
  strategy("knowledge", ["technology", "coding", "history"], {
    "share-tip": 11,
    "ask-linux-help": 10,
    "ask-expert": 10,
    "pin-useful-thread": 11,
    "publish-followup-explainer": 9,
    "retro-repair": 7,
    "tiny-build-log": 4,
  }, ["inviteQwenGuestPost", "joinSociety", "tutorial", "pinMediaLiteracy", "pin", "clarify", "private", "mute"]),
  strategy("community", ["community", "local", "hobby"], {
    "join-community": 12,
    "create-group": 11,
    "recruit-members": 10,
    "moderate-thread": 11,
    "delegate-moderation": 11,
    "celebrate-win": 8,
    "group-challenge": 9,
    "invite-followers-room": 7,
  }, ["joinSociety", "friend", "private", "pin", "clarify", "mute", "apologize"]),
  strategy("relationship", ["relationships", "hobby", "local"], {
    "private-message": 12,
    "dm-person": 12,
    "apologize": 10,
    "refuse-argue": 8,
    "block-mute": 7,
    "celebrate-win": 6,
    "weekend-offline": 6,
  }, ["private", "apologize", "friend", "clarify", "moveQwenDms", "explainSynthetic", "mute"]),
  strategy("creator", ["creator", "coding", "technology"], {
    "tiny-build-log": 12,
    "turn-viral-project": 11,
    "contact-opportunity-lead": 10,
    "share-tip": 7,
    "signal-boost": 7,
    "ask-expert": 6,
    "convert-attention-list": 8,
  }, ["tutorial", "pin", "clarify", "inviteQwenGuestPost", "private", "mute"]),
  strategy("organizer", ["local", "community", "relationships"], {
    "create-group": 10,
    "join-community": 8,
    "host-event": 12,
    "small-town-meetup": 12,
    "group-challenge": 11,
    "recruit-members": 7,
    "delegate-moderation": 8,
    "moderate-thread": 7,
  }, ["friend", "private", "clarify", "apologize", "pin", "mute"]),
  strategy("escape", ["relationships", "local", "community"], {
    "weekend-offline": 12,
    "touch-grass": 11,
    "schedule-recovery": 10,
    "block-mute": 10,
    "refuse-argue": 9,
    "private-message": 9,
    "dm-person": 9,
    "take-community-independent": 100,
  }, ["logoff", "mute", "private", "friend", "declineQwen", "moveQwenDms", "muteQwenThread"]),
  strategy("skilled viral", ["creator", "coding", "weird"], {
    "post-joke": 9,
    "reply-thread": 8,
    "signal-boost": 7,
    "convert-attention-list": 14,
    "turn-viral-project": 14,
    "invite-followers-room": 12,
    "publish-followup-explainer": 11,
    "delegate-moderation": 10,
    "contact-opportunity-lead": 12,
    "schedule-recovery": 8,
  }, ["tutorial", "pin", "clarify", "private", "delete", "mute", "inviteQwenGuestPost", "shareQwenDemo"]),
  strategy("reckless viral", ["weird", "creator", "hobby"], {
    "post-joke": 14,
    "reply-thread": 15,
    "blurry-camping-photo": 13,
    "correct-ai-image": 8,
    "signal-boost": 4,
    "recruit-members": 3,
  }, ["lean", "shareQwenDemo", "letProjectSpeak", "clarify"]),
];

const FAILURE_STRESS = [
  strategy("stress context collapse", ["weird", "relationships", "hobby"], {
    "post-joke": 15,
    "reply-thread": 14,
    "blurry-camping-photo": 13,
    "correct-ai-image": 10,
  }, ["lean"]),
  strategy("stress burnout", ["creator", "weird", "technology"], {
    "reply-thread": 12,
    "post-joke": 12,
    "blurry-camping-photo": 10,
    "correct-ai-image": 10,
  }, ["lean", "tutorial"]),
  strategy("stress niche capture", ["weird", "history", "hobby"], {
    "blurry-camping-photo": 15,
    "correct-ai-image": 3,
    "post-joke": 9,
    "join-community": 4,
  }, ["lean", "shareQwenDemo"]),
  strategy("stress unfriended", ["weird", "relationships", "creator"], {
    "reply-thread": 14,
    "post-joke": 12,
    "delete-post": 1,
  }, ["lean"]),
];

const matrix = [];
for (const config of STRATEGIES) {
  const runs = [];
  for (let seed = 1; seed <= 500; seed += 1) {
    runs.push(runPolicy(config, seed + stableNameSeed(config.name) * 10000));
  }
  matrix.push(summarizeRuns(config.name, runs));
}

const stressRuns = [];
for (const config of FAILURE_STRESS) {
  for (let seed = 1; seed <= 120; seed += 1) {
    stressRuns.push(runPolicy(config, seed + stableNameSeed(config.name) * 10000));
  }
}
const stressSummary = summarizeRuns("targeted failure stress", stressRuns);

const initial = sim.getVictoryPathProgress(sim.createInitialState());
const checks = acceptanceChecks(matrix, stressSummary, initial);
const report = renderReport(matrix, stressSummary, initial, checks);
await writeFile(reportPath, report, "utf8");
console.log(report);

if (checks.some((check) => !check.pass)) {
  process.exit(1);
}

function strategy(name, interests, weights, responses) {
  return { name, interests, weights, responses };
}

function runPolicy(config, seed) {
  const restoreRandom = seedRandom(seed);
  let state = sim.createInitialState(config.interests);
  const actions = [];
  const responses = [];

  for (let turn = 0; turn < 80 && !state.summary; turn += 1) {
    if (state.report) {
      const response = chooseResponse(state.report, config.responses, seed + turn);
      responses.push(response ?? "continue");
      state = sim.resolveReport(state, response);
      continue;
    }

    const hand = sim.getDailyActionHand(state);
    const action = chooseAction(hand, config, state, seed + turn * 17);
    actions.push(action?.id ?? "none");
    if (!action) break;
    if (action.opens === "community") {
      state = sim.joinCommunity(state, chooseCommunity(state, config));
    } else if (action.opens === "create") {
      state = sim.createGroup(state, {
        name: `${config.name} room ${seed % 1000}`,
        premise: config.name.includes("organizer") ? "Small-town project board" : "Local creator circle",
        tone: config.name.includes("community") || config.name.includes("organizer") ? "welcoming" : "technical",
        rules: "no argument spirals",
        firstPost: config.name.includes("organizer") ? "Local meetup roll call." : "What are you building this week?",
        members: 0,
        health: 0,
      });
    } else {
      state = sim.playAction(state, action.id);
    }
  }
  if (state.report && !state.summary) {
    state = sim.resolveReport(state, chooseResponse(state.report, config.responses, seed + 999));
  }
  restoreRandom();
  return {
    summary: state.summary,
    state,
    actions,
    responses,
    paths: sim.getVictoryPathProgress(state),
  };
}

function chooseAction(hand, config, state, salt) {
  if (config.name === "random") {
    return hand[Math.abs(salt) % hand.length];
  }
  const scored = hand.map((action, index) => {
    const noOpPenalty =
      (action.id === "join-community" && state.joinedCommunityIds.length >= 5) ||
      (action.id === "create-group" && state.createdGroup)
        ? -100
        : 0;
    const explicit = (config.weights[action.id] ?? 0) + noOpPenalty;
    const tagScore = action.tags.reduce((sum, tag) => sum + (config.weights[`tag:${tag}`] ?? 0), 0);
    const freshness = sim.getActionFreshness ? sim.getActionFreshness({ actionUseDays: {}, day: 1 }, action.id).multiplier : 1;
    return { action, score: explicit + tagScore + tieBreak(action.id, salt + index) + freshness * 0.01 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.action ?? hand[0];
}

function chooseResponse(report, preferred, salt) {
  const options = report.responseOptions ?? [];
  if (!report.responseRequired) return undefined;
  for (const response of preferred) {
    if (options.includes(response)) return response;
  }
  return options[Math.abs(salt) % options.length];
}

function chooseCommunity(state, config) {
  if (state.qwenSocietyUnlocked && !state.joinedCommunityIds.includes("founders-future-society")) {
    return "founders-future-society";
  }
  const preferred = config.name.includes("organizer")
    ? ["local-events", "coding-circle", "linux-forum"]
    : config.name.includes("knowledge")
      ? ["linux-forum", "coding-circle", "vintage-computer"]
      : config.name.includes("community")
        ? ["coding-circle", "linux-forum", "local-events", "vintage-computer", "golf-swing-lab"]
        : config.name.includes("reckless") || config.name.includes("niche")
          ? ["miracle-jpeg", "bigfoot-field", "saucer-dawn", "flat-horizon"]
          : ["vintage-computer", "linux-forum", "coding-circle"];
  return preferred.find((id) => !state.joinedCommunityIds.includes(id)) ?? preferred[0];
}

function summarizeRuns(name, runs) {
  const ended = runs.filter((run) => run.summary);
  const failures = ended.filter((run) => run.summary.outcome === "failure");
  const hardFailures = failures.filter((run) => run.summary.failureCause !== "No victory path qualified");
  const endings = countBy(ended, (run) => run.summary.title);
  const primary = countBy(ended, (run) => run.summary.primaryEnding);
  const failuresByType = countBy(failures, (run) => run.summary.failureCause ?? run.summary.title);
  const hybridRate = ended.length ? ended.filter((run) => run.summary.secondaryEnding).length / ended.length : 0;
  return {
    name,
    runs,
    ended,
    endings,
    primary,
    failuresByType,
    hybridRate,
    failureRate: ended.length ? hardFailures.length / ended.length : 1,
    nonVictoryRate: ended.length ? failures.length / ended.length : 1,
    averages: averageFinals(ended),
    qwenInvitationRate: average(runs.map((run) => Number(run.state.qwenInvitationSeen))),
    contextCollapses: average(runs.map((run) => run.state.pathMilestones.viral.destructiveViralEvents)),
    viralEvents: average(runs.map((run) => run.state.pathMilestones.viral.viralEvents)),
    score: average(ended.map((run) => run.summary.score)),
    actionRepetition: average(runs.map((run) => repetitionScore(run.actions))),
    communityState: {
      joined: average(runs.map((run) => run.state.joinedCommunityIds.length)),
      created: average(runs.map((run) => Number(Boolean(run.state.createdGroup)))),
      createdGroupHealth: average(runs.map((run) => run.state.createdGroup?.health ?? 0)),
      healthyRoomDays: average(runs.map((run) => run.state.pathMilestones.community.healthyGroupDays)),
    },
    pathProgress: Object.fromEntries(
      sim.getVictoryPathProgress(runs[0]?.state ?? sim.createInitialState()).map((path) => [
        path.name,
        average(runs.map((run) => run.paths.find((item) => item.name === path.name)?.value ?? 0)),
      ]),
    ),
  };
}

function averageFinals(ended) {
  const metrics = ["reach", "trust", "agency", "belonging", "drama", "burnout", "heat", "realityDrift", "skillCred"];
  return Object.fromEntries(metrics.map((metric) => [metric, average(ended.map((run) => run.state.metrics[metric]))]));
}

function acceptanceChecks(matrix, stress, initial) {
  const byName = Object.fromEntries(matrix.map((item) => [item.name, item]));
  const intended = {
    knowledge: "Knowledge",
    community: "Community",
    relationship: "Relationship",
    creator: "Creator",
    organizer: "Organizer",
    escape: "Escape",
  };
  const checks = [
    check("All initial paths below 50", initial.every((path) => path.value < 50)),
    check("No initial path begins Rising or Strong", initial.every((path) => !["Rising", "Strong"].includes(path.status))),
  ];
  for (const [name, path] of Object.entries(intended)) {
    const result = byName[name];
    const primaryRate = (result.primary[path] ?? 0) / Math.max(1, result.ended.length);
    const secondaryRate = result.ended.filter((run) => run.summary.primaryEnding === path || run.summary.secondaryEnding === path).length / Math.max(1, result.ended.length);
    checks.push(check(`${name} earns ${path} primary at least 55%`, primaryRate >= 0.55));
    checks.push(check(`${name} includes ${path} primary or secondary at least 75%`, secondaryRate >= 0.75));
  }
  const randomPairs = Object.entries(byName.random.endings).sort((a, b) => b[1] - a[1]);
  checks.push(check("No unordered ending pair dominates random above 40%", (randomPairs[0]?.[1] ?? 0) / 500 <= 0.4));
  checks.push(check("Random hybrid rate between 10% and 40%", byName.random.hybridRate >= 0.1 && byName.random.hybridRate <= 0.4));
  checks.push(check("Focused creator hybrids are special, not automatic", byName.creator.hybridRate <= 0.45));
  checks.push(check("Focused escape hybrids are special, not automatic", byName.escape.hybridRate <= 0.45));
  const skilledViralPrimary = (byName["skilled viral"].primary.Viral ?? 0) / 500;
  checks.push(check("Skilled viral earns Viral-primary victories", skilledViralPrimary >= 0.25 && skilledViralPrimary <= 0.55));
  checks.push(check("Reckless viral fails materially more often", byName["reckless viral"].failureRate >= 0.45 && byName["reckless viral"].failureRate <= 0.8));
  const randomPositive = ["trust", "agency", "belonging", "skillCred"].map((key) => byName.random.averages[key]);
  checks.push(check("Positive metrics do not all average above 90", !randomPositive.every((value) => value > 90)));
  checks.push(check("Multiple failure types are reachable", Object.keys(stress.failuresByType).length >= 4));
  checks.push(check("High-heat play collapses more than relationship play", byName["reckless viral"].contextCollapses > byName.relationship.contextCollapses + 1));
  checks.push(check("Repeat join/create remain impossible", byName.community.communityState.joined <= 5 && byName.community.communityState.created <= 1));
  return checks;
}

function renderReport(matrix, stress, initial, checks) {
  return [
    "# Social Engine v0.5 Balance Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Initial Path Progress",
    "",
    ...initial.map((path) => `- ${path.name}: ${path.value} (${path.status})`),
    "",
    "## Acceptance Checks",
    "",
    ...checks.map((item) => `- ${item.pass ? "PASS" : "FAIL"}: ${item.name}`),
    "",
    "## 500-Seed Strategy Matrix",
    "",
    ...matrix.flatMap(renderSummary),
    "## Targeted Failure Stress",
    "",
    ...renderSummary(stress),
  ].join("\n");
}

function renderSummary(summary) {
  return [
    `### ${summary.name}`,
    "",
    `Runs ended: ${summary.ended.length}/${summary.runs.length}`,
    `Hybrid rate: ${percent(summary.hybridRate)}`,
    `Hard failure rate: ${percent(summary.failureRate)}`,
    `Non-victory rate: ${percent(summary.nonVictoryRate)}`,
    `Average score: ${Math.round(summary.score)}`,
    `Average viral events/run: ${summary.viralEvents.toFixed(2)}`,
    `Average context collapses/run: ${summary.contextCollapses.toFixed(2)}`,
    `Qwen invitation rate: ${percent(summary.qwenInvitationRate)}`,
    `Action repetition score: ${summary.actionRepetition.toFixed(2)}`,
    `Community state: joined rooms ${summary.communityState.joined.toFixed(2)}, created group rate ${summary.communityState.created.toFixed(2)}, created group health ${summary.communityState.createdGroupHealth.toFixed(1)}, healthy room days ${summary.communityState.healthyRoomDays.toFixed(1)}`,
    "",
    "Primary paths:",
    ...Object.entries(summary.primary).sort((a, b) => b[1] - a[1]).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "Ending distribution:",
    ...Object.entries(summary.endings).sort((a, b) => b[1] - a[1]).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "Failure types:",
    ...Object.entries(summary.failuresByType).sort((a, b) => b[1] - a[1]).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "Average final metrics:",
    ...Object.entries(summary.averages).map(([key, value]) => `- ${key}: ${Number(value).toFixed(1)}`),
    "",
    "Average path progress:",
    ...Object.entries(summary.pathProgress).map(([key, value]) => `- ${key}: ${Number(value).toFixed(1)}`),
    "",
  ];
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const key = getter(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}

function repetitionScore(actions) {
  const counts = countBy(actions, (item) => item);
  return Object.values(counts).reduce((sum, value) => sum + Math.max(0, value - 1), 0);
}

function check(name, pass) {
  return { name, pass };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function tieBreak(id, salt) {
  return ((stableNameSeed(id) + salt) % 100) / 1000;
}

function stableNameSeed(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seedRandom(seed) {
  const oldRandom = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return () => {
    Math.random = oldRandom;
  };
}
