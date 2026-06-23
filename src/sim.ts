import {
  ACTIONS,
  COMMUNITIES,
  FEED_EVENTS,
  PLATFORM_NAME,
  RELATIONSHIPS,
  RUN_LENGTH_DAYS,
} from "./data";
import type {
  ActionCard,
  Community,
  CreatedGroup,
  DayReport,
  FeedEvent,
  FollowerKey,
  Followers,
  GameState,
  MetricKey,
  Metrics,
  RelationshipKey,
  RunSummary,
} from "./types";

const METRIC_LIMITS: Record<MetricKey, [number, number]> = {
  reach: [0, 9999],
  trust: [0, 100],
  agency: [0, 100],
  belonging: [0, 100],
  drama: [0, 100],
  burnout: [0, 100],
  heat: [0, 100],
  realityDrift: [0, 100],
  skillCred: [0, 100],
};

const FOLLOWER_LIMITS: Record<FollowerKey, [number, number]> = {
  closeFriends: [0, 99],
  nicheMembers: [0, 9999],
  casualFollowers: [0, 9999],
  dramaFollowers: [0, 9999],
  opportunityContacts: [0, 999],
  realityRelatives: [0, 999],
};

const responseEffects = {
  clarify: {
    title: "Clarified Publicly",
    effects: { trust: 8, drama: -13, heat: -10, burnout: 3, agency: 1 },
    followers: { dramaFollowers: -8 },
  },
  lean: {
    title: "Leaned Into The Moment",
    effects: { reach: 430, drama: 14, heat: 12, trust: -8, agency: 4, burnout: 7 },
    followers: { casualFollowers: 35, dramaFollowers: 24, opportunityContacts: 1 },
  },
  private: {
    title: "Moved It To DMs",
    effects: { trust: 10, belonging: 6, drama: -8, heat: -8, burnout: 2, reach: -80 },
    followers: { closeFriends: 1, dramaFollowers: -5 },
  },
};

export function createInitialState(): GameState {
  return {
    day: 1,
    metrics: {
      reach: 210,
      trust: 68,
      agency: 28,
      belonging: 42,
      drama: 12,
      burnout: 18,
      heat: 16,
      realityDrift: 8,
      skillCred: 20,
    },
    followers: {
      closeFriends: 6,
      nicheMembers: 14,
      casualFollowers: 85,
      dramaFollowers: 3,
      opportunityContacts: 1,
      realityRelatives: 5,
    },
    relationships: Object.fromEntries(RELATIONSHIPS.map((name) => [name, 55])) as Record<
      RelationshipKey,
      number
    >,
    joinedCommunityIds: [],
    lastActionTags: [],
    recentPost: "A quiet hello from the barn.",
    eventLog: ["Created a fresh SignalBarn profile without immediately arguing about printers."],
    biggestViralEvent: "No viral event yet.",
    worstContextCollapse: "No context collapse yet.",
    eventsHosted: 0,
    repairsMade: 0,
    scorePreview: 0,
  };
}

export function getAction(id: string): ActionCard | undefined {
  return ACTIONS.find((action) => action.id === id);
}

export function getCommunity(id: string): Community | undefined {
  return COMMUNITIES.find((community) => community.id === id);
}

