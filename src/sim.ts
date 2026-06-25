import {
  ACTIONS,
  COMMUNITIES,
  FEED_EVENTS,
  PLATFORM_NAME,
  QWEN_FRANKLIN_GUEST_BANNER,
  RELATIONSHIPS,
  RUN_LENGTH_DAYS,
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
  MetricKey,
  Metrics,
  RelationshipKey,
  ResponseKey,
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
    effects: { trust: 9, drama: -14, heat: -11, burnout: 2, agency: 1 },
    followers: { dramaFollowers: -9 },
    affectedNodes: ["Coworker Maya", "Concerned Relative"],
    feedText: "A plain-language clarification trims the fire without fully starving it.",
  },
  private: {
    title: "Moved It To DMs",
    effects: { trust: 12, belonging: 7, drama: -9, heat: -9, burnout: 1, reach: -70 },
    followers: { closeFriends: 1, dramaFollowers: -5 },
    affectedNodes: ["Old Friend Nate", "Concerned Relative"],
    feedText: "The public room gets quieter because the real repair moved somewhere human-sized.",
  },
  lean: {
    title: "Leaned Into Reach",
    effects: { reach: 430, drama: 14, heat: 12, trust: -8, agency: 4, burnout: 7 },
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
    effects: { trust: 7, skillCred: 5, drama: -7, heat: -5, agency: 2 },
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
    effects: { skillCred: 11, agency: 7, reach: 180, trust: 4, heat: 2, drama: -3 },
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

export function createInitialState(): GameState {
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

  return {
    day: 1,
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

  applyEffects(next, action.effects);
  applyFollowers(next, action.followers);
  applyRelationships(next, action.relationships);

  if (next.createdGroup && action.tags.includes("community")) {
    next.createdGroup.members += action.id === "recruit-members" ? 18 : 9;
    next.createdGroup.health = clamp(next.createdGroup.health + (action.tags.includes("moderation") ? 7 : 4), 0, 100);
  }

  const report = buildDayReport(next, action);
  next.report = report;
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
  next.recentPost = `Joined ${community.name}`;
  next.affectedNodes = community.tone === "healthy" ? ["Local Admin Carol", "Coworker Maya"] : ["Aunt JPEG", "Uncle Signal", "Coworker Maya"];
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
  const next = cloneState(state);
  const tradeoffs = getGroupTradeoffs(group.premise, group.tone, group.rules, group.firstPost);
  next.createdGroup = {
    ...group,
    members: tradeoffs.members,
    health: tradeoffs.health,
  };
  next.lastActionId = "create-group";
  next.lastActionTags = ["community", "builder", group.tone];
  next.recentPost = `Created ${group.name}`;
  next.affectedNodes = ["Local Admin Carol", "Old Friend Nate"];
  applyEffects(next, tradeoffs.effects);
  applyFollowers(next, tradeoffs.followers);
  next.report = {
    kind: "feed",
    title: `${group.name} Is Live`,
    body: `The first post is "${group.firstPost}" and the rules say "${group.rules}." It starts as a small independence engine with visible tradeoffs.`,
    effectsText: summarizeEffects(tradeoffs.effects, tradeoffs.followers),
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
      addQwenSocietyFeedCard(next, "Joined the Founders & Future Society");
    }
    if (response === "inviteQwenGuestPost") {
      next.qwenGuestPosted = true;
      addQwenGuestPostFeedCard(next);
      if (Math.random() < 0.28) {
        applyEffects(next, { reach: 210, skillCred: 5, heat: 4 });
        applyFollowers(next, { nicheMembers: 10, opportunityContacts: 1 });
        next.biggestViralEvent = "Qwen Franklin's guest post found the history-and-AI people.";
      }
    }
    if (response === "shareQwenDemo") {
      next.qwenDemoShared = true;
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

export function getVictoryPathProgress(state: GameState): Array<{ name: string; value: number; status: string }> {
  const m = state.metrics;
  const f = state.followers;
  const values = [
    {
      name: "Community",
      value: Math.round((m.belonging + m.trust + (state.createdGroup?.health ?? state.joinedCommunityIds.length * 18)) / 3),
    },
    { name: "Viral", value: Math.round(Math.min(100, m.reach / 35 + m.heat * 0.25 - m.burnout * 0.15)) },
    { name: "Knowledge", value: Math.round((m.skillCred + m.trust + f.opportunityContacts * 5) / 2.2) },
    { name: "Relationship", value: Math.round((averageRelationship(state) + f.closeFriends * 7 + m.trust) / 2.2) },
    { name: "Creator", value: Math.round((m.agency + m.skillCred + f.opportunityContacts * 8) / 2.3) },
    { name: "Organizer", value: Math.round((m.agency + m.belonging + state.eventsHosted * 18) / 2.2) },
    { name: "Escape", value: Math.round((m.agency + m.belonging + (100 - m.heat) + (100 - m.burnout)) / 4) },
  ];
  return values.map((path) => ({
    ...path,
    value: clamp(path.value, 0, 100),
    status: labelProgress(path.value),
  }));
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
    | "qwenCollapse",
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
    state.report = {
      kind: "viral",
      title: "Your Linux Rant Went Viral",
      body: "The thread escaped the Linux Forum, gained three job leads, and convinced Aunt JPEG that Linux is a county ordinance.",
      effectsText: ["+1200 Reach", "+1 Opportunity Contact", "+16 Drama", "+13 Algorithm Heat"],
      source: "expert boost plus reply fight",
      audience: "Linux Forum, coworkers, relatives, printer people",
      context: "Escaped",
      followerBreakdown: ["+54 Casual Followers", "+28 Drama Followers", "+2 Opportunity Contacts"],
      benefited: "Linux Forum Mentor and opportunity contacts",
      annoyed: "Coworker Maya and Aunt JPEG",
      affectedNodes: ["Linux Forum Mentor", "Coworker Maya", "Aunt JPEG", "Cousin Reply Guy"],
      responseOptions: ["clarify", "private", "lean", "delete", "pin", "mute", "tutorial", "logoff"],
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
      source: "screenshot spread",
      audience: "Golf Swing Lab, coworkers, family watchers",
      context: "Escaped",
      followerBreakdown: ["+15 Drama Followers", "-1 Close Friend"],
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
    applyEffects(state, { drama: 24, heat: 14, realityDrift: 14, trust: -8 });
    state.report = {
      kind: "collapse",
      title: "AUNT JPEG THINKS QWEN FRANKLIN IS REAL",
      body: "Aunt JPEG insists the account proves Benjamin Franklin is alive. Uncle Signal believes he is transmitting from 1776. Cousin Reply Guy has started an electricity argument under the demo link.",
      effectsText: ["-4 Trust", "+12 Drama", "+8 Algorithm Heat", "+10 Reality Drift"],
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
    state.day = RUN_LENGTH_DAYS;
    state.eventsHosted = 4;
    state.summary = buildSummary(state, "victory", "Hybrid Victory: Community + Knowledge");
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
    state.metrics.heat * 0.28 +
    state.metrics.drama * 0.26 +
    state.metrics.realityDrift * 0.16 +
    (action.tags.includes("context") ? 14 : 0) +
    (action.tags.includes("argument") ? 10 : 0);
  const viralChance =
    action.viralPotential +
    state.metrics.heat * 0.18 +
    state.metrics.drama * 0.08 +
    (state.joinedCommunityIds.length + (state.createdGroup ? 1 : 0)) * 2;
  const roll = Math.random() * 100;

  const qwenInvitation = maybeBuildQwenInvitationReport(state, action);
  if (qwenInvitation) {
    return qwenInvitation;
  }

  const qwenCollapse = maybeBuildQwenAuntCollapseReport(state, action);
  if (qwenCollapse) {
    return qwenCollapse;
  }

  if (roll < Math.min(34, viralChance)) {
    const viralGain = 420 + Math.round(state.metrics.heat * 6 + action.viralPotential * 18);
    const report: DayReport = {
      kind: "viral",
      title: `${action.title} Escapes The Barn`,
      body: `${PLATFORM_NAME} pushes it beyond the intended room. Opportunity knocks, then Cousin Reply Guy knocks louder.`,
      effectsText: summarizeEffects(
        { reach: viralGain, drama: 12, heat: 12, burnout: 6, agency: 4 },
        { casualFollowers: 32, dramaFollowers: 18, opportunityContacts: 1 },
      ),
      source: sample(["community share", "reply fight", "algorithm bump", "screenshot spread", "expert boost"]),
      audience: inferAudience(action.tags),
      context: "Escaped",
      followerBreakdown: ["+32 Casual Followers", "+18 Drama Followers", "+1 Opportunity Contact"],
      benefited: action.tags.includes("knowledge") ? "skill credibility" : "raw reach",
      annoyed: action.tags.includes("family") ? "Concerned Relative" : "Coworker Maya",
      affectedNodes: Array.from(new Set([...affectedFromRelationships(action.relationships), "Cousin Reply Guy", "Coworker Maya"])),
      responseOptions: ["clarify", "private", "lean", "delete", "pin", "mute", "tutorial", "logoff"],
      responseRequired: true,
    };
    applyEffects(state, { reach: viralGain, drama: 12, heat: 12, burnout: 6, agency: 4 });
    applyFollowers(state, { casualFollowers: 32, dramaFollowers: 18, opportunityContacts: 1 });
    state.biggestViralEvent = report.title;
    return report;
  }

  if (roll < Math.min(24, contextCollapseRisk) && state.day > 4) {
    const report: DayReport = {
      kind: "collapse",
      title: "Context Collapse: The Wrong Room Found It",
      body: "A post meant for one circle arrives in another with all the nuance sanded off.",
      effectsText: summarizeEffects(
        { trust: -8, drama: 13, heat: 10, burnout: 6 },
        { dramaFollowers: 12 },
      ),
      source: sample(["family argument", "screenshot spread", "quote-share", "reply fight"]),
      audience: "close friends, relatives, coworkers, strangers",
      context: "Escaped",
      followerBreakdown: ["+15 Drama Followers", "-1 Close Friend"],
      benefited: "Cousin Reply Guy",
      annoyed: "Old Friend Nate",
      affectedNodes: Array.from(new Set([...affectedFromRelationships(action.relationships), "Old Friend Nate", "Concerned Relative", "Cousin Reply Guy"])),
      responseOptions: ["clarify", "private", "delete", "apologize", "friend", "mute", "logoff"],
      responseRequired: true,
    };
    applyEffects(state, { trust: -8, drama: 13, heat: 10, burnout: 6 });
    applyFollowers(state, { dramaFollowers: 12 });
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
    source: "feed reaction",
    audience: inferAudience(event.tags),
    context: inferContext(state, event.tags),
    benefited: event.tags.includes("good") ? "useful people" : "the feed",
    annoyed: event.tags.includes("drama") || event.tags.includes("context") ? "quiet friends" : "nobody important",
    affectedNodes: affectedFromRelationships(event.relationships),
  };
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
  const interestRooms = ["linux-forum", "coding-circle", "vintage-computer", "local-events", "founders-future-society"];
  return action.tags.some((tag) => interestTags.includes(tag)) || state.joinedCommunityIds.some((id) => interestRooms.includes(id));
}

function buildQwenInvitationReport(affectedNodes: string[]): DayReport {
  return {
    kind: "feed",
    title: "QWEN FRANKLIN HAS SENT YOU AN INVITATION",
    body: "An unusually articulate founding father has invited you to the Founders & Future Society, a group for history nerds, AI builders, civic experiments, and people with extremely specific opinions about bifocals.",
    effectsText: ["Rare Guest Signal", "Knowledge Opportunity", "Context Risk"],
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
  applyEffects(state, { drama: 12, heat: 8, realityDrift: 10, trust: -4, burnout: 3 });
  applyFollowers(state, { dramaFollowers: 8, realityRelatives: 4 });
  applyRelationships(state, { "Aunt JPEG": -5, "Uncle Signal": -3, "Cousin Reply Guy": -2 });
  const affectedNodes = ["Aunt JPEG", "Uncle Signal", "Cousin Reply Guy", "Linux Forum Mentor"];
  state.affectedNodes = Array.from(new Set([...state.affectedNodes, ...affectedNodes]));

  return {
    kind: "collapse",
    title: "AUNT JPEG THINKS QWEN FRANKLIN IS REAL",
    body: "Aunt JPEG insists the account proves Benjamin Franklin is alive. Uncle Signal believes he is transmitting from 1776. Cousin Reply Guy has started an electricity argument under the demo link.",
    effectsText: summarizeEffects(
      { drama: 12, heat: 8, realityDrift: 10, trust: -4, burnout: 3 },
      { dramaFollowers: 8, realityRelatives: 4 },
    ),
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

function applyFeedEvent(state: GameState, event: FeedEvent): void {
  applyEffects(state, event.effects);
  applyFollowers(state, event.followers);
  applyRelationships(state, event.relationships);
  if (event.tags.includes("context")) {
    state.worstContextCollapse = event.title;
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
  if (m.burnout >= 98) return "Burnout Spiral";
  if (m.trust <= 6 && m.drama >= 80) return "Context Collapse";
  if (m.reach > 3000 && m.trust < 18) return "Feed Rot";
  if (f.closeFriends <= 0 || state.relationships["Old Friend Nate"] <= 5) return "Unfriended by Christmas";
  if (m.realityDrift >= 90 && f.realityRelatives > f.nicheMembers * 0.55) return "Niche Capture";
  if (replyGuy <= 5 && f.dramaFollowers > f.casualFollowers * 0.72) return "Reply Guy Singularity";
  if (m.heat >= 96 && m.agency < 30) return "Algorithm Dependent";
  return undefined;
}

function pickVictoryTitle(state: GameState): string {
  const paths = getVictoryPathProgress(state)
    .filter((path) => path.value >= 68)
    .sort((a, b) => b.value - a.value)
    .map((path) => path.name);
  if (!paths.length) {
    paths.push(state.metrics.trust > state.metrics.drama ? "Survivor" : "Barely Offline");
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

function labelProgress(value: number): string {
  if (value >= 74) return "Strong";
  if (value >= 54) return "Rising";
  if (value >= 34) return "Unstable";
  return "At Risk";
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
          followerBreakdown: state.report.followerBreakdown
            ? [...state.report.followerBreakdown]
            : undefined,
          affectedNodes: state.report.affectedNodes ? [...state.report.affectedNodes] : undefined,
          responseOptions: state.report.responseOptions ? [...state.report.responseOptions] : undefined,
          guestAvatar: state.report.guestAvatar,
          credit: state.report.credit,
          showGuestLinks: state.report.showGuestLinks,
        }
      : undefined,
    summary: state.summary ? { ...state.summary, followers: { ...state.summary.followers } } : undefined,
  };
}

function sample<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
