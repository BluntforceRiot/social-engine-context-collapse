export type Screen =
  | "title"
  | "howto"
  | "game"
  | "community"
  | "create"
  | "credits"
  | "scores"
  | "end";

export type MetricKey =
  | "reach"
  | "trust"
  | "agency"
  | "belonging"
  | "drama"
  | "burnout"
  | "heat"
  | "realityDrift"
  | "skillCred";

export type FollowerKey =
  | "closeFriends"
  | "nicheMembers"
  | "casualFollowers"
  | "dramaFollowers"
  | "opportunityContacts"
  | "realityRelatives";

export type InterestKey =
  | "technology"
  | "coding"
  | "history"
  | "retro"
  | "creator"
  | "community"
  | "local"
  | "hobby"
  | "weird"
  | "relationships";

export interface StartingInterest {
  id: InterestKey;
  label: string;
  description: string;
  actionHints: string[];
  tags: string[];
}

export type ResponseKey =
  | "clarify"
  | "private"
  | "lean"
  | "delete"
  | "pin"
  | "mute"
  | "apologize"
  | "friend"
  | "tutorial"
  | "logoff"
  | "joinSociety"
  | "shareQwenDemo"
  | "inviteQwenGuestPost"
  | "declineQwen"
  | "explainSynthetic"
  | "moveQwenDms"
  | "pinMediaLiteracy"
  | "letProjectSpeak"
  | "muteQwenThread";

export type RelationshipKey =
  | "Old Friend Nate"
  | "Coworker Maya"
  | "Aunt JPEG"
  | "Uncle Signal"
  | "Cousin Reply Guy"
  | "Former Classmate Darren"
  | "Local Admin Carol"
  | "Concerned Relative"
  | "Golf Friend Rick"
  | "Linux Forum Mentor"
  | "Small-Town Neighbor";

export type PathKey =
  | "Community"
  | "Viral"
  | "Knowledge"
  | "Relationship"
  | "Creator"
  | "Organizer"
  | "Escape";

export interface PathMilestoneState {
  community: {
    helpfulMemberEvents: number;
    moderationSuccesses: number;
    recurringContributors: number;
    healthyGroupDays: number;
    memberSupportActions: number;
  };
  viral: {
    viralEvents: number;
    viralOpportunitiesConverted: number;
    falloutManaged: number;
    peakReach: number;
    destructiveViralEvents: number;
  };
  knowledge: {
    tutorialsPosted: number;
    peopleHelped: number;
    expertInteractions: number;
    usefulThreadsPinned: number;
    mentorInteractions: number;
  };
  relationship: {
    privateRepairs: number;
    closeFriendsPreserved: number;
    publicConflictsResolved: number;
    relationshipLosses: number;
    directMessagesSent: number;
  };
  creator: {
    buildLogsPosted: number;
    projectMilestones: number;
    collaboratorsFound: number;
    opportunitiesConverted: number;
    usefulOutputsPublished: number;
  };
  organizer: {
    eventsHosted: number;
    totalAttendance: number;
    recurringParticipants: number;
    groupChallengesCompleted: number;
    offlineActionsCompleted: number;
  };
  escape: {
    directContactsBuilt: number;
    offlineDays: number;
    boundariesSet: number;
    platformDependenceReduced: number;
    exitPlanCompleted: boolean;
  };
}

export interface Metrics {
  reach: number;
  trust: number;
  agency: number;
  belonging: number;
  drama: number;
  burnout: number;
  heat: number;
  realityDrift: number;
  skillCred: number;
}

export interface Followers {
  closeFriends: number;
  nicheMembers: number;
  casualFollowers: number;
  dramaFollowers: number;
  opportunityContacts: number;
  realityRelatives: number;
}

export interface ActionCard {
  id: string;
  title: string;
  label: string;
  description: string;
  effects: Partial<Metrics>;
  followers?: Partial<Followers>;
  relationships?: Partial<Record<RelationshipKey, number>>;
  viralPotential: number;
  tags: string[];
  opens?: "community" | "create";
}

export interface Community {
  id: string;
  name: string;
  tone: "healthy" | "risky";
  typeLabel?: string;
  avatar?: "qwen-franklin";
  unlock?: "qwen-franklin";
  hook: string;
  upside: string;
  risk: string;
  rivals: string[];
  joinEffects: Partial<Metrics>;
  joinFollowers: Partial<Followers>;
}

export interface FeedEvent {
  id: string;
  title: string;
  body: string;
  effects: Partial<Metrics>;
  followers?: Partial<Followers>;
  relationships?: Partial<Record<RelationshipKey, number>>;
  tags: string[];
}

export interface CreatedGroup {
  name: string;
  premise: string;
  tone: string;
  rules: string;
  firstPost: string;
  members: number;
  health: number;
}

export interface DayReport {
  title: string;
  body: string;
  kind: "feed" | "viral" | "collapse" | "repair";
  effectsText: string[];
  source?: string;
  audience?: string;
  context?: "Contained" | "Escaped" | "Fraying";
  followerBreakdown?: string[];
  benefited?: string;
  annoyed?: string;
  affectedNodes?: string[];
  responseOptions?: ResponseKey[];
  responseRequired?: boolean;
  guestAvatar?: "qwen-franklin";
  credit?: string;
  showGuestLinks?: boolean;
  mechanicalNote?: string;
}

export interface FeedComment {
  author: string;
  text: string;
  tone: "warm" | "useful" | "chaos" | "worry" | "dry";
}

export interface FeedItem {
  id: string;
  day: number;
  title: string;
  body: string;
  kind: "post" | "feed" | "viral" | "collapse" | "repair";
  audience: string;
  context: "Contained" | "Escaped" | "Fraying";
  reactions: number;
  comments: number;
  shares: number;
  commentSamples: FeedComment[];
  guestAvatar?: "qwen-franklin";
}

export interface RunSummary {
  id: string;
  date: string;
  outcome: "victory" | "failure";
  title: string;
  primaryEnding: string;
  secondaryEnding?: string;
  failureCause?: string;
  strongestRemainingPath: string;
  completedMilestones: string[];
  missedThresholds: string[];
  biggestTurningPoint: string;
  decisiveMoment: string;
  strategyHint: string;
  triggeringEvent: string;
  score: number;
  day: number;
  followers: Followers;
  trust: number;
  biggestViralEvent: string;
  bestRelationship: string;
  worstContextCollapse: string;
  community: string;
  headline: string;
}

export interface VictoryMilestone {
  path: string;
  label: string;
  progress: number;
  complete: boolean;
  mandatory?: boolean;
}

export interface GameState {
  day: number;
  interestIds: InterestKey[];
  actionHistoryIds: string[];
  actionUseDays: Record<string, number[]>;
  handRefreshesToday: number;
  handVariant: number;
  metrics: Metrics;
  followers: Followers;
  relationships: Record<RelationshipKey, number>;
  pathMilestones: PathMilestoneState;
  joinedCommunityIds: string[];
  createdGroup?: CreatedGroup;
  recentPost: string;
  lastActionId?: string;
  lastActionTags: string[];
  eventLog: string[];
  feedItems: FeedItem[];
  affectedNodes: string[];
  biggestViralEvent: string;
  worstContextCollapse: string;
  qwenInvitationSeen: boolean;
  qwenSocietyUnlocked: boolean;
  qwenGuestPosted: boolean;
  qwenDemoShared: boolean;
  qwenAuntCollapseSeen: boolean;
  eventsHosted: number;
  repairsMade: number;
  scorePreview: number;
  report?: DayReport;
  summary?: RunSummary;
}