export function playAction(state: GameState, actionId: string): GameState {
  const action = getAction(actionId);
  if (!action || action.opens) {
    return state;
  }

  const next = cloneState(state);
  next.lastActionId = action.id;
  next.lastActionTags = [...action.tags];
  next.recentPost = action.title;
  if (action.id === "host-event") {
    next.eventsHosted += 1;
  }
  if (action.id === "apologize" || action.id === "private-message") {
    next.repairsMade += 1;
  }

  applyEffects(next, action.effects);
  applyFollowers(next, action.followers);
  applyRelationships(next, action.relationships);

  if (next.createdGroup && action.tags.includes("community")) {
    next.createdGroup.members += action.id === "recruit-members" ? 18 : 5;
    next.createdGroup.health = clamp(next.createdGroup.health + 4, 0, 100);
  }

  const report = buildDayReport(next, action);
  next.report = report;
  next.eventLog = [`Day ${next.day}: ${report.title}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function joinCommunity(state: GameState, communityId: string): GameState {
  const community = getCommunity(communityId);
  if (!community) {
    return state;
  }
  const next = cloneState(state);
  if (!next.joinedCommunityIds.includes(community.id)) {
    next.joinedCommunityIds.push(community.id);
  }
  next.lastActionId = "join-community";
  next.lastActionTags = ["community", community.tone];
  next.recentPost = `Joined ${community.name}`;
  applyEffects(next, community.joinEffects);
  applyFollowers(next, community.joinFollowers);
  if (community.tone === "healthy") {
    applyRelationships(next, { "Coworker Maya": 2, "Local Admin Carol": 2 });
  } else {
    applyRelationships(next, { "Aunt JPEG": 4, "Uncle Signal": 4, "Coworker Maya": -4 });
  }
  next.report = {
    kind: "feed",
    title: `Joined ${community.name}`,
    body: `${community.hook} Upside: ${community.upside}. Risk: ${community.risk}`,
    effectsText: summarizeEffects(community.joinEffects, community.joinFollowers),
  };
  next.eventLog = [`Day ${next.day}: Joined ${community.name}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function createGroup(state: GameState, group: CreatedGroup): GameState {
  const next = cloneState(state);
  next.createdGroup = group;
  next.lastActionId = "create-group";
  next.lastActionTags = ["community", "builder", group.tone];
  next.recentPost = `Created ${group.name}`;
  applyEffects(next, { agency: 8, belonging: 8, trust: 3, heat: 5, reach: 100 });
  applyFollowers(next, { nicheMembers: 12, casualFollowers: 8 });
  next.report = {
    kind: "feed",
    title: `${group.name} Is Live`,
    body: `The first post is "${group.firstPost}" and the rules say "${group.rules}." Twelve people join, including one who has already asked to be a moderator.`,
    effectsText: summarizeEffects(
      { agency: 8, belonging: 8, trust: 3, heat: 5, reach: 100 },
      { nicheMembers: 12, casualFollowers: 8 },
    ),
  };
  next.eventLog = [`Day ${next.day}: Created ${group.name}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function resolveReport(
  state: GameState,
  response?: keyof typeof responseEffects,
): GameState {
  const next = cloneState(state);
  if (response) {
    const choice = responseEffects[response];
    applyEffects(next, choice.effects);
    applyFollowers(next, choice.followers);
    next.eventLog = [`Day ${next.day}: ${choice.title}`, ...next.eventLog].slice(0, 6);
    if (response === "clarify" || response === "private") {
      next.repairsMade += 1;
    }
  }
  next.report = undefined;
  return advanceDay(next);
}

export function advanceDay(state: GameState): GameState {
  const next = cloneState(state);
  const failure = checkFailure(next);
  if (failure) {
    next.summary = buildSummary(next, "failure", failure);
    return next;
  }
  if (next.day >= RUN_LENGTH_DAYS) {
    next.summary = buildSummary(next, "victory", pickVictoryTitle(next));
    return next;
  }
  next.day += 1;
  applyEffects(next, { drama: -1, heat: -1, burnout: 1 });
  next.scorePreview = calculateScore(next);
  return next;
}

export function calculateScore(state: GameState): number {
  const m = state.metrics;
  const f = state.followers;
  const communityBonus =
    state.joinedCommunityIds.length * 120 + (state.createdGroup ? state.createdGroup.members * 9 : 0);
  const relationshipAverage =
    Object.values(state.relationships).reduce((sum, value) => sum + value, 0) /
    Object.values(state.relationships).length;
  const score =
    m.reach * 0.22 +
    m.trust * 32 +
    m.agency * 34 +
    m.belonging * 30 +
    m.skillCred * 38 +
    f.closeFriends * 140 +
    f.nicheMembers * 8 +
    f.casualFollowers * 2 +
    f.opportunityContacts * 180 +
    relationshipAverage * 12 +
    state.eventsHosted * 260 +
    state.repairsMade * 110 +
    communityBonus -
    m.drama * 24 -
    m.burnout * 23 -
    m.realityDrift * 28 -
    f.dramaFollowers * 4;
  return Math.max(0, Math.round(score));
}

export function createDemoState(kind: "main" | "viral" | "collapse" | "victory" | "failure"): GameState {
  const state = createInitialState();
  state.joinedCommunityIds = ["linux-forum", "bigfoot-field"];
  state.createdGroup = {
    name: "Barn LAN and Donut Society",
    premise: "Homelab hobby night",
    tone: "welcoming",
    rules: "no link spam",
    firstPost: "Bring one question and one snack.",
    members: 74,
    health: 76,
  };
  applyEffects(state, {
    reach: 980,
    trust: 10,
    agency: 28,
    belonging: 24,
    skillCred: 30,
    drama: 18,
    heat: 22,
  });
  applyFollowers(state, {
    nicheMembers: 140,
    casualFollowers: 330,
    opportunityContacts: 5,
    dramaFollowers: 18,
  });
  state.recentPost = "Post a Linux tutorial";
  state.eventLog = [
    "Day 12: Your tutorial helped someone unbrick a laptop.",
    "Day 11: Aunt JPEG posted a lighthouse theory.",
    "Day 10: Hosted a tiny meetup with donuts.",
  ];
  state.day = 12;
  state.scorePreview = calculateScore(state);

  if (kind === "viral") {
    state.report = {
      kind: "viral",
      title: "Your Linux Rant Went Viral",
      body: "The thread escaped the Linux Forum, gained three job leads, and convinced Aunt JPEG that Linux is a county ordinance.",
      effectsText: ["+1200 Reach", "+1 Opportunity Contact", "+16 Drama", "+13 Algorithm Heat"],
      responseRequired: true,
    };
    state.biggestViralEvent = "Your Linux rant went viral.";
  }

  if (kind === "collapse") {
    applyEffects(state, { drama: 34, heat: 28, trust: -18, realityDrift: 12 });
    state.report = {
      kind: "collapse",
      title: "Context Collapse: Golf Joke Reaches Coworkers",
      body: "The Golf Swing Lab laughed. Coworker Maya did not. Uncle Signal thinks the sand trap is a metaphor.",
      effectsText: ["-12 Trust", "+22 Drama", "+18 Algorithm Heat", "Coworker Maya -10"],
      responseRequired: true,
    };
    state.worstContextCollapse = "Golf joke reached coworkers and relatives at once.";
  }

  if (kind === "victory") {
    applyEffects(state, { trust: 16, agency: 24, belonging: 22, skillCred: 24, drama: -10, heat: -8 });
    state.day = RUN_LENGTH_DAYS;
    state.eventsHosted = 4;
    state.summary = buildSummary(state, "victory", "Hybrid Victory: Community Teacher");
  }

  if (kind === "failure") {
    applyEffects(state, { trust: -60, drama: 80, burnout: 72, heat: 65, realityDrift: 34 });
    applyFollowers(state, { dramaFollowers: 380, closeFriends: -5 });
    state.day = 23;
    state.summary = buildSummary(state, "failure", "Context Collapse");
  }

  return state;
}

function buildDayReport(state: GameState, action: ActionCard): DayReport {
  const contextCollapseRisk =
    state.metrics.heat * 0.34 +
    state.metrics.drama * 0.32 +
    state.metrics.realityDrift * 0.18 +
    (action.tags.includes("context") ? 18 : 0) +
    (action.tags.includes("argument") ? 12 : 0);
  const viralChance =
    action.viralPotential +
    state.metrics.heat * 0.18 +
    state.metrics.drama * 0.08 +
    (state.joinedCommunityIds.length + (state.createdGroup ? 1 : 0)) * 2;
  const roll = Math.random() * 100;

  if (roll < Math.min(38, viralChance)) {
    const viralGain = 420 + Math.round(state.metrics.heat * 6 + action.viralPotential * 18);
    const report: DayReport = {
      kind: "viral",
      title: `${action.title} Escapes The Barn`,
      body: `SignalBarn pushes it beyond the intended room. Opportunity knocks, then Cousin Reply Guy knocks louder.`,
      effectsText: summarizeEffects(
        { reach: viralGain, drama: 12, heat: 12, burnout: 6, agency: 4 },
        { casualFollowers: 32, dramaFollowers: 18, opportunityContacts: 1 },
      ),
      responseRequired: true,
    };
    applyEffects(state, { reach: viralGain, drama: 12, heat: 12, burnout: 6, agency: 4 });
    applyFollowers(state, { casualFollowers: 32, dramaFollowers: 18, opportunityContacts: 1 });
    state.biggestViralEvent = report.title;
    return report;
  }

  if (roll < Math.min(32, contextCollapseRisk) && state.day > 2) {
    const report: DayReport = {
      kind: "collapse",
      title: "Context Collapse: The Wrong Room Found It",
      body: "A post meant for one circle arrives in another with all the nuance sanded off.",
      effectsText: summarizeEffects(
        { trust: -10, drama: 16, heat: 13, burnout: 8 },
        { dramaFollowers: 15, closeFriends: -1 },
      ),
      responseRequired: true,
    };
    applyEffects(state, { trust: -10, drama: 16, heat: 13, burnout: 8 });
    applyFollowers(state, { dramaFollowers: 15, closeFriends: -1 });
    state.worstContextCollapse = report.title;
    return report;
  }

  const matchingEvents = FEED_EVENTS.filter((event) =>
    event.tags.some((tag) => action.tags.includes(tag)),
  );
  const eventPool = matchingEvents.length ? matchingEvents : FEED_EVENTS;
  const event = sample(eventPool);
  applyFeedEvent(state, event);
  return {
    kind: "feed",
    title: event.title,
    body: event.body,
    effectsText: summarizeEffects(event.effects, event.followers),
  };
}

function applyFeedEvent(state: GameState, event: FeedEvent): void {
  applyEffects(state, event.effects);
  applyFollowers(state, event.followers);
  applyRelationships(state, event.relationships);
  if (event.tags.includes("context")) {
    state.worstContextCollapse = event.title;
  }
}

function applyEffects(state: GameState, effects: Partial<Metrics> = {}): void {
  for (const [key, value] of Object.entries(effects) as [MetricKey, number][]) {
    const [min, max] = METRIC_LIMITS[key];
    state.metrics[key] = clamp(state.metrics[key] + value, min, max);
  }
}

function applyFollowers(state: GameState, followers: Partial<Followers> = {}): void {
  for (const [key, value] of Object.entries(followers) as [FollowerKey, number][]) {
    const [min, max] = FOLLOWER_LIMITS[key];
    state.followers[key] = clamp(state.followers[key] + value, min, max);
  }
}

function applyRelationships(
  state: GameState,
  relationships: Partial<Record<RelationshipKey, number>> = {},
): void {
  for (const [name, value] of Object.entries(relationships) as [RelationshipKey, number][]) {
    state.relationships[name] = clamp(state.relationships[name] + value, 0, 100);
  }
}

function checkFailure(state: GameState): string | undefined {
  const m = state.metrics;
  const f = state.followers;
  const replyGuy = state.relationships["Cousin Reply Guy"];
  if (m.burnout >= 96) return "Burnout Spiral";
  if (m.trust <= 8 && m.drama >= 72) return "Context Collapse";
  if (m.reach > 2500 && m.trust < 22) return "Feed Rot";
  if (f.closeFriends <= 1 || state.relationships["Old Friend Nate"] <= 8) return "Unfriended by Christmas";
  if (m.realityDrift >= 82 && f.realityRelatives > f.nicheMembers * 0.5) return "Niche Capture";
  if (replyGuy <= 8 && f.dramaFollowers > f.casualFollowers * 0.65) return "Reply Guy Singularity";
  if (m.heat >= 92 && m.agency < 35) return "Algorithm Dependent";
  return undefined;
}

function pickVictoryTitle(state: GameState): string {
  const m = state.metrics;
  const f = state.followers;
  const paths: string[] = [];
  if ((state.createdGroup && state.createdGroup.health >= 65) || (m.belonging >= 72 && m.trust >= 55)) {
    paths.push("Community");
  }
  if (m.reach >= 2200 && m.trust >= 35 && m.burnout < 82) {
    paths.push("Viral");
  }
  if (m.skillCred >= 72 && m.trust >= 45) {
    paths.push("Knowledge");
  }
  if (averageRelationship(state) >= 62 && f.closeFriends >= 5) {
    paths.push("Relationship");
  }
  if (f.opportunityContacts >= 8 && m.agency >= 62) {
    paths.push("Creator");
  }
  if (state.eventsHosted >= 3 && m.agency >= 55 && m.belonging >= 55) {
    paths.push("Organizer");
  }
  if (m.heat <= 35 && m.burnout <= 45 && m.agency >= 55 && m.belonging >= 55) {
    paths.push("Escape");
  }
  if (!paths.length) {
    paths.push(m.trust > m.drama ? "Survivor" : "Barely Offline");
  }
  return paths.length > 1 ? `Hybrid Victory: ${paths.slice(0, 2).join(" + ")}` : `${paths[0]} Victory`;
}

function buildSummary(
  state: GameState,
  outcome: "victory" | "failure",
  title: string,
): RunSummary {
  const score = calculateScore(state);
  const bestRelationship = Object.entries(state.relationships).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Nobody";
  const joinedNames = state.joinedCommunityIds
    .map((id) => getCommunity(id)?.name)
    .filter(Boolean)
    .join(", ");
  const community = state.createdGroup?.name ?? joinedNames ?? "No stable community";
  return {
    id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
    date: new Date().toISOString(),
    outcome,
    title,
    score,
    day: state.day,
    followers: { ...state.followers },
    trust: state.metrics.trust,
    biggestViralEvent: state.biggestViralEvent,
    bestRelationship,
    worstContextCollapse: state.worstContextCollapse,
    community: community || "No stable community",
    headline: makeHeadline(state, outcome, title),
  };
}

function makeHeadline(state: GameState, outcome: "victory" | "failure", title: string): string {
  if (outcome === "failure") {
    return `${PLATFORM_NAME} user discovers every audience can fit in one terrible room.`;
  }
  if (title.includes("Community")) {
    return "Local niche survives the feed by becoming useful on purpose.";
  }
  if (title.includes("Viral")) {
    return "Post escapes containment and somehow brings back opportunities.";
  }
  if (title.includes("Escape")) {
    return "User builds enough direct ties to stop feeding the machine daily.";
  }
  if (state.eventsHosted >= 3) {
    return "Online thread becomes real chairs, real snacks, and no ratio.";
  }
  return "Small-town user finds the people, keeps most of the plot.";
}

function summarizeEffects(effects: Partial<Metrics> = {}, followers: Partial<Followers> = {}): string[] {
  const metricText = Object.entries(effects).map(([key, value]) => formatDelta(labelMetric(key), value));
  const followerText = Object.entries(followers).map(([key, value]) =>
    formatDelta(labelFollower(key), value),
  );
  return [...metricText, ...followerText].filter(Boolean);
}

function formatDelta(label: string, value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} ${label}`;
}

function labelMetric(key: string): string {
  const labels: Record<string, string> = {
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
  return labels[key] ?? key;
}

function labelFollower(key: string): string {
  const labels: Record<string, string> = {
    closeFriends: "Close Friends",
    nicheMembers: "Niche Members",
    casualFollowers: "Casual Followers",
    dramaFollowers: "Drama Followers",
    opportunityContacts: "Opportunity Contacts",
    realityRelatives: "Reality-Friction Relatives",
  };
  return labels[key] ?? key;
}

function averageRelationship(state: GameState): number {
  const values = Object.values(state.relationships);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    metrics: { ...state.metrics },
    followers: { ...state.followers },
    relationships: { ...state.relationships },
    joinedCommunityIds: [...state.joinedCommunityIds],
    createdGroup: state.createdGroup ? { ...state.createdGroup } : undefined,
    lastActionTags: [...state.lastActionTags],
    eventLog: [...state.eventLog],
    report: state.report ? { ...state.report, effectsText: [...state.report.effectsText] } : undefined,
    summary: state.summary ? { ...state.summary, followers: { ...state.summary.followers } } : undefined,
  };
}

function sample<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
