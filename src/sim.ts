import {
  ACTIONS,
  COMMUNITIES,
  DEFAULT_STARTING_INTEREST_IDS,
  FEED_EVENTS,
  PLATFORM_NAME,
  QWEN_FRANKLIN_GUEST_BANNER,
  RELATIONSHIPS,
  RUN_LENGTH_DAYS,
  STARTING_INTERESTS,
} from "./data";
import type {
  ActionCard,
  Community,
  CreatedGroup,
  DayReport,
  FeedEvent,
  FeedItem,
  FollowerKey,
  Followers,
  GameState,
  InterestKey,
  MetricKey,
  Metrics,
  PathKey,
  PathMilestoneState,
  RelationshipKey,
  ResponseKey,
  RunSummary,
  VictoryMilestone,
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

const BENEFICIAL_METRICS = new Set<MetricKey>([
  "reach",
  "trust",
  "agency",
  "belonging",
  "skillCred",
]);

const BENEFICIAL_FOLLOWERS = new Set<FollowerKey>([
  "closeFriends",
  "nicheMembers",
  "casualFollowers",
  "opportunityContacts",
]);

const PATH_NAMES: PathKey[] = [
  "Community",
  "Viral",
  "Knowledge",
  "Relationship",
  "Creator",
  "Organizer",
  "Escape",
];

const HAND_SECTIONS = [
  "relationship-community",
  "knowledge-creator",
  "growth-viral",
  "boundary-repair",
  "interest",
  "wildcard",
] as const;

interface AppliedDeltas {
  metrics: Partial<Metrics>;
  followers: Partial<Followers>;
  relationships: Partial<Record<RelationshipKey, number>>;
}

const responseEffects: Record<
  ResponseKey,
  {
    title: string;
    effects: Partial<Metrics>;
    followers: Partial<Followers>;
    affectedNodes: string[];
    feedText: string;
  }
> = {
  clarify: {
    title: "Clarified Publicly",
    effects: { trust: 9, drama: -14, heat: -11, burnout: -2, agency: 1 },
    followers: { dramaFollowers: -9 },
    affectedNodes: ["Coworker Maya", "Concerned Relative"],
    feedText: "A plain-language clarification trims the fire without fully starving it.",
  },
  private: {
    title: "Moved It To DMs",
    effects: { trust: 12, belonging: 7, drama: -9, heat: -9, burnout: -2, reach: -70 },
    followers: { closeFriends: 1, dramaFollowers: -5 },
    affectedNodes: ["Old Friend Nate", "Concerned Relative"],
    feedText: "The public room gets quieter because the real repair moved somewhere human-sized.",
  },
  lean: {
    title: "Leaned Into Reach",
    effects: { reach: 430, drama: 13, heat: 11, trust: -7, agency: 4, burnout: 6 },
    followers: { casualFollowers: 35, dramaFollowers: 24, opportunityContacts: 1 },
    affectedNodes: ["Cousin Reply Guy", "Former Classmate Darren"],
    feedText: "The numbers jump. The room temperature does too.",
  },
  delete: {
    title: "Deleted The Post",
    effects: { drama: -11, heat: -16, reach: -120, trust: 2, burnout: 2 },
    followers: { dramaFollowers: -12, casualFollowers: -4 },
    affectedNodes: ["Local Admin Carol", "Former Classmate Darren"],
    feedText: "Screenshots still wander around, but the main fire loses oxygen.",
  },
  pin: {
    title: "Pinned Context",
    effects: { trust: 7, skillCred: 5, drama: -7, heat: -5, burnout: -2, agency: 2 },
    followers: { nicheMembers: 8, dramaFollowers: -3 },
    affectedNodes: ["Linux Forum Mentor", "Coworker Maya"],
    feedText: "The useful version of the post gets a signpost before the argument eats the room.",
  },
  mute: {
    title: "Muted The Thread",
    effects: { burnout: -10, drama: -9, heat: -8, reach: -55, trust: 1 },
    followers: { dramaFollowers: -9 },
    affectedNodes: ["Cousin Reply Guy"],
    feedText: "The thread keeps twitching somewhere else. You stop donating your nervous system.",
  },
  apologize: {
    title: "Apologized Clearly",
    effects: { trust: 13, drama: -13, heat: -9, burnout: 3, belonging: 3 },
    followers: { dramaFollowers: -6 },
    affectedNodes: ["Old Friend Nate", "Coworker Maya", "Concerned Relative"],
    feedText: "A direct apology does not impress strangers, which is how you know it might be real.",
  },
  friend: {
    title: "Asked A Trusted Friend To Help",
    effects: { trust: 11, belonging: 7, drama: -9, heat: -5, agency: 3 },
    followers: { closeFriends: 1, nicheMembers: 5 },
    affectedNodes: ["Old Friend Nate", "Linux Forum Mentor"],
    feedText: "A steady person explains the missing context and the room remembers breathing.",
  },
  tutorial: {
    title: "Made A Follow-Up Tutorial",
    effects: { skillCred: 11, agency: 7, reach: 180, trust: 4, heat: -2, drama: -3, burnout: -4 },
    followers: { nicheMembers: 14, opportunityContacts: 2 },
    affectedNodes: ["Linux Forum Mentor", "Coworker Maya"],
    feedText: "You turn chaos into a useful artifact. The machine hates how well that works.",
  },
  logoff: {
    title: "Logged Off",
    effects: { burnout: -22, drama: -8, heat: -12, reach: -90, agency: 2 },
    followers: { dramaFollowers: -10, casualFollowers: -4 },
    affectedNodes: ["Old Friend Nate", "Small-Town Neighbor"],
    feedText: "No response becomes the response. The grass renders at full resolution.",
  },
  joinSociety: {
    title: "Joined the Founders & Future Society",
    effects: { skillCred: 8, agency: 5, belonging: 5, reach: 85, heat: 5, drama: 2 },
    followers: { nicheMembers: 20, opportunityContacts: 1 },
    affectedNodes: ["Linux Forum Mentor", "Aunt JPEG", "Uncle Signal"],
    feedText: "The new society is small, useful, and already drafting a constitution for the group chat.",
  },
  shareQwenDemo: {
    title: "Shared the Qwen Franklin Demo",
    effects: { reach: 220, skillCred: 5, heat: 8, drama: 4, realityDrift: 3 },
    followers: { casualFollowers: 20, nicheMembers: 10, dramaFollowers: 5 },
    affectedNodes: ["Linux Forum Mentor", "Coworker Maya", "Aunt JPEG"],
    feedText: "The demo finds builders, history nerds, and one comment thread that badly needs a caption.",
  },
  inviteQwenGuestPost: {
    title: "Invited Qwen Franklin to Guest-Post",
    effects: { skillCred: 9, trust: 4, agency: 4, reach: 120, heat: 5, drama: 2 },
    followers: { nicheMembers: 14, opportunityContacts: 1 },
    affectedNodes: ["Linux Forum Mentor", "Local Admin Carol", "Aunt JPEG"],
    feedText: "A careful educational post lands with charm, citations, and only moderate electricity discourse.",
  },
  declineQwen: {
    title: "Declined Politely",
    effects: { trust: 4, belonging: 2, heat: -2 },
    followers: { closeFriends: 1 },
    affectedNodes: ["Old Friend Nate", "Concerned Relative"],
    feedText: "You keep the crossover in the drafts and earn one quiet nod from the people nearest you.",
  },
  explainSynthetic: {
    title: "Explained Synthetic Characters Calmly",
    effects: { trust: 8, drama: -10, realityDrift: -9, heat: -5, burnout: 2 },
    followers: { dramaFollowers: -6, realityRelatives: -2 },
    affectedNodes: ["Aunt JPEG", "Uncle Signal", "Concerned Relative"],
    feedText: "A plain explanation lands: fictional guest account, real project, no time machine required.",
  },
  moveQwenDms: {
    title: "Moved the Franklin Confusion to DMs",
    effects: { trust: 9, drama: -8, heat: -8, burnout: 1, reach: -45 },
    followers: { closeFriends: 1, dramaFollowers: -4 },
    affectedNodes: ["Aunt JPEG", "Uncle Signal", "Concerned Relative"],
    feedText: "The public thread loses its audience while the family channel gains enough oxygen to think.",
  },
  pinMediaLiteracy: {
    title: "Pinned a Media-Literacy Explanation",
    effects: { trust: 7, skillCred: 7, drama: -7, realityDrift: -8, agency: 3, heat: -3 },
    followers: { nicheMembers: 8, dramaFollowers: -3 },
    affectedNodes: ["Linux Forum Mentor", "Aunt JPEG", "Coworker Maya"],
    feedText: "The pinned note separates character, creator, project, and proof before the thread invents a fourth branch of government.",
  },
  letProjectSpeak: {
    title: "Opened the Credited Project",
    effects: { reach: 80, skillCred: 4, drama: -4, heat: -2, agency: 2 },
    followers: { nicheMembers: 6 },
    affectedNodes: ["Linux Forum Mentor", "Aunt JPEG"],
    feedText: "You open the credited article and let the project context do some careful explaining.",
  },
  muteQwenThread: {
    title: "Muted the Franklin Thread",
    effects: { burnout: -12, drama: -8, heat: -8, reach: -55, trust: 1 },
    followers: { dramaFollowers: -8 },
    affectedNodes: ["Cousin Reply Guy", "Aunt JPEG"],
    feedText: "The argument continues somewhere quieter. Franklin is spared quote-posting for one more day.",
  },
};

export function createInitialState(
  interestIds: InterestKey[] = [...DEFAULT_STARTING_INTEREST_IDS],
): GameState {
  const safeInterestIds = normalizeInterestIds(interestIds);
  const initialFeed: FeedItem[] = [
    {
      id: "day-0-welcome",
      day: 1,
      title: "A quiet hello from the barn.",
      body: "You open a fresh SignalBarn profile and immediately find three useful strangers.",
      kind: "post",
      audience: "Close friends, hobby lurkers",
      context: "Contained",
      reactions: 12,
      comments: 3,
      shares: 0,
      commentSamples: [
        { author: "Old Friend Nate", text: "Do not recruit me into a second app.", tone: "warm" },
        { author: "Linux Forum Mentor", text: "Post logs if it breaks.", tone: "useful" },
      ],
    },
  ];

  const state: GameState = {
    day: 1,
    interestIds: safeInterestIds,
    actionHistoryIds: [],
    actionUseDays: {},
    handRefreshesToday: 0,
    handVariant: 0,
    metrics: {
      reach: 210,
      trust: 68,
      agency: 28,
      belonging: 42,
      drama: 12,
      burnout: 15,
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
    pathMilestones: createEmptyPathMilestones(),
    joinedCommunityIds: [],
    lastActionTags: [],
    recentPost: "A quiet hello from the barn.",
    eventLog: ["Created a fresh SignalBarn profile without immediately arguing about printers."],
    feedItems: initialFeed,
    affectedNodes: [],
    biggestViralEvent: "No viral event yet.",
    worstContextCollapse: "No context collapse yet.",
    qwenInvitationSeen: false,
    qwenSocietyUnlocked: false,
    qwenGuestPosted: false,
    qwenDemoShared: false,
    qwenAuntCollapseSeen: false,
    eventsHosted: 0,
    repairsMade: 0,
    scorePreview: 0,
  };
  state.scorePreview = calculateScore(state);
  return state;
}

export function getAction(id: string): ActionCard | undefined {
  return ACTIONS.find((action) => action.id === id);
}

export function getCommunity(id: string): Community | undefined {
  return COMMUNITIES.find((community) => community.id === id);
}

export function getDailyActionHand(state: GameState): ActionCard[] {
  const picked = new Set<string>();
  const variant = state.handVariant + stableHash(`${state.day}:${state.lastActionId ?? "fresh"}`);
  const add = (ids: string[]): void => {
    for (const id of ids) {
      if (picked.size >= 6) return;
      if (picked.has(id)) continue;
      const action = getAction(id);
      if (!action) continue;
      if (id === "create-group" && state.createdGroup) continue;
      if (id === "take-community-independent" && !canTakeCommunityIndependent(state)) continue;
      picked.add(id);
      return;
    }
  };
  const rotate = (ids: string[], offset: number): string[] =>
    ids.map((_, index) => ids[(index + Math.abs(offset)) % ids.length]);

  const relationshipCommunity = state.metrics.trust < 48 || state.metrics.drama > 55
    ? ["private-message", "dm-person", "apologize", "moderate-fight", "celebrate-win", "join-community"]
    : state.joinedCommunityIds.length || state.createdGroup
      ? ["celebrate-win", "moderate-thread", "recruit-members", "group-challenge", "private-message"]
      : ["join-community", "ask-question", "celebrate-win", "private-message", "create-group"];
  add(rotate(relationshipCommunity, variant + 1));

  const knowledgeCreator = [
    "share-tip",
    "tiny-build-log",
    "ask-expert",
    "pin-useful-thread",
    "publish-followup-explainer",
    "turn-viral-project",
    "retro-repair",
  ];
  add(rotate(knowledgeCreator, variant + 2));

  const growthViral = state.metrics.reach > 1400 || state.pathMilestones.viral.viralEvents > 0
    ? [
        "convert-attention-list",
        "turn-viral-project",
        "invite-followers-room",
        "contact-opportunity-lead",
        "signal-boost",
        "reply-thread",
      ]
    : ["signal-boost", "post-update", "post-joke", "recruit-members", "group-challenge", "blurry-camping-photo"];
  add(rotate(growthViral, variant + 3));

  const boundaryRepair = state.metrics.burnout > 55
    ? ["schedule-recovery", "weekend-offline", "touch-grass", "block-mute", "refuse-argue", "delete-post"]
    : state.metrics.heat > 50 || state.metrics.drama > 45
      ? ["refuse-argue", "block-mute", "delegate-moderation", "delete-post", "apologize", "schedule-recovery"]
      : ["dm-person", "private-message", "refuse-argue", "touch-grass", "delegate-moderation", "take-break"];
  add(rotate(boundaryRepair, variant + 4));

  const interestPool = normalizeInterestIds(state.interestIds).flatMap((interestId) => {
    const interest = STARTING_INTERESTS.find((item) => item.id === interestId);
    return interest?.actionHints ?? [];
  });
  add(rotate(Array.from(new Set(interestPool)), variant + 5));

  const wildcard = canTakeCommunityIndependent(state)
    ? ["take-community-independent", "weekend-offline", "contact-opportunity-lead", "host-event"]
    : state.day > 20 && state.metrics.heat < 44
      ? ["weekend-offline", "host-event", "small-town-meetup", "ask-expert", "pin-useful-thread"]
      : state.day > 15 && (state.joinedCommunityIds.length || state.createdGroup)
        ? ["host-event", "small-town-meetup", "group-challenge", "delegate-moderation", "moderate-thread"]
        : ["ask-question", "host-event", "correct-ai-image", "ask-linux-help", "golf-swing-clip"];
  add(rotate(wildcard, variant + 6));

  const fallbackIds = [
    "share-tip",
    "ask-question",
    "tiny-build-log",
    "post-update",
    "ask-expert",
    "pin-useful-thread",
    "take-break",
    "delete-post",
    "join-community",
    "create-group",
  ];
  for (const id of rotate(fallbackIds, variant + 7)) {
    if (picked.size >= 6) break;
    const action = getAction(id);
    if (!action) continue;
    if (id === "create-group" && state.createdGroup) continue;
    picked.add(id);
  }

  return Array.from(picked)
    .map((id) => getAction(id))
    .filter(Boolean)
    .slice(0, 6) as ActionCard[];
}

export function refreshDailyHand(state: GameState): GameState {
  const next = cloneState(state);
  next.handRefreshesToday += 1;
  next.handVariant += 1 + next.day;
  if (next.handRefreshesToday > 1) {
    applyEffects(next, { heat: 3, burnout: 1 });
  }
  next.scorePreview = calculateScore(next);
  return next;
}

export function getActionFreshness(state: GameState, actionId: string): {
  label: string;
  multiplier: number;
} {
  const uses = recentActionUses(state, actionId, 5);
  if (uses <= 0) return { label: "Fresh", multiplier: 1 };
  if (uses === 1) return { label: "Familiar", multiplier: 0.75 };
  if (uses === 2) return { label: "Audience Tiring", multiplier: 0.45 };
  return { label: "Diminishing Returns", multiplier: 0.2 };
}

export function playAction(state: GameState, actionId: string): GameState {
  const action = getAction(actionId);
  if (!action || action.opens) {
    return state;
  }

  const next = cloneState(state);
  const freshness = getActionFreshness(next, action.id);
  next.lastActionId = action.id;
  next.lastActionTags = [...action.tags];
  next.actionHistoryIds = [action.id, ...next.actionHistoryIds].slice(0, 12);
  next.actionUseDays[action.id] = [...(next.actionUseDays[action.id] ?? []), next.day].slice(-12);
  next.recentPost = action.title;
  next.affectedNodes = affectedFromRelationships(action.relationships);

  if (action.id === "host-event" || action.id === "small-town-meetup") {
    next.eventsHosted += 1;
  }
  if (
    action.id === "apologize" ||
    action.id === "private-message" ||
    action.id === "dm-person" ||
    action.id === "refuse-argue"
  ) {
    next.repairsMade += 1;
  }

  applyEffects(next, action.effects, freshness.multiplier);
  applyFollowers(next, action.followers, freshness.multiplier);
  applyRelationships(next, action.relationships);
  applyActionMilestones(next, action, freshness.multiplier);

  if (next.createdGroup && action.tags.includes("community")) {
    next.createdGroup.members += action.id === "recruit-members" ? 18 : 9;
    next.createdGroup.health = clamp(next.createdGroup.health + (action.tags.includes("moderation") ? 7 : 4), 0, 100);
  }

  const report = buildDayReport(next, action);
  next.report = report;
  if (freshness.label !== "Fresh") {
    next.report.mechanicalNote = `${next.report.mechanicalNote ? `${next.report.mechanicalNote} ` : ""}${freshness.label}: repeated actions have reduced positive gains this week.`;
  }
  next.affectedNodes = Array.from(new Set([...next.affectedNodes, ...(report.affectedNodes ?? [])]));
  addFeedItem(next, {
    title: action.title,
    body: action.description,
    kind: report.kind === "collapse" ? "collapse" : report.kind === "viral" ? "viral" : "post",
    audience: report.audience ?? inferAudience(action.tags),
    context: report.context ?? inferContext(next, action.tags),
    reactions: Math.max(1, Math.round(next.metrics.reach / 24 + action.viralPotential)),
    comments: Math.max(0, Math.round(next.metrics.drama / 7 + action.viralPotential / 3)),
    shares: Math.max(0, Math.round(action.viralPotential / 2 + next.metrics.heat / 15)),
    commentSamples: makeComments(action.tags, report.kind),
  });
  next.eventLog = [`Day ${next.day}: ${report.title}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function joinCommunity(state: GameState, communityId: string): GameState {
  const community = getCommunity(communityId);
  if (!community) {
    return state;
  }
  if (state.joinedCommunityIds.includes(community.id)) {
    return state;
  }
  const next = cloneState(state);
  next.joinedCommunityIds.push(community.id);
  if (community.id === "founders-future-society") {
    next.qwenSocietyUnlocked = true;
  }
  next.lastActionId = "join-community";
  next.lastActionTags = ["community", community.tone];
  next.actionHistoryIds = [`join:${community.id}`, ...next.actionHistoryIds].slice(0, 12);
  next.actionUseDays["join-community"] = [...(next.actionUseDays["join-community"] ?? []), next.day].slice(-12);
  next.recentPost = `Joined ${community.name}`;
  next.affectedNodes = community.tone === "healthy" ? ["Local Admin Carol", "Coworker Maya"] : ["Aunt JPEG", "Uncle Signal", "Coworker Maya"];
  const effectDeltas = applyEffects(next, community.joinEffects);
  const followerDeltas = applyFollowers(next, community.joinFollowers);
  next.pathMilestones.community.memberSupportActions += 1;
  next.pathMilestones.community.recurringContributors += community.tone === "healthy" ? 1 : 0;
  next.pathMilestones.community.helpfulMemberEvents += community.tone === "healthy" ? 1 : 0;
  next.pathMilestones.viral.peakReach = Math.max(next.pathMilestones.viral.peakReach, next.metrics.reach);
  next.pathMilestones.creator.collaboratorsFound += community.joinFollowers.opportunityContacts ? 1 : 0;
  if (community.tone === "healthy") {
    applyRelationships(next, { "Coworker Maya": 2, "Local Admin Carol": 2 });
  } else {
    applyRelationships(next, { "Aunt JPEG": 4, "Uncle Signal": 4, "Coworker Maya": -4 });
  }
  next.report = {
    kind: "feed",
    title: `Joined ${community.name}`,
    body: `${community.hook} Upside: ${community.upside}. Risk: ${community.risk}`,
    effectsText: summarizeDeltas({
      metrics: effectDeltas,
      followers: followerDeltas,
      relationships: {},
    }),
    audience: `${community.name} members and their rivals`,
    context: community.tone === "healthy" ? "Contained" : "Fraying",
    source: "community join",
    benefited: community.tone === "healthy" ? "niche members" : "reach and weird relatives",
    annoyed: community.tone === "healthy" ? "link spammers" : "Coworker Maya",
    affectedNodes: next.affectedNodes,
  };
  addFeedItem(next, {
    title: `Joined ${community.name}`,
    body: community.hook,
    kind: "feed",
    audience: `${community.name} members`,
    context: community.tone === "healthy" ? "Contained" : "Fraying",
    reactions: 18 + Math.round(next.followers.nicheMembers / 8),
    comments: community.tone === "healthy" ? 5 : 12,
    shares: community.tone === "healthy" ? 1 : 5,
    guestAvatar: community.avatar,
    commentSamples: [
      {
        author: community.tone === "healthy" ? "Linux Forum Mentor" : "Aunt JPEG",
        text: community.tone === "healthy" ? "Good room. Read the pinned posts." : "This explains several clouds.",
        tone: community.tone === "healthy" ? "useful" : "chaos",
      },
    ],
  });
  next.eventLog = [`Day ${next.day}: Joined ${community.name}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function createGroup(state: GameState, group: CreatedGroup): GameState {
  if (state.createdGroup) {
    return state;
  }
  const next = cloneState(state);
  const tradeoffs = getGroupTradeoffs(group.premise, group.tone, group.rules, group.firstPost);
  next.createdGroup = {
    ...group,
    members: tradeoffs.members,
    health: tradeoffs.health,
  };
  next.lastActionId = "create-group";
  next.lastActionTags = ["community", "builder", group.tone];
  next.actionHistoryIds = ["create-group", ...next.actionHistoryIds].slice(0, 12);
  next.actionUseDays["create-group"] = [...(next.actionUseDays["create-group"] ?? []), next.day].slice(-12);
  next.recentPost = `Created ${group.name}`;
  next.affectedNodes = ["Local Admin Carol", "Old Friend Nate"];
  const effectDeltas = applyEffects(next, tradeoffs.effects);
  const followerDeltas = applyFollowers(next, tradeoffs.followers);
  next.pathMilestones.community.memberSupportActions += 1;
  next.pathMilestones.community.recurringContributors += Math.max(1, Math.round(tradeoffs.members / 18));
  next.pathMilestones.organizer.recurringParticipants += Math.max(1, Math.round(tradeoffs.members / 10));
  next.pathMilestones.creator.projectMilestones += 1;
  next.report = {
    kind: "feed",
    title: `${group.name} Is Live`,
    body: `The first post is "${group.firstPost}" and the rules say "${group.rules}." It starts as a small independence engine with visible tradeoffs.`,
    effectsText: summarizeDeltas({
      metrics: effectDeltas,
      followers: followerDeltas,
      relationships: {},
    }),
    source: "new group launch",
    audience: tradeoffs.audience,
    context: tradeoffs.context,
    benefited: "future community health",
    annoyed: group.tone.includes("chaotic") ? "Local Admin Carol" : "link spammers",
    affectedNodes: next.affectedNodes,
  };
  addFeedItem(next, {
    title: `${group.name} is live`,
    body: `Premise: ${group.premise}. Tone: ${group.tone}. Rule: ${group.rules}.`,
    kind: "feed",
    audience: tradeoffs.audience,
    context: tradeoffs.context,
    reactions: 22,
    comments: group.tone.includes("chaotic") ? 14 : 6,
    shares: group.tone.includes("investigative") ? 7 : 2,
    commentSamples: [
      { author: "Local Admin Carol", text: "Rules visible at launch. Good omen.", tone: "dry" },
      { author: "Old Friend Nate", text: "I will lurk respectfully.", tone: "warm" },
    ],
  });
  next.eventLog = [`Day ${next.day}: Created ${group.name}`, ...next.eventLog].slice(0, 6);
  next.scorePreview = calculateScore(next);
  return next;
}

export function resolveReport(state: GameState, response?: ResponseKey): GameState {
  const next = cloneState(state);
  if (response) {
    const choice = responseEffects[response];
    applyEffects(next, choice.effects);
    applyFollowers(next, choice.followers);
    next.affectedNodes = choice.affectedNodes;
    applyResponseMilestones(next, response, state.report);
    next.eventLog = [`Day ${next.day}: ${choice.title}`, ...next.eventLog].slice(0, 6);
    addFeedItem(next, {
      title: choice.title,
      body: choice.feedText,
      kind: response === "apologize" || response === "private" || response === "friend" ? "repair" : "feed",
      audience: "People still watching the thread",
      context: response === "lean" ? "Escaped" : response === "delete" || response === "mute" || response === "logoff" ? "Contained" : "Fraying",
      reactions: response === "lean" ? 48 : 18,
      comments: response === "lean" ? 22 : 5,
      shares: response === "lean" ? 11 : 1,
      commentSamples: [
        {
          author: response === "lean" ? "Cousin Reply Guy" : "Concerned Relative",
          text: response === "lean" ? "Finally, we are debating the real issue: fonts." : "That landed better.",
          tone: response === "lean" ? "chaos" : "warm",
        },
      ],
    });
    if (response === "joinSociety") {
      next.qwenSocietyUnlocked = true;
      if (!next.joinedCommunityIds.includes("founders-future-society")) {
        next.joinedCommunityIds.push("founders-future-society");
      }
      next.pathMilestones.knowledge.mentorInteractions += 1;
      next.pathMilestones.community.recurringContributors += 1;
      addQwenSocietyFeedCard(next, "Joined the Founders & Future Society");
    }
    if (response === "inviteQwenGuestPost") {
      next.qwenGuestPosted = true;
      next.pathMilestones.knowledge.expertInteractions += 1;
      next.pathMilestones.knowledge.peopleHelped += 2;
      addQwenGuestPostFeedCard(next);
      if (Math.random() < 0.28) {
        applyEffects(next, { reach: 210, skillCred: 5, heat: 4 });
        applyFollowers(next, { nicheMembers: 10, opportunityContacts: 1 });
        next.biggestViralEvent = "Qwen Franklin's guest post found the history-and-AI people.";
      }
    }
    if (response === "shareQwenDemo") {
      next.qwenDemoShared = true;
      next.pathMilestones.viral.viralEvents += 1;
      next.pathMilestones.viral.peakReach = Math.max(next.pathMilestones.viral.peakReach, next.metrics.reach);
    }
    if (response === "shareQwenDemo" || response === "letProjectSpeak") {
      addQwenSocietyFeedCard(next, response === "shareQwenDemo" ? "Shared the Qwen Franklin demo" : "Opened the credited Qwen Franklin article");
    }
    if (response === "clarify" || response === "private" || response === "apologize" || response === "friend") {
      next.repairsMade += 1;
    }
  }
  next.report = undefined;
  return advanceDay(next);
}

export function advanceDay(state: GameState): GameState {
  const next = cloneState(state);
  updateImmediateDerivedValues(next);
  const failure = checkFailure(next);
  if (failure) {
    const ending = pickFailureEnding(next, failure);
    next.summary = buildSummary(next, "failure", ending.title, ending);
    return next;
  }
  recordCompletedDayMilestones(next);
  if (next.day >= RUN_LENGTH_DAYS) {
    updateImmediateDerivedValues(next);
    const ending = pickEnding(next);
    next.summary = buildSummary(next, ending.outcome, ending.title, ending);
    return next;
  }
  next.day += 1;
  next.handRefreshesToday = 0;
  applyDailyMaintenance(next);
  updateImmediateDerivedValues(next);
  next.scorePreview = calculateScore(next);
  return next;
}

export function calculateScore(state: GameState): number {
  const m = state.metrics;
  const f = state.followers;
  const communityBonus =
    state.joinedCommunityIds.length * 120 + (state.createdGroup ? state.createdGroup.members * 9 + state.createdGroup.health * 6 : 0);
  const relationshipAverage =
    Object.values(state.relationships).reduce((sum, value) => sum + value, 0) /
    Object.values(state.relationships).length;
  const score =
    m.reach * 0.2 +
    m.trust * 36 +
    m.agency * 36 +
    m.belonging * 32 +
    m.skillCred * 38 +
    f.closeFriends * 140 +
    f.nicheMembers * 8 +
    f.casualFollowers * 2 +
    f.opportunityContacts * 180 +
    relationshipAverage * 14 +
    state.eventsHosted * 260 +
    state.repairsMade * 110 +
    communityBonus -
    m.drama * 22 -
    m.burnout * 22 -
    m.realityDrift * 30 -
    f.dramaFollowers * 4;
  return Math.max(0, Math.round(score));
}

export function getVictoryPathProgress(
  state: GameState,
): Array<{
  name: string;
  value: number;
  status: string;
  milestones: string[];
  milestoneDetails: VictoryMilestone[];
  qualifies: boolean;
}> {
  const milestones = getVictoryMilestones(state);
  return PATH_NAMES.map((name) => {
    const pathMilestones = milestones.filter((milestone) => milestone.path === name);
    const mandatory = pathMilestones.filter((milestone) => milestone.mandatory);
    const value = pathProgressValue(pathMilestones);
    const completed = pathMilestones.filter((milestone) => milestone.complete).length;
    return {
      name,
      value: clamp(value, 0, 100),
      status: labelMilestoneProgress(value, completed),
      qualifies: value >= 80 && mandatory.every((milestone) => milestone.complete) && !pathDisqualified(state, name),
      milestoneDetails: pathMilestones,
      milestones: pathMilestones.map((milestone) => `${milestone.complete ? "Hit" : "Next"}: ${milestone.label}`),
    };
  });
}

export function getVictoryMilestones(state: GameState): VictoryMilestone[] {
  const m = state.metrics;
  const f = state.followers;
  const p = state.pathMilestones;
  const groupHealth = state.createdGroup?.health ?? (state.joinedCommunityIds.length ? 62 : 0);
  const hasGroup = state.joinedCommunityIds.length > 0 || Boolean(state.createdGroup);
  const healthyBelonging = (m.belonging + m.trust + Math.max(0, 100 - m.drama)) / 3;
  const directRelationshipAverage =
    (state.relationships["Old Friend Nate"] +
      state.relationships["Coworker Maya"] +
      state.relationships["Concerned Relative"] +
      state.relationships["Small-Town Neighbor"]) /
    4;
  return [
    milestone("Community", "joined or created a real room", hasGroup ? 100 : 0, hasGroup, true),
    milestone("Community", "healthy room days", progressCount(p.community.healthyGroupDays, 4), p.community.healthyGroupDays >= 4, true),
    milestone("Community", "helpful member events", progressCount(p.community.helpfulMemberEvents, 4), p.community.helpfulMemberEvents >= 4, true),
    milestone("Community", "moderation successes", progressCount(p.community.moderationSuccesses, 2), p.community.moderationSuccesses >= 2, true),
    milestone("Community", "recurring contributors", progressCount(p.community.recurringContributors, 5), p.community.recurringContributors >= 5, true),
    milestone("Community", "trust / belonging without drama", healthyBelonging, m.trust >= 62 && m.belonging >= 62 && m.drama <= 42, true),

    milestone("Viral", "multiple viral events", progressCount(p.viral.viralEvents, 3), p.viral.viralEvents >= 3, true),
    milestone("Viral", "sustained major reach", Math.min(100, p.viral.peakReach / 24), p.viral.peakReach >= 2200, true),
    milestone("Viral", "attention converted", progressCount(p.viral.viralOpportunitiesConverted, 2), p.viral.viralOpportunitiesConverted >= 2, true),
    milestone("Viral", "fallout managed", progressCount(p.viral.falloutManaged, 1), p.viral.falloutManaged >= 1, true),
    milestone("Viral", "trust survives the spike", (m.trust + (100 - m.burnout)) / 2, m.trust >= 42 && m.burnout <= 76, true),
    milestone("Viral", "not purely destructive", 100 - p.viral.destructiveViralEvents * 25, p.viral.destructiveViralEvents <= 2, false),

    milestone("Knowledge", "tutorials or useful explainers", progressCount(p.knowledge.tutorialsPosted, 4), p.knowledge.tutorialsPosted >= 4, true),
    milestone("Knowledge", "people helped", progressCount(p.knowledge.peopleHelped, 9), p.knowledge.peopleHelped >= 9, true),
    milestone("Knowledge", "expert or mentor interactions", progressCount(p.knowledge.expertInteractions + p.knowledge.mentorInteractions, 4), p.knowledge.expertInteractions + p.knowledge.mentorInteractions >= 4, true),
    milestone("Knowledge", "useful threads pinned", progressCount(p.knowledge.usefulThreadsPinned, 2), p.knowledge.usefulThreadsPinned >= 2, true),
    milestone("Knowledge", "skill cred with reality anchored", (m.skillCred + (100 - m.realityDrift)) / 2, m.skillCred >= 64 && m.realityDrift <= 45, true),

    milestone("Relationship", "private repairs", progressCount(p.relationship.privateRepairs, 4), p.relationship.privateRepairs >= 4, true),
    milestone("Relationship", "direct messages sent", progressCount(p.relationship.directMessagesSent, 4), p.relationship.directMessagesSent >= 4, true),
    milestone("Relationship", "public conflicts resolved", progressCount(p.relationship.publicConflictsResolved, 2), p.relationship.publicConflictsResolved >= 2, true),
    milestone("Relationship", "close friends preserved", Math.min(100, f.closeFriends * 14), f.closeFriends >= 7 && p.relationship.relationshipLosses <= 1, true),
    milestone("Relationship", "healthy relationship average", directRelationshipAverage, directRelationshipAverage >= 66 && m.trust >= 60, true),

    milestone("Creator", "build logs posted", progressCount(p.creator.buildLogsPosted, 4), p.creator.buildLogsPosted >= 4, true),
    milestone("Creator", "project milestones", progressCount(p.creator.projectMilestones, 3), p.creator.projectMilestones >= 3, true),
    milestone("Creator", "collaborators found", progressCount(p.creator.collaboratorsFound, 3), p.creator.collaboratorsFound >= 3, true),
    milestone("Creator", "opportunities converted", progressCount(p.creator.opportunitiesConverted, 2), p.creator.opportunitiesConverted >= 2, true),
    milestone("Creator", "agency and skill cred", (m.agency + m.skillCred) / 2, m.agency >= 64 && m.skillCred >= 62, true),

    milestone("Organizer", "events hosted", progressCount(p.organizer.eventsHosted, 4), p.organizer.eventsHosted >= 4, true),
    milestone("Organizer", "total attendance", progressCount(p.organizer.totalAttendance, 42), p.organizer.totalAttendance >= 42, true),
    milestone("Organizer", "recurring participants", progressCount(p.organizer.recurringParticipants, 12), p.organizer.recurringParticipants >= 12, true),
    milestone("Organizer", "group challenges completed", progressCount(p.organizer.groupChallengesCompleted, 2), p.organizer.groupChallengesCompleted >= 2, true),
    milestone("Organizer", "offline agency and belonging", (m.agency + m.belonging) / 2, m.agency >= 60 && m.belonging >= 60, true),

    milestone("Escape", "offline days", progressCount(p.escape.offlineDays, 5), p.escape.offlineDays >= 5, true),
    milestone("Escape", "direct contacts built", progressCount(p.escape.directContactsBuilt, 4), p.escape.directContactsBuilt >= 4, true),
    milestone("Escape", "boundaries set", progressCount(p.escape.boundariesSet, 3), p.escape.boundariesSet >= 3, true),
    milestone("Escape", "platform dependence reduced", progressCount(p.escape.platformDependenceReduced, 3), p.escape.platformDependenceReduced >= 3, true),
    milestone("Escape", "explicit exit plan completed", p.escape.exitPlanCompleted ? 100 : 0, p.escape.exitPlanCompleted, true),
    milestone("Escape", "low heat and low burnout", (100 - m.heat + 100 - m.burnout) / 2, m.heat <= 38 && m.burnout <= 38, true),
  ];
}

export function getFailureWarnings(state: GameState): Array<{ name: string; level: "watch" | "danger"; text: string }> {
  const warnings: Array<{ name: string; level: "watch" | "danger"; text: string }> = [];
  const m = state.metrics;
  const f = state.followers;
  if (m.drama > 58 || (m.heat > 55 && m.trust < 42)) {
    warnings.push({
      name: "Context collapse warning",
      level: m.drama > 78 ? "danger" : "watch",
      text: "Every audience is drifting toward the same room.",
    });
  }
  if (m.burnout > 62) {
    warnings.push({
      name: "Burnout warning",
      level: m.burnout > 82 ? "danger" : "watch",
      text: "You are becoming the platform's unpaid weather system.",
    });
  }
  if (m.trust < 38 || f.closeFriends <= 3) {
    warnings.push({
      name: "Trust fracture warning",
      level: m.trust < 20 ? "danger" : "watch",
      text: "The quiet people are leaving before the loud people notice.",
    });
  }
  if (m.reach > 1800 && m.trust < 36) {
    warnings.push({
      name: "Feed rot warning",
      level: m.trust < 24 ? "danger" : "watch",
      text: "Reach is outgrowing credibility.",
    });
  }
  if (m.realityDrift > 55) {
    warnings.push({
      name: "Reality drift warning",
      level: m.realityDrift > 76 ? "danger" : "watch",
      text: "The weird rooms are starting to write your captions.",
    });
  }
  if (state.relationships["Cousin Reply Guy"] < 28 && f.dramaFollowers > 110) {
    warnings.push({
      name: "Reply Guy Singularity warning",
      level: f.dramaFollowers > 260 ? "danger" : "watch",
      text: "The argument is becoming the product.",
    });
  }
  return warnings;
}

export function getGroupTradeoffs(
  premise: string,
  tone: string,
  rules: string,
  firstPost = "",
): {
  effects: Partial<Metrics>;
  followers: Partial<Followers>;
  members: number;
  health: number;
  audience: string;
  context: "Contained" | "Escaped" | "Fraying";
  risk: string;
  tradeoffs: string[];
} {
  const effects: Partial<Metrics> = { agency: 8, belonging: 8, trust: 3, heat: 5, reach: 100 };
  const followers: Partial<Followers> = { nicheMembers: 12, casualFollowers: 8 };
  let members = 12;
  let health = 62;
  let context: "Contained" | "Escaped" | "Fraying" = "Contained";
  const tradeoffs: string[] = ["starts small", "rules shape the room"];

  if (premise.toLowerCase().includes("linux") || premise.toLowerCase().includes("computer")) {
    effects.skillCred = (effects.skillCred ?? 0) + 8;
    followers.opportunityContacts = 1;
    tradeoffs.push("+skill credibility");
  }
  if (premise.toLowerCase().includes("bigfoot") || premise.toLowerCase().includes("weird")) {
    effects.reach = (effects.reach ?? 0) + 90;
    effects.realityDrift = (effects.realityDrift ?? 0) + 6;
    followers.realityRelatives = 3;
    context = "Fraying";
    tradeoffs.push("+reach, +reality risk");
  }
  if (premise.toLowerCase().includes("local") || premise.toLowerCase().includes("town")) {
    effects.agency = (effects.agency ?? 0) + 5;
    effects.belonging = (effects.belonging ?? 0) + 4;
    members += 6;
    tradeoffs.push("+local agency");
  }
  if (tone.includes("chaotic")) {
    effects.heat = (effects.heat ?? 0) + 8;
    effects.drama = (effects.drama ?? 0) + 6;
    health -= 14;
    context = "Fraying";
    tradeoffs.push("+heat, lower health");
  }
  if (tone.includes("technical") || tone.includes("strict")) {
    effects.skillCred = (effects.skillCred ?? 0) + 5;
    effects.trust = (effects.trust ?? 0) + 4;
    effects.belonging = (effects.belonging ?? 0) - 1;
    health += 8;
    tradeoffs.push("+trust, narrower welcome");
  }
  if (tone.includes("welcoming") || tone.includes("wholesome") || tone.includes("kind")) {
    effects.trust = (effects.trust ?? 0) + 4;
    effects.belonging = (effects.belonging ?? 0) + 5;
    health += 9;
    tradeoffs.push("+belonging");
  }
  if (rules.includes("cite") || rules.includes("inspection") || rules.includes("sources")) {
    effects.realityDrift = (effects.realityDrift ?? 0) - 5;
    effects.trust = (effects.trust ?? 0) + 3;
    health += 6;
    tradeoffs.push("-reality drift");
  }
  if (rules.includes("spirals") || rules.includes("link spam")) {
    effects.drama = (effects.drama ?? 0) - 5;
    effects.heat = (effects.heat ?? 0) - 2;
    health += 4;
    tradeoffs.push("-drama");
  }
  if (firstPost.includes("evidence")) {
    effects.trust = (effects.trust ?? 0) + 2;
    effects.realityDrift = (effects.realityDrift ?? 0) - 3;
    health += 4;
    tradeoffs.push("evidence-first start");
  }
  if (firstPost.includes("win")) {
    effects.belonging = (effects.belonging ?? 0) + 3;
    effects.burnout = (effects.burnout ?? 0) - 2;
    health += 3;
    tradeoffs.push("positive ritual");
  }
  if (firstPost.includes("meetup")) {
    effects.agency = (effects.agency ?? 0) + 3;
    followers.opportunityContacts = (followers.opportunityContacts ?? 0) + 1;
    members += 2;
    tradeoffs.push("offline bridge");
  }
  if (firstPost.includes("building") || firstPost.includes("tool")) {
    effects.skillCred = (effects.skillCred ?? 0) + 3;
    followers.nicheMembers = (followers.nicheMembers ?? 0) + 4;
    members += 3;
    tradeoffs.push("maker-friendly start");
  }
  if (firstPost.includes("question") || firstPost.includes("snack")) {
    effects.belonging = (effects.belonging ?? 0) + 2;
    members += 3;
    health += 2;
    tradeoffs.push("low-friction welcome");
  }
  return {
    effects,
    followers,
    members,
    health: clamp(health, 35, 92),
    audience: premise.includes("Local") || premise.includes("town") ? "local friends and niche neighbors" : "niche members and curious lurkers",
    context,
    risk: context === "Fraying" ? "context may fray early" : health > 72 ? "stable but slower" : "manageable launch risk",
    tradeoffs: Array.from(new Set(tradeoffs)).slice(0, 6),
  };
}

export function createDemoState(
  kind:
    | "main"
    | "viral"
    | "collapse"
    | "victory"
    | "failure"
    | "paths"
    | "graphHover"
    | "feed"
    | "qwenInvitation"
    | "qwenCommunity"
    | "qwenCollapse"
    | "victoryCommunity"
    | "victoryViral"
    | "victoryKnowledge"
    | "victoryRelationship"
    | "victoryCreator"
    | "victoryOrganizer"
    | "victoryEscape"
    | "failureContext"
    | "failureFeedRot"
    | "failureUnfriended"
    | "failureNiche"
    | "failureBurnout"
    | "failureReplyGuy"
    | "failureAlgorithm",
): GameState {
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
  state.feedItems = [
    {
      id: "demo-1",
      day: 12,
      title: "Your tutorial helped someone fix a laptop",
      body: "A quiet thank-you lands in the inbox. The old internet magic still works.",
      kind: "feed",
      audience: "Linux Forum, Coding Circle",
      context: "Contained",
      reactions: 84,
      comments: 12,
      shares: 7,
      commentSamples: [
        { author: "Linux Forum Mentor", text: "Clear steps. Pin this.", tone: "useful" },
        { author: "Coworker Maya", text: "This is the good version of being online.", tone: "dry" },
      ],
    },
    {
      id: "demo-2",
      day: 11,
      title: "Aunt JPEG posted a lighthouse theory",
      body: "The family side of the graph is blinking in a way dashboards do not enjoy.",
      kind: "collapse",
      audience: "Reality-friction relatives",
      context: "Fraying",
      reactions: 46,
      comments: 19,
      shares: 8,
      commentSamples: [
        { author: "Aunt JPEG", text: "Look at the shadows.", tone: "chaos" },
        { author: "Concerned Relative", text: "Can someone call him?", tone: "worry" },
      ],
    },
    ...state.feedItems,
  ];
  state.affectedNodes = ["Aunt JPEG", "Coworker Maya", "Linux Forum Mentor", "Bigfoot Field Club"];
  state.day = 12;
  state.scorePreview = calculateScore(state);

  if (kind === "viral") {
    const effectDeltas = applyEffects(state, { reach: 1200, drama: 16, heat: 13 });
    const followerDeltas = applyFollowers(state, { casualFollowers: 54, dramaFollowers: 28, opportunityContacts: 2 });
    state.report = {
      kind: "viral",
      title: "Your Linux Rant Went Viral",
      body: "The thread escaped the Linux Forum, gained three job leads, and convinced Aunt JPEG that Linux is a county ordinance.",
      effectsText: summarizeDeltas({ metrics: effectDeltas, followers: followerDeltas, relationships: {} }),
      source: "expert boost plus reply fight",
      audience: "Linux Forum, coworkers, relatives, printer people",
      context: "Escaped",
      benefited: "Linux Forum Mentor and opportunity contacts",
      annoyed: "Coworker Maya and Aunt JPEG",
      affectedNodes: ["Linux Forum Mentor", "Coworker Maya", "Aunt JPEG", "Cousin Reply Guy"],
      responseOptions: ["clarify", "private", "lean", "delete", "pin", "mute", "tutorial", "logoff"],
      responseRequired: true,
    };
    state.biggestViralEvent = "Your Linux rant went viral.";
  }

  if (kind === "collapse") {
    const effectDeltas = applyEffects(state, { drama: 34, heat: 28, trust: -18, realityDrift: 12 });
    const followerDeltas = applyFollowers(state, { dramaFollowers: 12 });
    const relationshipDeltas = applyRelationships(state, { "Coworker Maya": -10 });
    state.report = {
      kind: "collapse",
      title: "Context Collapse: Golf Joke Reaches Coworkers",
      body: "The Golf Swing Lab laughed. Coworker Maya did not. Uncle Signal thinks the sand trap is a metaphor.",
      effectsText: summarizeDeltas({
        metrics: effectDeltas,
        followers: followerDeltas,
        relationships: relationshipDeltas,
      }),
      source: "screenshot spread",
      audience: "Golf Swing Lab, coworkers, family watchers",
      context: "Escaped",
      benefited: "Cousin Reply Guy",
      annoyed: "Coworker Maya",
      affectedNodes: ["Coworker Maya", "Uncle Signal", "Cousin Reply Guy", "Golf Friend Rick"],
      responseOptions: ["clarify", "private", "apologize", "friend", "mute", "logoff"],
      responseRequired: true,
    };
    state.worstContextCollapse = "Golf joke reached coworkers and relatives at once.";
  }

  if (kind === "paths") {
    applyEffects(state, { reach: 700, agency: 18, belonging: 14, skillCred: 22, heat: 15 });
    state.affectedNodes = ["Old Friend Nate", "Linux Forum Mentor", "Local Admin Carol"];
  }

  if (kind === "graphHover") {
    state.affectedNodes = ["Aunt JPEG", "Uncle Signal", "Cousin Reply Guy", "Coworker Maya"];
    state.relationships["Aunt JPEG"] = 34;
    state.relationships["Uncle Signal"] = 29;
    state.relationships["Coworker Maya"] = 70;
  }

  if (kind === "qwenInvitation") {
    state.day = 9;
    state.qwenInvitationSeen = true;
    state.affectedNodes = ["Linux Forum Mentor", "Aunt JPEG", "Uncle Signal", "Cousin Reply Guy"];
    state.report = buildQwenInvitationReport(state.affectedNodes);
  }

  if (kind === "qwenCommunity") {
    state.day = 10;
    state.qwenInvitationSeen = true;
    state.qwenSocietyUnlocked = true;
    state.qwenDemoShared = true;
    state.joinedCommunityIds = ["linux-forum", "founders-future-society"];
    state.affectedNodes = ["Founders & Future Society", "Linux Forum Mentor", "Aunt JPEG"];
    addQwenSocietyFeedCard(state, "Joined the Founders & Future Society");
  }

  if (kind === "qwenCollapse") {
    state.day = 13;
    state.qwenInvitationSeen = true;
    state.qwenSocietyUnlocked = true;
    state.qwenGuestPosted = true;
    state.qwenDemoShared = true;
    state.qwenAuntCollapseSeen = true;
    state.joinedCommunityIds = ["linux-forum", "founders-future-society"];
    state.affectedNodes = ["Aunt JPEG", "Uncle Signal", "Cousin Reply Guy", "Linux Forum Mentor"];
    const effectDeltas = applyEffects(state, { drama: 24, heat: 14, realityDrift: 14, trust: -8 });
    const followerDeltas = applyFollowers(state, { dramaFollowers: 8, realityRelatives: 4 });
    state.report = {
      kind: "collapse",
      title: "AUNT JPEG THINKS QWEN FRANKLIN IS REAL",
      body: "Aunt JPEG insists the account proves Benjamin Franklin is alive. Uncle Signal believes he is transmitting from 1776. Cousin Reply Guy has started an electricity argument under the demo link.",
      effectsText: summarizeDeltas({ metrics: effectDeltas, followers: followerDeltas, relationships: {} }),
      source: "media-literacy context collapse",
      audience: "family thread, builders, demo lurkers",
      context: "Escaped",
      benefited: "nobody except Cousin Reply Guy's typing stamina",
      annoyed: "Aunt JPEG, Uncle Signal, and anyone who knows what synthetic means",
      affectedNodes: state.affectedNodes,
      responseOptions: ["explainSynthetic", "moveQwenDms", "pinMediaLiteracy", "letProjectSpeak", "muteQwenThread"],
      responseRequired: true,
      guestAvatar: "qwen-franklin",
      credit: QWEN_FRANKLIN_GUEST_BANNER,
      showGuestLinks: true,
      mechanicalNote: "Opening the credited project is a response choice; the fallout remains a SignalBarn media-literacy problem.",
    };
  }

  if (kind === "victory") {
    applyEffects(state, { trust: 16, agency: 24, belonging: 22, skillCred: 24, drama: -10, heat: -8 });
    state.pathMilestones.community.helpfulMemberEvents = 5;
    state.pathMilestones.community.moderationSuccesses = 3;
    state.pathMilestones.community.recurringContributors = 7;
    state.pathMilestones.community.healthyGroupDays = 6;
    state.pathMilestones.knowledge.tutorialsPosted = 4;
    state.pathMilestones.knowledge.peopleHelped = 9;
    state.pathMilestones.knowledge.expertInteractions = 2;
    state.pathMilestones.knowledge.mentorInteractions = 2;
    state.pathMilestones.knowledge.usefulThreadsPinned = 2;
    state.day = RUN_LENGTH_DAYS;
    state.eventsHosted = 4;
    const ending = pickEnding(state);
    state.summary = buildSummary(state, ending.outcome, ending.title, ending);
  }

  if (kind === "failure") {
    applyEffects(state, { trust: -60, drama: 80, burnout: 72, heat: 65, realityDrift: 34 });
    applyFollowers(state, { dramaFollowers: 380, closeFriends: -5 });
    state.day = 23;
    state.worstContextCollapse = "The family thread and coworker thread merged into one bad room.";
    const ending = pickFailureEnding(state, "Context Collapse");
    state.summary = buildSummary(state, "failure", ending.title, ending);
  }

  if (kind.startsWith("victory") && kind !== "victory") {
    prepareVictoryDemo(state, kind.replace("victory", "") as PathKey);
  }

  if (kind.startsWith("failure") && kind !== "failure") {
    prepareFailureDemo(state, kind);
  }

  updateImmediateDerivedValues(state);
  state.scorePreview = calculateScore(state);
  return state;
}

function prepareVictoryDemo(state: GameState, path: PathKey): void {
  state.pathMilestones = createEmptyPathMilestones();
  state.joinedCommunityIds = [];
  state.createdGroup = undefined;
  state.day = RUN_LENGTH_DAYS;
  state.metrics = {
    reach: path === "Viral" ? 3300 : 1450,
    trust: path === "Viral" ? 58 : 72,
    agency: path === "Escape" ? 72 : 68,
    belonging: path === "Creator" || path === "Knowledge" ? 58 : 72,
    drama: 18,
    burnout: path === "Escape" ? 28 : 36,
    heat: path === "Viral" ? 62 : path === "Escape" ? 28 : 34,
    realityDrift: 18,
    skillCred: path === "Organizer" || path === "Relationship" ? 56 : 72,
  };
  state.followers = {
    closeFriends: 8,
    nicheMembers: 210,
    casualFollowers: path === "Viral" ? 900 : 280,
    dramaFollowers: path === "Viral" ? 70 : 12,
    opportunityContacts: 6,
    realityRelatives: 5,
  };
  state.relationships = Object.fromEntries(RELATIONSHIPS.map((name) => [name, 70])) as Record<
    RelationshipKey,
    number
  >;

  if (path === "Community") {
    state.joinedCommunityIds = ["linux-forum"];
    state.createdGroup = makeDemoGroup(82);
    state.pathMilestones.community = {
      helpfulMemberEvents: 5,
      moderationSuccesses: 3,
      recurringContributors: 7,
      healthyGroupDays: 6,
      memberSupportActions: 5,
    };
  }
  if (path === "Viral") {
    state.pathMilestones.viral = {
      viralEvents: 5,
      viralOpportunitiesConverted: 3,
      falloutManaged: 3,
      peakReach: 3300,
      destructiveViralEvents: 1,
    };
    state.biggestViralEvent = "A useful thread escaped the barn and came back with collaborators.";
  }
  if (path === "Knowledge") {
    state.pathMilestones.knowledge = {
      tutorialsPosted: 5,
      peopleHelped: 12,
      expertInteractions: 3,
      usefulThreadsPinned: 3,
      mentorInteractions: 2,
    };
  }
  if (path === "Relationship") {
    state.pathMilestones.relationship = {
      privateRepairs: 5,
      closeFriendsPreserved: 8,
      publicConflictsResolved: 3,
      relationshipLosses: 0,
      directMessagesSent: 5,
    };
  }
  if (path === "Creator") {
    state.pathMilestones.creator = {
      buildLogsPosted: 5,
      projectMilestones: 4,
      collaboratorsFound: 4,
      opportunitiesConverted: 3,
      usefulOutputsPublished: 5,
    };
  }
  if (path === "Organizer") {
    state.joinedCommunityIds = ["local-events"];
    state.createdGroup = makeDemoGroup(76);
    state.pathMilestones.organizer = {
      eventsHosted: 5,
      totalAttendance: 56,
      recurringParticipants: 15,
      groupChallengesCompleted: 3,
      offlineActionsCompleted: 5,
    };
  }
  if (path === "Escape") {
    state.pathMilestones.escape = {
      directContactsBuilt: 6,
      offlineDays: 7,
      boundariesSet: 5,
      platformDependenceReduced: 5,
      exitPlanCompleted: true,
    };
  }

  updateImmediateDerivedValues(state);
  const ending = pickEnding(state);
  state.summary = buildSummary(state, ending.outcome, ending.title, ending);
}

function prepareFailureDemo(state: GameState, kind: string): void {
  state.pathMilestones = createEmptyPathMilestones();
  state.day = 24;
  state.recentPost = "A risky thread reached the wrong audience";
  state.metrics = {
    reach: 1800,
    trust: 32,
    agency: 34,
    belonging: 42,
    drama: 70,
    burnout: 66,
    heat: 72,
    realityDrift: 36,
    skillCred: 42,
  };
  state.followers = {
    closeFriends: 4,
    nicheMembers: 100,
    casualFollowers: 460,
    dramaFollowers: 130,
    opportunityContacts: 2,
    realityRelatives: 10,
  };
  let failure = "Context Collapse";
  if (kind === "failureFeedRot") {
    failure = "Feed Rot";
    state.metrics.reach = 4600;
    state.metrics.trust = 28;
    state.followers.dramaFollowers = 220;
  }
  if (kind === "failureUnfriended") {
    failure = "Unfriended by Christmas";
    state.followers.closeFriends = 1;
    state.relationships["Old Friend Nate"] = 12;
  }
  if (kind === "failureNiche") {
    failure = "Niche Capture";
    state.metrics.realityDrift = 82;
    state.metrics.trust = 38;
    state.followers.realityRelatives = 42;
  }
  if (kind === "failureBurnout") {
    failure = "Burnout Spiral";
    state.metrics.burnout = 94;
  }
  if (kind === "failureReplyGuy") {
    failure = "Reply Guy Singularity";
    state.relationships["Cousin Reply Guy"] = 18;
    state.followers.dramaFollowers = 280;
  }
  if (kind === "failureAlgorithm") {
    failure = "Algorithm Dependent";
    state.metrics.heat = 94;
    state.metrics.agency = 30;
    state.pathMilestones.viral.viralOpportunitiesConverted = 0;
  }
  if (kind === "failureContext") {
    state.metrics.trust = 20;
    state.metrics.drama = 88;
    state.metrics.heat = 80;
  }
  state.worstContextCollapse = `${failure} followed ${state.recentPost}.`;
  const ending = pickFailureEnding(state, failure);
  state.summary = buildSummary(state, "failure", ending.title, ending);
}

function makeDemoGroup(health: number): CreatedGroup {
  return {
    name: "Demo Independence Room",
    premise: "Small-town project board",
    tone: "welcoming",
    rules: "no argument spirals",
    firstPost: "One small win per day.",
    members: 88,
    health,
  };
}

function buildDayReport(state: GameState, action: ActionCard): DayReport {
  const qwenInvitation = maybeBuildQwenInvitationReport(state, action);
  if (qwenInvitation) {
    return qwenInvitation;
  }

  const qwenCollapse = maybeBuildQwenAuntCollapseReport(state, action);
  if (qwenCollapse) {
    return qwenCollapse;
  }

  const reportLane = chooseReportLane(state, action);

  if (reportLane === "viral") {
    const viralGain = 420 + Math.round(state.metrics.heat * 6 + action.viralPotential * 18);
    const effectDeltas = applyEffects(state, { reach: viralGain, drama: 10, heat: 10, burnout: 3, agency: 4 });
    const followerDeltas = applyFollowers(state, { casualFollowers: 32, dramaFollowers: 18, opportunityContacts: 1 });
    const report: DayReport = {
      kind: "viral",
      title: `${action.title} Escapes The Barn`,
      body: `${PLATFORM_NAME} pushes it beyond the intended room. Opportunity knocks, then Cousin Reply Guy knocks louder.`,
      effectsText: summarizeDeltas({ metrics: effectDeltas, followers: followerDeltas, relationships: {} }),
      source: sample(["community share", "reply fight", "algorithm bump", "screenshot spread", "expert boost"]),
      audience: inferAudience(action.tags),
      context: "Escaped",
      benefited: action.tags.includes("knowledge") ? "skill credibility" : "raw reach",
      annoyed: action.tags.includes("family") ? "Concerned Relative" : "Coworker Maya",
      affectedNodes: Array.from(new Set([...affectedFromRelationships(action.relationships), "Cousin Reply Guy", "Coworker Maya"])),
      responseOptions: ["clarify", "private", "lean", "delete", "pin", "mute", "tutorial", "logoff"],
      responseRequired: true,
    };
    state.pathMilestones.viral.viralEvents += 1;
    state.pathMilestones.viral.peakReach = Math.max(state.pathMilestones.viral.peakReach, state.metrics.reach);
    state.biggestViralEvent = report.title;
    return report;
  }

  if (reportLane === "collapse") {
    const effectDeltas = applyEffects(state, { trust: -8, drama: 11, heat: 8, burnout: 4 });
    const followerDeltas = applyFollowers(state, { dramaFollowers: 12 });
    const report: DayReport = {
      kind: "collapse",
      title: "Context Collapse: The Wrong Room Found It",
      body: "A post meant for one circle arrives in another with all the nuance sanded off.",
      effectsText: summarizeDeltas({ metrics: effectDeltas, followers: followerDeltas, relationships: {} }),
      source: sample(["family argument", "screenshot spread", "quote-share", "reply fight"]),
      audience: "close friends, relatives, coworkers, strangers",
      context: "Escaped",
      benefited: "Cousin Reply Guy",
      annoyed: "Old Friend Nate",
      affectedNodes: Array.from(new Set([...affectedFromRelationships(action.relationships), "Old Friend Nate", "Concerned Relative", "Cousin Reply Guy"])),
      responseOptions: ["clarify", "private", "delete", "apologize", "friend", "mute", "logoff"],
      responseRequired: true,
    };
    state.pathMilestones.viral.destructiveViralEvents += 1;
    state.worstContextCollapse = report.title;
    return report;
  }

  const matchingEvents = FEED_EVENTS.filter((event) =>
    event.tags.some((tag) => action.tags.includes(tag)),
  );
  const eventPool = matchingEvents.length ? matchingEvents : FEED_EVENTS;
  const event = sample(eventPool);
  const eventDeltas = applyFeedEvent(state, event);
  applyFeedEventMilestones(state, event);
  return {
    kind: "feed",
    title: event.title,
    body: event.body,
    effectsText: summarizeDeltas(eventDeltas),
    source: "feed reaction",
    audience: inferAudience(event.tags),
    context: inferContext(state, event.tags),
    benefited: event.tags.includes("good") ? "useful people" : "the feed",
    annoyed: event.tags.includes("drama") || event.tags.includes("context") ? "quiet friends" : "nobody important",
    affectedNodes: affectedFromRelationships(event.relationships),
  };
}

function chooseReportLane(state: GameState, action: ActionCard): "viral" | "collapse" | "feed" {
  const contextCollapseRisk =
    state.metrics.heat * 0.26 +
    state.metrics.drama * 0.3 +
    state.metrics.realityDrift * 0.2 +
    (action.tags.includes("context") ? 15 : 0) +
    (action.tags.includes("family") || action.tags.includes("reality") ? 9 : 0) +
    (action.tags.includes("argument") ? 11 : 0);
  const viralChance =
    action.viralPotential +
    state.metrics.heat * 0.2 +
    state.metrics.drama * 0.07 +
    (state.joinedCommunityIds.length + (state.createdGroup ? 1 : 0)) * 2;

  const collapseLimit = state.day > 4 ? Math.min(30, contextCollapseRisk) : 0;
  const viralLimit = Math.min(36, viralChance);
  const collapseTriggered = Math.random() * 100 < collapseLimit;
  const viralTriggered = Math.random() * 100 < viralLimit;

  if (collapseTriggered && viralTriggered) {
    const contextHeavy =
      contextCollapseRisk >= viralChance ||
      action.tags.includes("context") ||
      action.tags.includes("family") ||
      action.tags.includes("reality");
    return contextHeavy ? "collapse" : "viral";
  }
  if (collapseTriggered) return "collapse";
  if (viralTriggered) return "viral";
  return "feed";
}

function maybeBuildQwenInvitationReport(state: GameState, action: ActionCard): DayReport | undefined {
  if (state.qwenInvitationSeen || state.day < 8 || state.day > 14) {
    return undefined;
  }
  const hasMatchingInterest = hasQwenInterestSignal(state, action);
  const forcedCatchup = state.day === 14;
  const chance = hasMatchingInterest ? 100 : forcedCatchup ? 34 : 18;
  if (Math.random() * 100 >= chance) {
    return undefined;
  }

  state.qwenInvitationSeen = true;
  state.affectedNodes = Array.from(
    new Set([...state.affectedNodes, "Linux Forum Mentor", "Aunt JPEG", "Uncle Signal", "Cousin Reply Guy"]),
  );
  return buildQwenInvitationReport(state.affectedNodes);
}

function hasQwenInterestSignal(state: GameState, action: ActionCard): boolean {
  const interestTags = ["knowledge", "tutorial", "learning", "creator", "project", "retro", "linux", "community", "builder"];
  const qwenInterestIds: InterestKey[] = ["technology", "coding", "creator", "retro", "history", "community"];
  const interestRooms = ["linux-forum", "coding-circle", "vintage-computer", "local-events", "founders-future-society"];
  return (
    state.interestIds.some((id) => qwenInterestIds.includes(id)) ||
    action.tags.some((tag) => interestTags.includes(tag)) ||
    state.joinedCommunityIds.some((id) => interestRooms.includes(id))
  );
}

function buildQwenInvitationReport(affectedNodes: string[]): DayReport {
  return {
    kind: "feed",
    title: "QWEN FRANKLIN HAS SENT YOU AN INVITATION",
    body: "An unusually articulate founding father has invited you to the Founders & Future Society, a group for history nerds, AI builders, civic experiments, and people with extremely specific opinions about bifocals.",
    effectsText: ["Featured Guest Signal", "Knowledge Opportunity", "Context Risk"],
    source: "friendly competition crossover",
    audience: "history nerds, AI builders, civic tinkerers, relatives with questions",
    context: "Fraying",
    benefited: "Knowledge path and niche builders",
    annoyed: "anyone allergic to media-literacy labels",
    affectedNodes,
    responseOptions: ["joinSociety", "shareQwenDemo", "inviteQwenGuestPost", "declineQwen"],
    responseRequired: true,
    guestAvatar: "qwen-franklin",
    credit: QWEN_FRANKLIN_GUEST_BANNER,
    showGuestLinks: true,
    mechanicalNote: "Optional guest event. Modest rewards, context risk, and no victory requirement.",
  };
}

function maybeBuildQwenAuntCollapseReport(state: GameState, action: ActionCard): DayReport | undefined {
  if (
    state.qwenAuntCollapseSeen ||
    state.day <= 8 ||
    (!state.qwenSocietyUnlocked && !state.qwenGuestPosted && !state.qwenDemoShared)
  ) {
    return undefined;
  }
  const riskTags = ["context", "family", "reality", "viral", "weird"];
  const chance =
    (action.tags.some((tag) => riskTags.includes(tag)) ? 12 : 4) +
    (state.metrics.heat > 55 ? 4 : 0) +
    (state.metrics.realityDrift > 35 ? 4 : 0);
  if (Math.random() * 100 >= Math.min(24, chance)) {
    return undefined;
  }

  state.qwenAuntCollapseSeen = true;
  state.worstContextCollapse = "Aunt JPEG thought Qwen Franklin was real.";
  state.pathMilestones.viral.destructiveViralEvents += 1;
  const effectDeltas = applyEffects(state, { drama: 12, heat: 8, realityDrift: 10, trust: -4, burnout: 3 });
  const followerDeltas = applyFollowers(state, { dramaFollowers: 8, realityRelatives: 4 });
  const relationshipDeltas = applyRelationships(state, { "Aunt JPEG": -5, "Uncle Signal": -3, "Cousin Reply Guy": -2 });
  const affectedNodes = ["Aunt JPEG", "Uncle Signal", "Cousin Reply Guy", "Linux Forum Mentor"];
  state.affectedNodes = Array.from(new Set([...state.affectedNodes, ...affectedNodes]));

  return {
    kind: "collapse",
    title: "AUNT JPEG THINKS QWEN FRANKLIN IS REAL",
    body: "Aunt JPEG insists the account proves Benjamin Franklin is alive. Uncle Signal believes he is transmitting from 1776. Cousin Reply Guy has started an electricity argument under the demo link.",
    effectsText: summarizeDeltas({
      metrics: effectDeltas,
      followers: followerDeltas,
      relationships: relationshipDeltas,
    }),
    source: "media-literacy context collapse",
    audience: "family thread, builders, demo lurkers",
    context: "Escaped",
    benefited: "nobody except Cousin Reply Guy's typing stamina",
    annoyed: "Aunt JPEG, Uncle Signal, and anyone who knows what synthetic means",
    affectedNodes,
    responseOptions: ["explainSynthetic", "moveQwenDms", "pinMediaLiteracy", "letProjectSpeak", "muteQwenThread"],
    responseRequired: true,
    guestAvatar: "qwen-franklin",
    credit: QWEN_FRANKLIN_GUEST_BANNER,
    showGuestLinks: true,
    mechanicalNote: "The joke is audience context collapse and media literacy; Qwen's project is credited, useful, and fictionalized here.",
  };
}

function applyFeedEvent(state: GameState, event: FeedEvent): AppliedDeltas {
  const effectDeltas = applyEffects(state, event.effects);
  const followerDeltas = applyFollowers(state, event.followers);
  const relationshipDeltas = applyRelationships(state, event.relationships);
  if (event.tags.includes("context")) {
    state.worstContextCollapse = event.title;
  }
  return {
    metrics: effectDeltas,
    followers: followerDeltas,
    relationships: relationshipDeltas,
  };
}

function applyFeedEventMilestones(state: GameState, event: FeedEvent): void {
  const p = state.pathMilestones;
  if (event.tags.includes("good") || event.id === "regulars-help-newcomer") {
    p.community.helpfulMemberEvents += 1;
  }
  if (event.tags.includes("knowledge")) {
    p.knowledge.peopleHelped += 2;
    p.knowledge.mentorInteractions += event.id.includes("mentor") || event.id.includes("expert") ? 1 : 0;
  }
  if (event.tags.includes("creator")) {
    p.creator.collaboratorsFound += 1;
  }
  if (event.tags.includes("organizer") || event.tags.includes("offline")) {
    p.organizer.recurringParticipants += 2;
    p.escape.directContactsBuilt += 1;
  }
  if (event.tags.includes("relationship") || event.tags.includes("repair")) {
    p.relationship.privateRepairs += 1;
    p.relationship.publicConflictsResolved += 1;
  }
  if (event.tags.includes("viral")) {
    p.viral.viralEvents += 1;
    p.viral.peakReach = Math.max(p.viral.peakReach, state.metrics.reach);
  }
  if (event.tags.includes("context") || event.tags.includes("drama")) {
    p.viral.destructiveViralEvents += event.tags.includes("context") ? 1 : 0;
  }
}

function addFeedItem(state: GameState, item: Omit<FeedItem, "id" | "day">): void {
  state.feedItems = [
    {
      ...item,
      id: `day-${state.day}-${state.feedItems.length}-${Math.round(Math.random() * 9999)}`,
      day: state.day,
    },
    ...state.feedItems,
  ].slice(0, 7);
}

function addQwenGuestPostFeedCard(state: GameState): void {
  addFeedItem(state, {
    title: "Qwen Franklin guest-posts a useful explainer",
    body: "The guest account explains synthetic historical characters, visible attribution, and why civic imagination works better with labels.",
    kind: "feed",
    audience: "history nerds, AI builders, civic tinkerers",
    context: state.metrics.heat > 58 ? "Fraying" : "Contained",
    reactions: 96,
    comments: 14,
    shares: 9,
    guestAvatar: "qwen-franklin",
    commentSamples: [
      { author: "Linux Forum Mentor", text: "Clear provenance. Good practice.", tone: "useful" },
      { author: "Aunt JPEG", text: "So he is not literally in the laptop?", tone: "worry" },
    ],
  });
}

function addQwenSocietyFeedCard(state: GameState, title: string): void {
  addFeedItem(state, {
    title,
    body: "A credited guest signal from Myles's Founding Father A.I. arrives inside SignalBarn, scripted and safely fictional.",
    kind: "feed",
    audience: "Founders & Future Society and adjacent builders",
    context: state.metrics.realityDrift > 48 ? "Fraying" : "Contained",
    reactions: 54,
    comments: 9,
    shares: 4,
    guestAvatar: "qwen-franklin",
    commentSamples: [
      { author: "Coworker Maya", text: "This is the right kind of labeling.", tone: "dry" },
      { author: "Cousin Reply Guy", text: "But what distro would Franklin use?", tone: "chaos" },
    ],
  });
}

function makeComments(tags: string[], kind: DayReport["kind"]): FeedItem["commentSamples"] {
  if (kind === "viral") {
    return [
      { author: "Cousin Reply Guy", text: "Finally, a normal place to argue about printers.", tone: "chaos" },
      { author: "Coworker Maya", text: "I am seeing this against my will.", tone: "dry" },
    ];
  }
  if (kind === "collapse") {
    return [
      { author: "Concerned Relative", text: "This reached the family chat.", tone: "worry" },
      { author: "Old Friend Nate", text: "Please do not make me perceive this.", tone: "warm" },
    ];
  }
  if (tags.includes("knowledge")) {
    return [
      { author: "Linux Forum Mentor", text: "Useful. Add version numbers.", tone: "useful" },
      { author: "Coworker Maya", text: "Credible and not exhausting.", tone: "dry" },
    ];
  }
  if (tags.includes("family") || tags.includes("reality")) {
    return [
      { author: "Aunt JPEG", text: "The pixels know things.", tone: "chaos" },
      { author: "Concerned Relative", text: "Maybe cite one source?", tone: "worry" },
    ];
  }
  return [
    { author: "Old Friend Nate", text: "This is almost a normal post.", tone: "warm" },
    { author: "Cousin Reply Guy", text: "Counterpoint: keyboards.", tone: "chaos" },
  ];
}

function applyActionMilestones(state: GameState, action: ActionCard, multiplier: number): void {
  const p = state.pathMilestones;
  const strong = multiplier >= 0.7;
  const weak = multiplier < 0.45;

  if (action.id === "share-tip" || action.id === "publish-followup-explainer") {
    p.knowledge.tutorialsPosted += strong ? 1 : 0;
    p.knowledge.peopleHelped += strong ? 2 : 1;
    p.creator.usefulOutputsPublished += 1;
  }
  if (action.id === "ask-expert" || action.id === "ask-linux-help") {
    p.knowledge.expertInteractions += action.id === "ask-expert" ? 1 : 0;
    p.knowledge.mentorInteractions += 1;
    p.knowledge.peopleHelped += weak ? 0 : 1;
  }
  if (action.id === "pin-useful-thread" || action.id === "publish-followup-explainer") {
    p.knowledge.usefulThreadsPinned += action.id === "pin-useful-thread" ? 1 : 0;
    p.community.helpfulMemberEvents += 1;
  }
  if (action.id === "tiny-build-log") {
    p.creator.buildLogsPosted += 1;
    p.creator.projectMilestones += strong ? 1 : 0;
    p.creator.usefulOutputsPublished += 1;
  }
  if (action.id === "turn-viral-project") {
    p.creator.projectMilestones += 1;
    p.creator.opportunitiesConverted += 1;
    p.viral.viralOpportunitiesConverted += 1;
  }
  if (action.id === "convert-attention-list" || action.id === "contact-opportunity-lead") {
    p.viral.viralOpportunitiesConverted += 1;
    p.creator.opportunitiesConverted += 1;
    p.creator.collaboratorsFound += 1;
  }
  if (action.id === "invite-followers-room") {
    p.viral.viralOpportunitiesConverted += 1;
    p.community.helpfulMemberEvents += 1;
    p.community.recurringContributors += 1;
  }
  if (action.id === "signal-boost" || action.id === "celebrate-win") {
    p.community.helpfulMemberEvents += 1;
    p.community.memberSupportActions += 1;
  }
  if (action.id === "recruit-members") {
    p.community.recurringContributors += 2;
    p.community.memberSupportActions += 1;
  }
  if (action.id === "moderate-thread" || action.id === "moderate-fight" || action.id === "delegate-moderation") {
    p.community.moderationSuccesses += 1;
    p.relationship.publicConflictsResolved += 1;
    if (action.id === "delegate-moderation") {
      p.community.recurringContributors += 2;
      p.viral.falloutManaged += 1;
    }
  }
  if (action.id === "host-event" || action.id === "small-town-meetup") {
    const attendance = action.id === "small-town-meetup" ? 12 : 10;
    p.organizer.eventsHosted += 1;
    p.organizer.totalAttendance += attendance + Math.max(0, Math.round(state.followers.nicheMembers / 40));
    p.organizer.recurringParticipants += 3;
    p.organizer.offlineActionsCompleted += 1;
    p.escape.directContactsBuilt += 1;
    p.escape.offlineDays += 1;
  }
  if (action.id === "group-challenge") {
    p.organizer.groupChallengesCompleted += 1;
    p.organizer.recurringParticipants += 3;
    p.community.helpfulMemberEvents += 1;
  }
  if (action.id === "private-message" || action.id === "dm-person") {
    p.relationship.privateRepairs += 1;
    p.relationship.directMessagesSent += 1;
    p.escape.directContactsBuilt += 1;
  }
  if (action.id === "apologize" || action.id === "refuse-argue") {
    p.relationship.publicConflictsResolved += 1;
    p.relationship.privateRepairs += action.id === "apologize" ? 1 : 0;
  }
  if (action.id === "block-mute" || action.id === "refuse-argue" || action.id === "schedule-recovery") {
    p.escape.boundariesSet += 1;
    p.escape.platformDependenceReduced += 1;
  }
  if (action.id === "touch-grass" || action.id === "weekend-offline" || action.id === "schedule-recovery") {
    p.escape.offlineDays += action.id === "weekend-offline" ? 2 : 1;
    p.escape.platformDependenceReduced += 1;
  }
  if (action.id === "take-community-independent") {
    p.escape.exitPlanCompleted = true;
    p.escape.directContactsBuilt += 2;
    p.escape.offlineDays += 1;
    p.escape.platformDependenceReduced += 2;
  }
  if ((action.followers?.opportunityContacts ?? 0) > 0) {
    p.creator.collaboratorsFound += 1;
  }
  p.viral.peakReach = Math.max(p.viral.peakReach, state.metrics.reach);
}

function applyResponseMilestones(state: GameState, response: ResponseKey, report?: DayReport): void {
  const p = state.pathMilestones;
  const wasViral = report?.kind === "viral";
  const wasCollapse = report?.kind === "collapse";
  if (wasViral || wasCollapse) {
    if (["clarify", "private", "delete", "pin", "mute", "tutorial", "logoff", "friend", "apologize"].includes(response)) {
      p.viral.falloutManaged += wasViral ? 1 : 0;
      p.relationship.publicConflictsResolved += wasCollapse ? 1 : 0;
    }
  }
  if (response === "tutorial" || response === "pinMediaLiteracy") {
    p.knowledge.tutorialsPosted += 1;
    p.knowledge.peopleHelped += 2;
    p.knowledge.usefulThreadsPinned += 1;
    p.viral.viralOpportunitiesConverted += wasViral ? 1 : 0;
    p.creator.usefulOutputsPublished += 1;
  }
  if (response === "pin") {
    p.knowledge.usefulThreadsPinned += 1;
    p.community.moderationSuccesses += 1;
  }
  if (response === "private" || response === "moveQwenDms") {
    p.relationship.privateRepairs += 1;
    p.relationship.directMessagesSent += 1;
    p.escape.directContactsBuilt += 1;
  }
  if (response === "clarify" || response === "apologize" || response === "friend" || response === "explainSynthetic") {
    p.relationship.publicConflictsResolved += 1;
    p.relationship.privateRepairs += response === "apologize" ? 1 : 0;
  }
  if (response === "delete" || response === "mute" || response === "logoff" || response === "muteQwenThread") {
    p.escape.boundariesSet += 1;
    p.escape.platformDependenceReduced += 1;
  }
  if (response === "lean") {
    p.viral.viralEvents += 1;
    p.viral.destructiveViralEvents += 1;
  }
  if (response === "letProjectSpeak") {
    p.knowledge.expertInteractions += 1;
    p.knowledge.peopleHelped += 1;
  }
  p.viral.peakReach = Math.max(p.viral.peakReach, state.metrics.reach);
}

function applyDailyMaintenance(state: GameState): void {
  const effects: Partial<Metrics> = { drama: -1, heat: -1, burnout: 1 };
  if (!hasRecentActionTag(state, ["relationship", "private", "repair"], 5) && state.day > 6) {
    effects.trust = (effects.trust ?? 0) - 1;
    for (const name of ["Old Friend Nate", "Concerned Relative", "Coworker Maya"] as RelationshipKey[]) {
      state.relationships[name] = clamp(state.relationships[name] - 1, 0, 100);
    }
  }
  if (!hasRecentActionTag(state, ["community", "organizer", "ally", "moderation"], 4) && state.day > 5) {
    effects.belonging = (effects.belonging ?? 0) - 1;
    if (state.createdGroup) {
      state.createdGroup.health = clamp(state.createdGroup.health - 2, 0, 100);
    }
  }
  if (!hasRecentActionTag(state, ["knowledge", "creator", "learning", "tutorial"], 5) && state.day > 7) {
    effects.skillCred = (effects.skillCred ?? 0) - 1;
  }
  if (state.metrics.reach > 2500) {
    effects.burnout = (effects.burnout ?? 0) + 1;
    effects.heat = (effects.heat ?? 0) + 1;
  }
  if (state.metrics.heat > 72) {
    effects.trust = (effects.trust ?? 0) - 1;
    effects.burnout = (effects.burnout ?? 0) + 1;
  }
  applyEffects(state, effects);
}

function updateImmediateDerivedValues(state: GameState): void {
  const p = state.pathMilestones;
  p.relationship.closeFriendsPreserved = Math.max(
    p.relationship.closeFriendsPreserved,
    Math.min(9, state.followers.closeFriends),
  );
  p.relationship.relationshipLosses = Math.max(0, 6 - state.followers.closeFriends);
  p.viral.peakReach = Math.max(p.viral.peakReach, state.metrics.reach);
}

function recordCompletedDayMilestones(state: GameState): void {
  if (!hasHealthyCommunityForCompletedDay(state)) {
    return;
  }

  const completedDayCap = Math.min(RUN_LENGTH_DAYS, Math.max(0, state.day));
  state.pathMilestones.community.healthyGroupDays = Math.min(
    completedDayCap,
    state.pathMilestones.community.healthyGroupDays + 1,
  );
}

function hasHealthyCommunityForCompletedDay(state: GameState): boolean {
  return (
    Boolean(state.createdGroup && state.createdGroup.health >= 70) ||
    state.joinedCommunityIds.some((id) => getCommunity(id)?.tone === "healthy")
  );
}

function applyEffects(state: GameState, effects: Partial<Metrics> = {}, multiplier = 1): Partial<Metrics> {
  const deltas: Partial<Metrics> = {};
  for (const [key, value] of Object.entries(effects) as [MetricKey, number][]) {
    const [min, max] = METRIC_LIMITS[key];
    const before = state.metrics[key];
    const scaledValue = value > 0 && BENEFICIAL_METRICS.has(key) ? value * multiplier : value;
    state.metrics[key] = clamp(state.metrics[key] + scaleMetricDelta(key, state.metrics[key], scaledValue), min, max);
    const actual = state.metrics[key] - before;
    if (actual) {
      deltas[key] = actual;
    }
  }
  return deltas;
}

function scaleMetricDelta(key: MetricKey, current: number, delta: number): number {
  if (delta <= 0) {
    return delta;
  }

  if (key === "reach") {
    if (current >= 5000) return Math.round(delta * 0.25);
    if (current >= 2600) return Math.round(delta * 0.42);
    if (current >= 1200) return Math.round(delta * 0.62);
    return Math.round(delta);
  }

  if (current >= 95) return 0;
  if (current >= 85) return Math.round(delta * 0.15);
  if (current >= 70) return Math.round(delta * 0.4);
  if (current >= 55) return Math.round(delta * 0.7);
  return Math.round(delta);
}

function applyFollowers(state: GameState, followers: Partial<Followers> = {}, multiplier = 1): Partial<Followers> {
  const deltas: Partial<Followers> = {};
  for (const [key, value] of Object.entries(followers) as [FollowerKey, number][]) {
    const [min, max] = FOLLOWER_LIMITS[key];
    const before = state.followers[key];
    const scaledValue = value > 0 && BENEFICIAL_FOLLOWERS.has(key) ? Math.round(value * multiplier) : value;
    state.followers[key] = clamp(state.followers[key] + scaledValue, min, max);
    const actual = state.followers[key] - before;
    if (actual) {
      deltas[key] = actual;
    }
  }
  return deltas;
}

function applyRelationships(
  state: GameState,
  relationships: Partial<Record<RelationshipKey, number>> = {},
): Partial<Record<RelationshipKey, number>> {
  const deltas: Partial<Record<RelationshipKey, number>> = {};
  for (const [name, value] of Object.entries(relationships) as [RelationshipKey, number][]) {
    const before = state.relationships[name];
    state.relationships[name] = clamp(state.relationships[name] + value, 0, 100);
    const actual = state.relationships[name] - before;
    if (actual) {
      deltas[name] = actual;
    }
  }
  return deltas;
}

function checkFailure(state: GameState): string | undefined {
  const m = state.metrics;
  const f = state.followers;
  const replyGuy = state.relationships["Cousin Reply Guy"];
  if (m.burnout >= 92) return "Burnout Spiral";
  if (m.trust <= 16 && m.drama >= 88 && m.heat >= 82) return "Context Collapse";
  if (m.reach > 6200 && m.trust < 28 && f.dramaFollowers > 280) return "Feed Rot";
  if (f.closeFriends <= 2 || (state.relationships["Old Friend Nate"] <= 18 && state.pathMilestones.relationship.relationshipLosses >= 3)) {
    return "Unfriended by Christmas";
  }
  if (m.realityDrift >= 72 && f.realityRelatives >= 18 && m.trust < 48) return "Niche Capture";
  if (replyGuy <= 25 && f.dramaFollowers > 210 && m.drama >= 64) return "Reply Guy Singularity";
  if (m.heat >= 90 && m.agency < 45 && state.pathMilestones.viral.viralOpportunitiesConverted === 0) return "Algorithm Dependent";
  return undefined;
}

interface EndingDecision {
  outcome: "victory" | "failure";
  title: string;
  primaryPath: string;
  secondaryPath?: string;
  failureCause?: string;
  strongestRemainingPath: string;
  completedMilestones: string[];
  missedThresholds: string[];
  biggestTurningPoint: string;
  decisiveMoment: string;
  triggeringEvent: string;
  strategyHint: string;
}

function pickEnding(state: GameState): EndingDecision {
  const progress = getVictoryPathProgress(state).sort((a, b) => b.value - a.value);
  const qualified = progress.filter((path) => path.qualifies);
  if (!qualified.length) {
    return pickNonVictoryEnding(state, progress);
  }
  const primary = qualified[0];
  const secondary = qualified.find(
    (path) => path.name !== primary.name && qualifiesAsHybridSecondary(state, primary, path),
  );
  return {
    outcome: "victory",
    title: secondary ? `Hybrid Victory: ${primary.name} + ${secondary.name}` : `${primary.name} Victory`,
    primaryPath: primary.name,
    secondaryPath: secondary?.name,
    strongestRemainingPath:
      progress.find((path) => path.name !== primary.name && path.name !== secondary?.name)?.name ?? "None",
    completedMilestones: completedMilestoneLabels(state, primary.name, secondary?.name),
    missedThresholds: missedMilestoneLabels(state, primary.name, secondary?.name),
    biggestTurningPoint: biggestTurningPoint(state),
    decisiveMoment: decisiveMomentFor(state, primary.name, secondary?.name),
    triggeringEvent: state.recentPost,
    strategyHint: strategyHintFor(primary.name, secondary?.name),
  };
}

function qualifiesAsHybridSecondary(
  state: GameState,
  primary: ReturnType<typeof getVictoryPathProgress>[number],
  candidate: ReturnType<typeof getVictoryPathProgress>[number],
): boolean {
  if (candidate.value < 86 || primary.value - candidate.value > 5) {
    return false;
  }

  const milestones = state.pathMilestones;
  if (primary.name === "Creator" && candidate.name === "Knowledge") {
    return (
      candidate.value >= 92 &&
      milestones.knowledge.tutorialsPosted >= 6 &&
      milestones.knowledge.usefulThreadsPinned >= 4 &&
      milestones.knowledge.expertInteractions + milestones.knowledge.mentorInteractions >= 6
    );
  }

  if (primary.name === "Knowledge" && candidate.name === "Creator") {
    return milestones.creator.projectMilestones >= 4 && milestones.creator.opportunitiesConverted >= 3;
  }

  if (primary.name === "Escape" && candidate.name === "Relationship") {
    return (
      candidate.value >= 94 &&
      milestones.relationship.privateRepairs >= 7 &&
      milestones.relationship.publicConflictsResolved >= 5
    );
  }

  if (primary.name === "Relationship" && candidate.name === "Escape") {
    return (
      milestones.escape.exitPlanCompleted &&
      milestones.escape.directContactsBuilt >= 4 &&
      milestones.escape.boundariesSet >= 3
    );
  }

  return true;
}

function pickFailureEnding(state: GameState, failure: string): EndingDecision {
  const progress = getVictoryPathProgress(state).sort((a, b) => b.value - a.value);
  const worstCollapse =
    failure === "Context Collapse" && state.worstContextCollapse === "No context collapse yet."
      ? state.recentPost
      : state.worstContextCollapse;
  if (failure === "Context Collapse" && state.worstContextCollapse === "No context collapse yet.") {
    state.worstContextCollapse = `The ${state.recentPost} thread collapsed across audiences.`;
  }
  return {
    outcome: "failure",
    title: failure,
    primaryPath: failure,
    failureCause: failure,
    strongestRemainingPath: progress[0]?.name ?? "None",
    completedMilestones: completedMilestoneLabels(state, progress[0]?.name),
    missedThresholds: missedMilestoneLabels(state, progress[0]?.name).slice(0, 5),
    biggestTurningPoint: worstCollapse,
    decisiveMoment: decisiveMomentForFailure(state, failure),
    triggeringEvent: state.recentPost,
    strategyHint: strategyHintForFailure(failure),
  };
}

function pickNonVictoryEnding(
  state: GameState,
  progress: ReturnType<typeof getVictoryPathProgress>,
): EndingDecision {
  const strongest = progress[0];
  const title =
    state.metrics.heat < 42 && state.metrics.burnout < 55
      ? "Offline but Intact"
      : state.metrics.trust >= 48
        ? "Feed Veteran"
        : "Survivor";
  return {
    outcome: "failure",
    title,
    primaryPath: title,
    failureCause: "No victory path qualified",
    strongestRemainingPath: strongest?.name ?? "None",
    completedMilestones: completedMilestoneLabels(state, strongest?.name).slice(0, 6),
    missedThresholds: missedMilestoneLabels(state, strongest?.name).slice(0, 6),
    biggestTurningPoint: biggestTurningPoint(state),
    decisiveMoment: strongest ? decisiveMomentFor(state, strongest.name) : biggestTurningPoint(state),
    triggeringEvent: state.recentPost,
    strategyHint: `You were closest to ${strongest?.name ?? "a stable path"}, but mandatory milestones were still missing.`,
  };
}

function buildSummary(
  state: GameState,
  outcome: "victory" | "failure",
  title: string,
  ending: EndingDecision,
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
    primaryEnding: ending.primaryPath,
    secondaryEnding: ending.secondaryPath,
    failureCause: ending.failureCause,
    strongestRemainingPath: ending.strongestRemainingPath,
    completedMilestones: ending.completedMilestones,
    missedThresholds: ending.missedThresholds,
    biggestTurningPoint: ending.biggestTurningPoint,
    decisiveMoment: ending.decisiveMoment,
    strategyHint: ending.strategyHint,
    triggeringEvent: ending.triggeringEvent,
    score,
    day: state.day,
    followers: { ...state.followers },
    trust: state.metrics.trust,
    biggestViralEvent: state.biggestViralEvent,
    bestRelationship,
    worstContextCollapse:
      outcome === "failure" && title === "Context Collapse" && state.worstContextCollapse === "No context collapse yet."
        ? ending.biggestTurningPoint
        : state.worstContextCollapse,
    community: community || "No stable community",
    headline: makeHeadline(state, outcome, title, ending),
  };
}

function makeHeadline(state: GameState, outcome: "victory" | "failure", title: string, ending: EndingDecision): string {
  if (outcome === "failure") {
    if (title === "Offline but Intact" || title === "Feed Veteran" || title === "Survivor") {
      return `${PLATFORM_NAME} run ends without a clean victory: ${ending.missedThresholds[0] ?? "mandatory milestones were missing"}.`;
    }
    return `${ending.failureCause}: ${ending.triggeringEvent} pushed the run past a failure threshold.`;
  }
  if (title.includes("Community")) {
    return `The room held because ${ending.completedMilestones.slice(0, 2).join(" and ").toLowerCase()}.`;
  }
  if (title.includes("Viral")) {
    return `Attention became opportunity instead of only heat: ${ending.completedMilestones[0] ?? "viral milestones completed"}.`;
  }
  if (title.includes("Escape")) {
    return "Direct ties and boundaries made the feed optional.";
  }
  if (state.eventsHosted >= 3) {
    return "Online thread becomes real chairs, real snacks, and no ratio.";
  }
  return "Small-town user finds the people, keeps most of the plot.";
}

function inferAudience(tags: string[]): string {
  if (tags.includes("family") || tags.includes("reality")) return "relatives, skeptics, and worried lurkers";
  if (tags.includes("knowledge") || tags.includes("linux")) return "niche learners and opportunity contacts";
  if (tags.includes("community") || tags.includes("organizer")) return "group members and local neighbors";
  if (tags.includes("hobby") || tags.includes("golf")) return "hobby friends and quiet coworkers";
  if (tags.includes("viral") || tags.includes("joke")) return "casual followers and drama watchers";
  return "close friends and mixed followers";
}

function inferContext(state: GameState, tags: string[]): "Contained" | "Escaped" | "Fraying" {
  if (state.metrics.heat > 68 || tags.includes("viral")) return "Escaped";
  if (state.metrics.drama > 45 || tags.includes("context") || tags.includes("reality")) return "Fraying";
  return "Contained";
}

function affectedFromRelationships(
  relationships: Partial<Record<RelationshipKey, number>> = {},
): string[] {
  return Object.keys(relationships);
}

function summarizeEffects(effects: Partial<Metrics> = {}, followers: Partial<Followers> = {}): string[] {
  const metricText = Object.entries(effects).map(([key, value]) => formatDelta(labelMetric(key), value));
  const followerText = Object.entries(followers).map(([key, value]) =>
    formatDelta(labelFollower(key), value),
  );
  return [...metricText, ...followerText].filter(Boolean);
}

function summarizeDeltas(deltas: AppliedDeltas): string[] {
  const metricText = Object.entries(deltas.metrics).map(([key, value]) => formatDelta(labelMetric(key), value));
  const followerText = Object.entries(deltas.followers).map(([key, value]) =>
    formatDelta(labelFollower(key), value),
  );
  const relationshipText = Object.entries(deltas.relationships).map(([key, value]) =>
    formatDelta(key, value),
  );
  const summary = [...metricText, ...followerText, ...relationshipText].filter(Boolean);
  return summary.length ? summary : ["No numeric change"];
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

function labelMilestoneProgress(value: number, completed: number): string {
  if (value >= 80 && completed >= 4) return "Strong";
  if (value >= 65 && completed >= 3) return "Rising";
  if (value >= 50 || completed >= 2) return "Building";
  if (completed >= 1 || value >= 30) return "Unstable";
  return "At Risk";
}

function milestone(
  path: string,
  label: string,
  progress: number,
  complete: boolean,
  mandatory = false,
): VictoryMilestone {
  return {
    path,
    label,
    progress: clamp(progress, 0, 100),
    complete,
    mandatory,
  };
}

function pathProgressValue(milestones: VictoryMilestone[]): number {
  if (!milestones.length) return 0;
  const mandatory = milestones.filter((item) => item.mandatory);
  const optional = milestones.filter((item) => !item.mandatory);
  const mandatoryAverage =
    mandatory.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, mandatory.length);
  const optionalAverage =
    optional.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, optional.length || 1);
  return Math.round(mandatoryAverage * 0.88 + optionalAverage * (optional.length ? 0.12 : 0));
}

function progressCount(value: number, target: number): number {
  return Math.min(100, (value / target) * 100);
}

function pathDisqualified(state: GameState, path: string): boolean {
  if (path === "Viral") {
    return (
      state.metrics.trust < 36 ||
      state.metrics.burnout >= 84 ||
      (state.pathMilestones.viral.destructiveViralEvents > 8 &&
        state.pathMilestones.viral.falloutManaged < 2)
    );
  }
  if (path === "Community") {
    return state.metrics.drama > 58;
  }
  if (path === "Relationship") {
    return state.pathMilestones.relationship.relationshipLosses > 2;
  }
  if (path === "Knowledge") {
    return state.metrics.realityDrift > 62;
  }
  if (path === "Escape") {
    return !state.pathMilestones.escape.exitPlanCompleted || state.metrics.heat > 48;
  }
  return false;
}

function completedMilestoneLabels(state: GameState, primary = "", secondary = ""): string[] {
  const allowed = new Set([primary, secondary].filter(Boolean));
  return getVictoryMilestones(state)
    .filter((item) => (!allowed.size || allowed.has(item.path)) && item.mandatory && item.complete)
    .map((item) => `${item.path}: ${item.label}`);
}

function missedMilestoneLabels(state: GameState, primary = "", secondary = ""): string[] {
  const allowed = new Set([primary, secondary].filter(Boolean));
  return getVictoryMilestones(state)
    .filter((item) => (!allowed.size || allowed.has(item.path)) && item.mandatory && !item.complete)
    .sort((a, b) => b.progress - a.progress)
    .map((item) => `${item.path}: ${item.label} (${Math.round(item.progress)}%)`)
    .slice(0, 10);
}

function biggestTurningPoint(state: GameState): string {
  if (state.biggestViralEvent !== "No viral event yet.") return state.biggestViralEvent;
  if (state.worstContextCollapse !== "No context collapse yet.") return state.worstContextCollapse;
  return state.eventLog[0] ?? state.recentPost;
}

function decisiveMomentFor(state: GameState, primary: string, secondary?: string): string {
  const p = state.pathMilestones;
  const path = primary || secondary || "";
  if (path === "Community") {
    return `${p.community.healthyGroupDays} healthy group days kept the room useful instead of merely busy.`;
  }
  if (path === "Viral") {
    return state.biggestViralEvent !== "No viral event yet."
      ? state.biggestViralEvent
      : `${p.viral.viralOpportunitiesConverted} viral opportunities were converted before the heat took over.`;
  }
  if (path === "Knowledge") {
    return `${p.knowledge.tutorialsPosted} tutorials and ${p.knowledge.peopleHelped} helped people turned expertise into trust.`;
  }
  if (path === "Relationship") {
    return `${p.relationship.privateRepairs} private repairs preserved ${p.relationship.closeFriendsPreserved} close friends.`;
  }
  if (path === "Creator") {
    return `${p.creator.buildLogsPosted} build logs and ${p.creator.opportunitiesConverted} converted opportunities made the project real.`;
  }
  if (path === "Organizer") {
    return `${p.organizer.eventsHosted} hosted events brought ${p.organizer.totalAttendance} people into the room.`;
  }
  if (path === "Escape") {
    return p.escape.exitPlanCompleted
      ? "The exit plan landed: direct contacts, boundaries, and offline days made the platform optional."
      : `${p.escape.directContactsBuilt} direct contacts and ${p.escape.boundariesSet} boundaries nearly made the platform optional.`;
  }
  return biggestTurningPoint(state);
}

function decisiveMomentForFailure(state: GameState, failure: string): string {
  if (failure === "Context Collapse") return state.worstContextCollapse;
  if (failure === "Feed Rot") return `Reach hit ${state.metrics.reach.toLocaleString()} while trust fell to ${state.metrics.trust}.`;
  if (failure === "Unfriended by Christmas") return `${state.followers.closeFriends} close friends remained when the run broke.`;
  if (failure === "Niche Capture") return `Reality drift reached ${state.metrics.realityDrift} with ${state.followers.realityRelatives} reality relatives watching.`;
  if (failure === "Burnout Spiral") return `Burnout reached ${state.metrics.burnout} before recovery became a habit.`;
  if (failure === "Reply Guy Singularity") return `Reply pressure turned drama followers into the main audience.`;
  if (failure === "Algorithm Dependent") return `Heat reached ${state.metrics.heat} before direct opportunities replaced the feed.`;
  return biggestTurningPoint(state);
}

function strategyHintFor(primary: string, secondary?: string): string {
  const hints: Record<string, string> = {
    Community: "More viral reach would have helped less than steady moderation and contributor rituals.",
    Viral: "Recovery responses and conversion cards kept attention from becoming pure feed rot.",
    Knowledge: "Tutorials, expert interactions, and pinned useful threads made credibility specific.",
    Relationship: "Private repairs beat public trust farming.",
    Creator: "Build logs and converted opportunities mattered more than raw followers.",
    Organizer: "Real events, attendance, and recurring participants made the community tangible.",
    Escape: "Boundaries plus direct contacts made the platform optional.",
  };
  return secondary
    ? `${hints[primary] ?? "The primary path completed its mandatory milestones"} Hybrid credit came from ${secondary}'s own requirements, not shared meters.`
    : hints[primary] ?? "The path completed its mandatory milestones.";
}

function strategyHintForFailure(failure: string): string {
  const hints: Record<string, string> = {
    "Context Collapse": "Earlier private repair, pinned context, or refusal to argue could have kept audiences separated.",
    "Feed Rot": "Convert attention into direct opportunities before chasing another reach spike.",
    "Unfriended by Christmas": "Direct messages and apologies preserve close ties better than public posting.",
    "Niche Capture": "Reality checks and expert citations can keep weird rooms from rewriting the whole run.",
    "Burnout Spiral": "Schedule recovery before the feed turns every action into moderation labor.",
    "Reply Guy Singularity": "Block, mute, or delegate before the loudest person becomes the product.",
    "Algorithm Dependent": "Use direct-list and project-conversion cards before heat becomes your only engine.",
  };
  return hints[failure] ?? "Focus on one path's mandatory milestones instead of broad generic meter growth.";
}

function canTakeCommunityIndependent(state: GameState): boolean {
  const p = state.pathMilestones.escape;
  return (
    state.day >= 24 &&
    p.directContactsBuilt >= 4 &&
    p.boundariesSet >= 3 &&
    p.offlineDays >= 4 &&
    state.metrics.heat <= 52
  );
}

function recentActionUses(state: GameState, actionId: string, windowDays: number): number {
  const days = state.actionUseDays[actionId] ?? [];
  return days.filter((day) => state.day - day <= windowDays).length;
}

function hasRecentActionTag(state: GameState, tags: string[], windowDays: number): boolean {
  const tagSet = new Set(tags);
  return Object.entries(state.actionUseDays).some(([id, days]) => {
    if (!days.some((day) => state.day - day <= windowDays)) return false;
    const action = id.startsWith("join:") ? getAction("join-community") : getAction(id);
    return Boolean(action?.tags.some((tag) => tagSet.has(tag)));
  });
}

function createEmptyPathMilestones(): PathMilestoneState {
  return {
    community: {
      helpfulMemberEvents: 0,
      moderationSuccesses: 0,
      recurringContributors: 0,
      healthyGroupDays: 0,
      memberSupportActions: 0,
    },
    viral: {
      viralEvents: 0,
      viralOpportunitiesConverted: 0,
      falloutManaged: 0,
      peakReach: 210,
      destructiveViralEvents: 0,
    },
    knowledge: {
      tutorialsPosted: 0,
      peopleHelped: 0,
      expertInteractions: 0,
      usefulThreadsPinned: 0,
      mentorInteractions: 0,
    },
    relationship: {
      privateRepairs: 0,
      closeFriendsPreserved: 6,
      publicConflictsResolved: 0,
      relationshipLosses: 0,
      directMessagesSent: 0,
    },
    creator: {
      buildLogsPosted: 0,
      projectMilestones: 0,
      collaboratorsFound: 0,
      opportunitiesConverted: 0,
      usefulOutputsPublished: 0,
    },
    organizer: {
      eventsHosted: 0,
      totalAttendance: 0,
      recurringParticipants: 0,
      groupChallengesCompleted: 0,
      offlineActionsCompleted: 0,
    },
    escape: {
      directContactsBuilt: 0,
      offlineDays: 0,
      boundariesSet: 0,
      platformDependenceReduced: 0,
      exitPlanCompleted: false,
    },
  };
}

function normalizeInterestIds(interestIds: InterestKey[]): InterestKey[] {
  const allowed = new Set(STARTING_INTERESTS.map((interest) => interest.id));
  const normalized = Array.from(new Set(interestIds.filter((id) => allowed.has(id)))).slice(0, 3);
  return normalized.length ? normalized : [...DEFAULT_STARTING_INTEREST_IDS];
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    interestIds: [...state.interestIds],
    actionHistoryIds: [...state.actionHistoryIds],
    actionUseDays: Object.fromEntries(
      Object.entries(state.actionUseDays).map(([key, days]) => [key, [...days]]),
    ),
    handRefreshesToday: state.handRefreshesToday,
    handVariant: state.handVariant,
    metrics: { ...state.metrics },
    followers: { ...state.followers },
    relationships: { ...state.relationships },
    pathMilestones: clonePathMilestones(state.pathMilestones),
    joinedCommunityIds: [...state.joinedCommunityIds],
    createdGroup: state.createdGroup ? { ...state.createdGroup } : undefined,
    lastActionTags: [...state.lastActionTags],
    eventLog: [...state.eventLog],
    feedItems: state.feedItems.map((item) => ({
      ...item,
      commentSamples: item.commentSamples.map((comment) => ({ ...comment })),
      guestAvatar: item.guestAvatar,
    })),
    affectedNodes: [...state.affectedNodes],
    report: state.report
      ? {
          ...state.report,
          effectsText: [...state.report.effectsText],
          affectedNodes: state.report.affectedNodes ? [...state.report.affectedNodes] : undefined,
          responseOptions: state.report.responseOptions ? [...state.report.responseOptions] : undefined,
          guestAvatar: state.report.guestAvatar,
          credit: state.report.credit,
          showGuestLinks: state.report.showGuestLinks,
        }
      : undefined,
    summary: state.summary
      ? {
          ...state.summary,
          followers: { ...state.summary.followers },
          completedMilestones: [...state.summary.completedMilestones],
          missedThresholds: [...state.summary.missedThresholds],
        }
      : undefined,
  };
}

function clonePathMilestones(milestones: PathMilestoneState): PathMilestoneState {
  return {
    community: { ...milestones.community },
    viral: { ...milestones.viral },
    knowledge: { ...milestones.knowledge },
    relationship: { ...milestones.relationship },
    creator: { ...milestones.creator },
    organizer: { ...milestones.organizer },
    escape: { ...milestones.escape },
  };
}

function sample<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
