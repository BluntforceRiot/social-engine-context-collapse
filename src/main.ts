import "./styles.css";
import { isMuted, playCue, toggleMute } from "./audio";
import {
  ACTIONS,
  COMMUNITIES,
  DEFAULT_STARTING_INTEREST_IDS,
  GROUP_FIRST_POSTS,
  GROUP_PREMISES,
  GROUP_RULES,
  GROUP_TONES,
  PLATFORM_NAME,
  QWEN_FRANKLIN_PROJECT_TITLE,
  QWEN_FRANKLIN_PROJECT_URL,
  QWEN_FRANKLIN_PUBLIC_CREDIT,
  QWEN_FRANKLIN_REPOSITORY_URL,
  RELATIONSHIPS,
  RUN_LENGTH_DAYS,
  STARTING_INTERESTS,
} from "./data";
import { clearRuns, loadRuns, RUN_HISTORY_KEY, saveRun } from "./storage";
import {
  createDemoState,
  createGroup,
  createInitialState,
  getFailureWarnings,
  getActionFreshness,
  getDailyActionHand,
  getGroupLaunchForecast,
  getGroupTradeoffs,
  getVictoryPathProgress,
  joinCommunity,
  playAction,
  refreshDailyHand,
  resolveReport,
} from "./sim";
import type {
  ActionCard,
  CreatedGroup,
  DayReport,
  FeedItem,
  GameState,
  InterestKey,
  MetricKey,
  RelationshipKey,
  ResponseKey,
  RunSummary,
  Screen,
  VictoryMilestone,
} from "./types";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app root");
}
const app = appRoot;

let screen: Screen = "title";
let game: GameState = createInitialState();
let hoveredNode = "";
let previewReport: DayReport | undefined;
let showVictoryPaths = false;
const savedSummaryIds = new Set<string>();
let resetConfirmUntil = 0;
let selectedInterestIds: InterestKey[] = [...DEFAULT_STARTING_INTEREST_IDS];

const characterProfiles: Record<RelationshipKey, { initials: string; role: string; avatar: string }> = {
  "Old Friend Nate": { initials: "ON", role: "close friend / patience meter", avatar: "old-friend-nate.svg" },
  "Coworker Maya": { initials: "CM", role: "credibility witness", avatar: "coworker-maya.svg" },
  "Aunt JPEG": { initials: "AJ", role: "image-belief turbulence", avatar: "aunt-jpeg.svg" },
  "Uncle Signal": { initials: "US", role: "pattern pressure", avatar: "uncle-signal.svg" },
  "Cousin Reply Guy": { initials: "RG", role: "argument amplifier", avatar: "cousin-reply-guy.svg" },
  "Former Classmate Darren": { initials: "FD", role: "rare fire starter", avatar: "former-classmate-darren.svg" },
  "Local Admin Carol": { initials: "LC", role: "rules and locks", avatar: "local-admin-carol.svg" },
  "Concerned Relative": { initials: "CR", role: "private worry channel", avatar: "concerned-relative.svg" },
  "Golf Friend Rick": { initials: "GR", role: "hobby advice bridge", avatar: "golf-friend-rick.svg" },
  "Linux Forum Mentor": { initials: "LM", role: "useful expert signal", avatar: "linux-forum-mentor.svg" },
  "Small-Town Neighbor": { initials: "SN", role: "offline context carrier", avatar: "small-town-neighbor.svg" },
};

const graphLayouts: Record<RelationshipKey, { x: number; y: number }> = {
  "Old Friend Nate": { x: 30, y: 34 },
  "Concerned Relative": { x: 24, y: 55 },
  "Small-Town Neighbor": { x: 35, y: 72 },
  "Coworker Maya": { x: 50, y: 18 },
  "Linux Forum Mentor": { x: 70, y: 28 },
  "Local Admin Carol": { x: 77, y: 50 },
  "Golf Friend Rick": { x: 66, y: 72 },
  "Aunt JPEG": { x: 31, y: 84 },
  "Uncle Signal": { x: 51, y: 86 },
  "Cousin Reply Guy": { x: 20, y: 22 },
  "Former Classmate Darren": { x: 82, y: 78 },
};

const metricLabels: Record<MetricKey, string> = {
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

const PUBLIC_DEMO_URL = "https://bluntforceriot.github.io/social-engine-context-collapse/";
const PUBLIC_REPOSITORY_URL = "https://github.com/BluntforceRiot/social-engine-context-collapse";

const responseLabels: Record<ResponseKey, string> = {
  clarify: "Clarify publicly",
  private: "Move to DMs",
  lean: "Lean into reach",
  delete: "Delete post",
  pin: "Pin context",
  mute: "Mute thread",
  apologize: "Apologize",
  friend: "Ask trusted friend",
  tutorial: "Make follow-up tutorial",
  logoff: "Log off",
  joinSociety: "JOIN THE SOCIETY",
  shareQwenDemo: "SHARE THE DEMO",
  inviteQwenGuestPost: "INVITE QWEN FRANKLIN TO GUEST-POST",
  declineQwen: "DECLINE POLITELY",
  explainSynthetic: "Explain synthetic characters calmly",
  moveQwenDms: "Move the conversation to DMs",
  pinMediaLiteracy: "Pin media-literacy note",
  letProjectSpeak: "Open the Credited Project",
  muteQwenThread: "Mute the thread",
};

window.addEventListener("hashchange", routeFromHash);
window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") {
    if (screen === "title") navigate("scores");
  }
  if (event.key === "m" || event.key === "M") {
    toggleMute();
    render();
  }
  if (event.key === "Escape" && previewReport) {
    previewReport = undefined;
    render();
    return;
  }
  if (event.key === "Escape" && showVictoryPaths) {
    showVictoryPaths = false;
    render();
    return;
  }
  if (event.key === "Escape" && screen !== "title" && !game.report) {
    navigate("title");
  }
});

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-ui]");
  if (!target) return;
  playCue("click");
  handleCommand(target.dataset.ui ?? "", target);
});

app.addEventListener("mouseover", (event) => {
  const target = (event.target as Element).closest<Element>("[data-node-name]");
  if (!target) return;
  const nextNode = target.getAttribute("data-node-name") ?? "";
  inspectGraphNode(nextNode);
});

app.addEventListener("focusin", (event) => {
  const target = (event.target as Element).closest<Element>("[data-node-name]");
  if (!target) return;
  const nextNode = target.getAttribute("data-node-name") ?? "";
  inspectGraphNode(nextNode, true);
});

app.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (screen === "create" && target.closest("#create-group-form")) {
    updateCreateForecast();
  }
});

routeFromHash();

function handleCommand(command: string, target: HTMLElement): void {
  if (command === "start") {
    previewReport = undefined;
    game = createInitialState(selectedInterestIds);
    hoveredNode = "";
    navigate("game");
    return;
  }
  if (command === "toggle-interest") {
    const interestId = target.dataset.interestId as InterestKey | undefined;
    if (!interestId) return;
    if (selectedInterestIds.includes(interestId)) {
      if (selectedInterestIds.length > 1) {
        selectedInterestIds = selectedInterestIds.filter((id) => id !== interestId);
      }
    } else if (selectedInterestIds.length < 3) {
      selectedInterestIds = [...selectedInterestIds, interestId];
    } else {
      selectedInterestIds = [...selectedInterestIds.slice(1), interestId];
    }
    render();
    return;
  }
  if (command === "title") {
    previewReport = undefined;
    showVictoryPaths = false;
    navigate("title");
    return;
  }
  if (command === "howto") {
    navigate("howto");
    return;
  }
  if (command === "credits") {
    previewReport = undefined;
    navigate("credits");
    return;
  }
  if (command === "preview-qwen") {
    previewReport = createDemoState("qwenInvitation").report;
    showVictoryPaths = false;
    render();
    return;
  }
  if (command === "close-preview") {
    previewReport = undefined;
    render();
    return;
  }
  if (command === "victory-paths") {
    if (game.report || game.summary) return;
    showVictoryPaths = true;
    render();
    return;
  }
  if (command === "close-victory-paths") {
    showVictoryPaths = false;
    render();
    return;
  }
  if (command === "scores") {
    navigate("scores");
    return;
  }
  if (command === "game") {
    navigate("game");
    return;
  }
  if (command === "community") {
    navigate("community");
    return;
  }
  if (command === "create") {
    navigate("create");
    return;
  }
  if (command === "toggle-mute") {
    toggleMute();
    render();
    return;
  }
  if (command === "play-action") {
    const actionId = target.dataset.actionId;
    if (!actionId || game.report || game.summary) return;
    const action = ACTIONS.find((item) => item.id === actionId);
    if (action?.opens === "community") {
      navigate("community");
      return;
    }
    if (action?.opens === "create") {
      navigate("create");
      return;
    }
    game = playAction(game, actionId);
    playCue(cueForReport(game.report?.kind));
    render();
    return;
  }
  if (command === "refresh-hand") {
    if (game.report || game.summary) return;
    game = refreshDailyHand(game);
    playCue("click");
    render();
    return;
  }
  if (command === "join-community") {
    const communityId = target.dataset.communityId;
    if (!communityId) return;
    game = joinCommunity(game, communityId);
    playCue("notification");
    navigate("game", false);
    return;
  }
  if (command === "create-group") {
    if (game.createdGroup) {
      navigate("game", false);
      return;
    }
    const form = app.querySelector<HTMLFormElement>("#create-group-form");
    if (!form) return;
    const data = new FormData(form);
    const premise = String(data.get("premise") ?? GROUP_PREMISES[0]);
    const tone = String(data.get("tone") ?? GROUP_TONES[0]);
    const rules = String(data.get("rules") ?? GROUP_RULES[0]);
    const firstPost = String(data.get("firstPost") ?? GROUP_FIRST_POSTS[0]);
    const name = makeGroupName(premise, tone);
    const forecast = getGroupTradeoffs(premise, tone, rules, firstPost);
    const group: CreatedGroup = {
      name,
      premise,
      tone,
      rules,
      firstPost,
      members: forecast.members,
      health: forecast.health,
    };
    game = createGroup(game, group);
    playCue("notification");
    navigate("game", false);
    return;
  }
  if (command === "continue-report") {
    game = resolveReport(game);
    if (game.summary) {
      playCue(game.summary.outcome);
      navigate("end", false);
    } else {
      render();
    }
    return;
  }
  if (command === "respond") {
    const response = target.dataset.response as ResponseKey | undefined;
    if (response === "letProjectSpeak") {
      openSafeExternal(QWEN_FRANKLIN_PROJECT_URL);
    }
    game = resolveReport(game, response);
    playCue(response === "lean" ? "viral" : response === "apologize" || response === "private" || response === "friend" ? "repair" : "notification");
    if (game.summary) {
      playCue(game.summary.outcome);
      navigate("end", false);
    } else {
      render();
    }
    return;
  }
  if (command === "reset-history") {
    const now = Date.now();
    if (now < resetConfirmUntil) {
      clearRuns();
      resetConfirmUntil = 0;
    } else {
      resetConfirmUntil = now + 3000;
    }
    render();
  }
}

function routeFromHash(): void {
  const route = window.location.hash.replace(/^#\/?/, "");
  hoveredNode = "";
  previewReport = undefined;
  showVictoryPaths = false;
  if (route === "howto") {
    screen = "howto";
  } else if (route === "credits") {
    screen = "credits";
  } else if (route === "scores") {
    screen = "scores";
  } else if (route === "community") {
    screen = "community";
  } else if (route === "demo-community") {
    game = createDemoState("main");
    screen = "community";
  } else if (route === "create") {
    screen = "create";
  } else if (route === "demo-manage-group") {
    game = createDemoState("main");
    screen = "create";
  } else if (route === "demo-main") {
    game = createDemoState("main");
    screen = "game";
  } else if (route === "demo-feed") {
    game = createDemoState("feed");
    screen = "game";
  } else if (route === "demo-graph-hover") {
    game = createDemoState("graphHover");
    hoveredNode = "Aunt JPEG";
    screen = "game";
  } else if (route === "demo-paths") {
    game = createDemoState("paths");
    screen = "game";
  } else if (route === "demo-viral") {
    game = createDemoState("viral");
    screen = "game";
  } else if (route === "demo-collapse") {
    game = createDemoState("collapse");
    screen = "game";
  } else if (route === "demo-qwen-invitation") {
    game = createDemoState("qwenInvitation");
    screen = "game";
  } else if (route === "demo-qwen-community") {
    game = createDemoState("qwenCommunity");
    screen = "community";
  } else if (route === "demo-qwen-collapse") {
    game = createDemoState("qwenCollapse");
    screen = "game";
  } else if (route === "demo-victory") {
    game = createDemoState("victory");
    screen = "end";
  } else if (route.startsWith("demo-victory-")) {
    const map: Record<string, Parameters<typeof createDemoState>[0]> = {
      "demo-victory-community": "victoryCommunity",
      "demo-victory-viral": "victoryViral",
      "demo-victory-knowledge": "victoryKnowledge",
      "demo-victory-relationship": "victoryRelationship",
      "demo-victory-creator": "victoryCreator",
      "demo-victory-organizer": "victoryOrganizer",
      "demo-victory-escape": "victoryEscape",
    };
    game = createDemoState(map[route] ?? "victory");
    screen = "end";
  } else if (route === "demo-failure") {
    game = createDemoState("failure");
    screen = "end";
  } else if (route.startsWith("demo-failure-")) {
    const map: Record<string, Parameters<typeof createDemoState>[0]> = {
      "demo-failure-context": "failureContext",
      "demo-failure-feed-rot": "failureFeedRot",
      "demo-failure-unfriended": "failureUnfriended",
      "demo-failure-niche": "failureNiche",
      "demo-failure-burnout": "failureBurnout",
      "demo-failure-reply-guy": "failureReplyGuy",
      "demo-failure-algorithm": "failureAlgorithm",
    };
    game = createDemoState(map[route] ?? "failure");
    screen = "end";
  } else if (route === "game") {
    screen = "game";
  } else {
    screen = "title";
  }
  render();
}

function navigate(next: Screen, updateHash = true): void {
  screen = next;
  showVictoryPaths = false;
  if (updateHash) {
    const route = next === "title" ? "" : `/${next}`;
    history.pushState(null, "", `#${route}`);
  }
  render();
}

function render(): void {
  if (screen === "title") {
    app.innerHTML = renderTitle();
  } else if (screen === "howto") {
    app.innerHTML = renderHowTo();
  } else if (screen === "credits") {
    app.innerHTML = renderCredits();
  } else if (screen === "community") {
    app.innerHTML = renderCommunityChoice();
  } else if (screen === "create") {
    app.innerHTML = renderCreateGroup();
  } else if (screen === "scores") {
    app.innerHTML = renderScores();
  } else if (screen === "end") {
    app.innerHTML = renderEndScreen();
  } else {
    app.innerHTML = renderGame();
  }
}

function renderTitle(): string {
  return `
    <main class="title-screen">
      <section class="hero-card">
        <img src="./assets/signalbarn-mark.svg" alt="" class="hero-mark" />
        <p class="eyebrow">Summer into AI Week 2: Independence Engines</p>
        <h1>The Social Engine<span>Context Collapse</span></h1>
        <p class="subtitle">Find your people. Try not to lose the plot.</p>
        <p class="pitch">A sharp card-and-graph strategy sim about the old magic of online communities and the absurd machinery of the feed.</p>
        <div class="hero-actions">
          <button class="primary" data-ui="start">Start Run</button>
          <button data-ui="howto">How To Play</button>
          <button data-ui="scores">Run History</button>
          <button data-ui="credits">About / Credits</button>
          <button data-ui="toggle-mute">${isMuted() ? "Unmute" : "Mute"} Audio</button>
        </div>
        <section class="interest-picker" aria-label="Starting interests">
          <div>
            <span>Starting interests</span>
            <b>Pick up to three. They shape your daily hand.</b>
          </div>
          <div class="interest-grid">
            ${STARTING_INTERESTS.map(renderInterestButton).join("")}
          </div>
        </section>
        <p class="small-note">v1.0 submission build · Summer into AI Week 2: Independence Engines. Fictional platform. Local browser storage only.</p>
      </section>
      <aside class="title-preview" aria-label="SignalBarn preview">
        <div class="browser-chrome"><span></span><span></span><span></span><strong>signalbarn.local</strong></div>
        <div class="mini-dashboard">
          <div class="mini-profile">
            <b>@smalltownbuilder</b>
            <span>Recent post: "Does anyone know Linux?"</span>
          </div>
          <div class="mini-feed">
            <div>Aunt JPEG reacted with a suspicious crop.</div>
            <div>Linux Forum Mentor sent a calm paragraph.</div>
            <div>Cousin Reply Guy is typing...</div>
          </div>
          <div class="mini-graph">${renderMiniGraph()}</div>
        </div>
      </aside>
    </main>
  `;
}

function renderCredits(): string {
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="title">Title</button>
        <button data-ui="howto">How To Play</button>
        <button data-ui="start" class="primary">Start Run</button>
      </nav>
      <section class="manual-panel wide credits-panel">
        <p class="eyebrow">About / Credits</p>
        <h2>About The Social Engine</h2>
        <div class="credits-grid">
          ${howCard("Project thesis", "A card-and-graph strategy sim about how online communities create independence, opportunity, confusion, and context collapse.")}
          ${howCard("Independence Engines", "Built for the Week 2 theme by treating useful communities, repair rituals, and small creator networks as tiny engines of independence.")}
          ${howCard("Static browser artifact", "The game runs as a static Vite/TypeScript browser demo with no backend, no login, no analytics, and local browser storage only.")}
          ${howCard("Fictional platform", "SignalBarn is fictional. It does not use real social-network branding, logos, UI clones, or external platform services.")}
          ${howCard("Tools and AI usage", "TypeScript, Vite, Playwright, generated WebAudio cues, original SVG/CSS interface work, ChatGPT for design support, and Codex for implementation.")}
        </div>

        <article class="guest-credit-card">
          ${renderGuestAvatar("large")}
          <div>
            <span class="credit-kicker">${escapeHtml(QWEN_FRANKLIN_PROJECT_TITLE)}</span>
            <h3>GUEST SIGNAL FROM THE COMPETITION</h3>
            <p>Myles's Founding Father A.I. put a real language model inside an 8-bit historical interface. That project pushed The Social Engine to think harder about what happens when intelligence lives inside the artifact, not only in the workshop that built it.</p>
            ${renderGuestLinks()}
            <button data-ui="preview-qwen">Preview Featured Guest Signal</button>
          </div>
        </article>

        <section class="build-attribution">
          <p class="eyebrow">Build And Attribution</p>
          <h3>Original implementation, visible credit.</h3>
          <div class="credits-grid">
            ${howCard("Original implementation", "The Social Engine event logic, UI integration, writing, and Qwen guest avatar are original to this game.")}
            ${howCard("No copied files", "No Founding Father A.I. code, artwork, generated chat logs, private keys, deployment secrets, logos, or non-public materials are copied.")}
            ${howCard("Third-party notices", "THIRD_PARTY_NOTICES.md documents the competitor reference, the public source path listed by the article, and the no-direct-reuse boundary.")}
            ${howCard("Current build", "v1.0 submission build. Seven path endings use explicit milestones, local run history, and a scripted Qwen competitor reference.")}
            ${renderPublicLinksCard()}
          </div>
        </section>
      </section>
      ${previewReport ? renderPreviewReport(previewReport) : ""}
    </main>
  `;
}

function renderHowTo(): string {
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="title">Title</button>
        <button data-ui="toggle-mute">${isMuted() ? "Unmute" : "Mute"} Audio</button>
        <button data-ui="start" class="primary">Start Run</button>
      </nav>
      <section class="manual-panel">
        <p class="eyebrow">How To Play</p>
        <h2>Thirty days inside the feed engine.</h2>
        <div class="how-grid">
          ${howCard("Choose an action", "Post, reply, join groups, host events, repair damage, or touch grass. Each day advances after the reaction card resolves.")}
          ${howCard("Read the graph", "Warm nodes are steady ties, warning nodes create friction, and recent fallout ripples through affected people. Hover nodes for relationship details.")}
          ${howCard("Use virality carefully", "Reach creates opportunity, but Algorithm Heat can pull every audience into the same room.")}
          ${howCard("Build your path", "Visible victory paths show whether you are moving toward community, knowledge, creator, organizer, relationship, viral, or escape wins.")}
          ${howCard("Watch warnings", "Context collapse, burnout, feed rot, trust fracture, reality drift, and reply storms warn before they end the run.")}
          ${howCard("Local history", "Finished runs are saved in localStorage only. No backend, no login, no network calls.")}
        </div>
      </section>
    </main>
  `;
}

function renderGame(): string {
  const joinedCommunities = game.joinedCommunityIds
    .map((id) => COMMUNITIES.find((community) => community.id === id)?.name)
    .filter(Boolean);
  const dailyHand = getDailyActionHand(game);
  const interestLabels = STARTING_INTERESTS.filter((interest) => game.interestIds.includes(interest.id))
    .map((interest) => interest.label)
    .join(", ");
  return `
    <main class="game-screen">
      <header class="game-header">
        <div>
          <p class="eyebrow">${PLATFORM_NAME} control room</p>
          <h2>Day ${game.day} / ${RUN_LENGTH_DAYS}</h2>
        </div>
        <div class="header-stat"><span>Score pace</span><strong>${game.scorePreview.toLocaleString()}</strong></div>
        <div class="header-stat"><span>Recent post</span><strong>${escapeHtml(game.recentPost)}</strong></div>
        <button data-ui="victory-paths">Victory Paths</button>
        <button data-ui="toggle-mute">${isMuted() ? "Unmute" : "Mute"}</button>
        <button data-ui="title">Exit</button>
      </header>
      ${renderTodayStrip(game)}
      <section class="dashboard-grid">
        <aside class="left-panel">
          <div class="profile-card">
            <div class="avatar">SB</div>
            <div>
              <strong>@smalltownbuilder</strong>
              <span>tiny-town signal operator</span>
            </div>
          </div>
          <div class="goal-card">
            <span>Current goal</span>
            <b>Find your people without feeding the machine forever.</b>
          </div>
          <div class="goal-card interest-summary">
            <span>Starting interests</span>
            <b>${escapeHtml(interestLabels || "Mixed Signal")}</b>
          </div>
          <div class="communities-card">
            <h3>Rooms</h3>
            ${
              joinedCommunities.length
                ? joinedCommunities.map((name) => `<span>${escapeHtml(name ?? "")}</span>`).join("")
                : "<p>No joined community yet.</p>"
            }
            ${game.createdGroup ? `<span>${escapeHtml(game.createdGroup.name)} (${game.createdGroup.members}, health ${game.createdGroup.health})</span>` : ""}
          </div>
          ${renderWarnings(game)}
          ${renderVictoryPaths(game)}
        </aside>

        <section class="graph-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Social Graph</p>
              <h3>Relationships are not generic followers.</h3>
            </div>
            <button data-ui="community">Find People</button>
          </div>
          ${renderGraph(game)}
          ${renderFeed(game)}
        </section>

        <aside class="actions-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Action Cards</p>
              <h3>Daily hand: pick one.</h3>
            </div>
            <button data-ui="refresh-hand">${game.handRefreshesToday ? "Refresh + heat" : "Refresh Free"}</button>
          </div>
          <p class="hand-note">One relationship/community, one knowledge/creator, one growth/viral, one repair/boundary, one interest card, one wildcard.</p>
          <div class="action-list">
            ${dailyHand.map(renderActionCard).join("")}
          </div>
        </aside>
      </section>
      ${renderHud(game)}
      ${game.report ? renderReport(game.report) : ""}
      ${showVictoryPaths ? renderVictoryPathsDrawer(game) : ""}
    </main>
  `;
}

function renderActionCard(action: ActionCard): string {
  const meta = describeAction(action);
  const freshness = getActionFreshness(game, action.id);
  const selected = game.lastActionId === action.id ? "selected" : "";
  return `
    <button class="action-card ${selected}" data-ui="play-action" data-action-id="${action.id}">
      <span>${escapeHtml(action.label)}</span>
      <strong>${escapeHtml(action.title)}</strong>
      <small>${escapeHtml(action.description)}</small>
      <div class="action-meta">
        <i>${escapeHtml(meta.focus)}</i>
        <i>Viral ${action.viralPotential}</i>
        <i>Relationship ${meta.relationshipRisk}</i>
      </div>
      <div class="action-tags">
        ${meta.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}
      </div>
      <div class="action-risk">
        <b>${escapeHtml(meta.upside)}</b>
        <b>${escapeHtml(meta.risk)}</b>
      </div>
      <em class="freshness ${freshness.label.toLowerCase().replaceAll(" ", "-")}">${escapeHtml(freshness.label)}</em>
    </button>
  `;
}

function renderCommunityChoice(): string {
  const visibleCommunities = COMMUNITIES.filter(
    (community) => !community.unlock || game.qwenSocietyUnlocked || game.joinedCommunityIds.includes(community.id),
  );
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="game">Back to Run</button>
        <button data-ui="create" class="primary" ${game.createdGroup ? "disabled" : ""}>${game.createdGroup ? "Group Already Live" : "Create New Group"}</button>
      </nav>
      <section class="manual-panel wide">
        <p class="eyebrow">Community Chooser</p>
        <h2>Join a room with gifts, baggage, and at least one recurring argument.</h2>
        <p class="body-copy">Joining gives instant members and content fuel. It also imports rivalries, tone, first-event risk, and whatever Local Admin Carol has recently decided. Featured guest rooms unlock through run events.</p>
        <div class="community-grid">
          ${visibleCommunities.map(renderCommunityCard).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderCommunityCard(community: (typeof COMMUNITIES)[number]): string {
  const joined = game.joinedCommunityIds.includes(community.id);
  const isGuest = community.avatar === "qwen-franklin";
  const likelyAudience = isGuest
    ? "history nerds, AI builders, civic tinkerers"
    : community.tone === "healthy"
      ? "niche learners, useful lurkers"
      : "curious weirdos, relatives, drama watchers";
  const shortDescription = isGuest
    ? "A credited guest room where history nerds and AI builders test civic imagination without losing the label."
    : community.hook;
  return `
    <article class="community-card ${community.tone} ${community.avatar ? "guest-community" : ""}">
      <div>
        ${community.avatar ? renderGuestAvatar("card") : ""}
        <span>${escapeHtml(community.typeLabel ?? (community.tone === "healthy" ? "Useful niche" : "Risky weirdness"))}</span>
        <h3>${escapeHtml(community.name)}</h3>
        <p>${escapeHtml(shortDescription)}</p>
      </div>
      <dl>
        <dt>Instant upside</dt><dd>${escapeHtml(community.upside)}</dd>
        <dt>Baggage / rivals</dt><dd>${escapeHtml(community.rivals.join(", "))}</dd>
        <dt>Known risk</dt><dd>${escapeHtml(community.risk)}</dd>
        <dt>Likely audience</dt><dd>${escapeHtml(likelyAudience)}</dd>
      </dl>
      ${
        isGuest
          ? `<details class="community-details"><summary>More Details</summary><p>${escapeHtml(community.hook)} ${escapeHtml(QWEN_FRANKLIN_PUBLIC_CREDIT)}</p></details>`
          : ""
      }
      <button class="primary" data-ui="join-community" data-community-id="${community.id}" ${joined ? "disabled" : ""}>${joined ? "JOINED" : "Join"}</button>
    </article>
  `;
}

function renderCreateGroup(): string {
  if (game.createdGroup) {
    return renderManageGroup(game.createdGroup);
  }
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="community">Join Instead</button>
        <button data-ui="game">Back to Run</button>
      </nav>
      <section class="manual-panel wide create-layout">
        <div>
          <p class="eyebrow">Create New Group</p>
          <h2>Build a tiny independence engine.</h2>
          <p class="body-copy">Premise, tone, rules, and first post affect starting members, health, context risk, and launch metrics.</p>
          ${renderForecastPanel()}
        </div>
        <form id="create-group-form" class="create-form">
          ${selectField("premise", "Premise", GROUP_PREMISES)}
          ${selectField("tone", "Tone", GROUP_TONES)}
          ${selectField("rules", "Rules", GROUP_RULES)}
          ${selectField("firstPost", "First post", GROUP_FIRST_POSTS)}
          <button type="button" class="primary" data-ui="create-group">Launch Group</button>
        </form>
      </section>
    </main>
  `;
}

function renderManageGroup(group: CreatedGroup): string {
  const community = game.pathMilestones.community;
  const organizer = game.pathMilestones.organizer;
  const healthLabel = group.health >= 80 ? "strong" : group.health >= 65 ? "steady" : "needs care";
  const recentActivity = game.feedItems.slice(0, 3);
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="community">Join Rooms</button>
        <button data-ui="victory-paths">Victory Paths</button>
        <button data-ui="game" class="primary">Back to Run</button>
      </nav>
      <section class="manual-panel wide manage-group-panel">
        <p class="eyebrow">Manage Group</p>
        <h2>${escapeHtml(group.name)}</h2>
        <p class="body-copy">Read-only dashboard. Grow this room through daily action cards; this screen does not advance the day or grant rewards.</p>
        <div class="manage-grid">
          <article>
            <span>Group Identity</span>
            <b>${escapeHtml(group.premise)}</b>
            <p>${escapeHtml(group.tone)} tone / ${escapeHtml(group.rules)} / first post: ${escapeHtml(group.firstPost)}</p>
          </article>
          <article>
            <span>Health</span>
            <b>${group.health} / 100 - ${healthLabel}</b>
            <p>${group.members} members. Healthy days completed: ${community.healthyGroupDays}.</p>
          </article>
          <article>
            <span>Community Milestones</span>
            <b>${community.recurringContributors} recurring contributors</b>
            <p>${community.memberSupportActions} support actions / ${community.moderationSuccesses} moderation successes.</p>
          </article>
          <article>
            <span>Organizer Signal</span>
            <b>${organizer.eventsHosted} events hosted</b>
            <p>${organizer.totalAttendance} total attendance / ${organizer.recurringParticipants} recurring participants.</p>
          </article>
          <article>
            <span>Network</span>
            <b>Likely allies: Local Admin Carol, Old Friend Nate</b>
            <p>Watch Cousin Reply Guy and high-drama audiences when public posts escape the room.</p>
          </article>
          <article>
            <span>Recommended Next Actions</span>
            <b>Moderate, recruit, host, delegate</b>
            <p>Use daily cards like Recruit Members, Delegate Moderation, Group Challenge, and Host Event.</p>
          </article>
        </div>
        <div class="activity-strip">
          <span>Recent Activity</span>
          ${
            recentActivity.length
              ? recentActivity.map((item) => `<article><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.body)}</p></article>`).join("")
              : `<p>No room activity yet.</p>`
          }
        </div>
      </section>
      ${showVictoryPaths ? renderVictoryPathsDrawer(game) : ""}
    </main>
  `;
}

function renderScores(): string {
  const runs = loadRuns();
  const resetText =
    Date.now() < resetConfirmUntil ? "Press again to clear local run history." : "Reset local history";
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="title">Title</button>
        <button data-ui="toggle-mute">${isMuted() ? "Unmute" : "Mute"} Audio</button>
        <button data-ui="start" class="primary">New Run</button>
      </nav>
      <section class="manual-panel wide score-archive">
        <p class="eyebrow">Local Run History</p>
        <h2>High signals, low combustion.</h2>
        <p class="body-copy">Saved locally in this browser only: <code>${RUN_HISTORY_KEY}</code></p>
        <div class="score-table">
          ${
            runs.length
              ? runs.map(renderRunRow).join("")
              : `<div class="empty-state">No finished runs yet. The barn is quiet.</div>`
          }
        </div>
        <button data-ui="reset-history">${resetText}</button>
      </section>
    </main>
  `;
}

function renderEndScreen(): string {
  const summary = game.summary;
  if (!summary) return renderGame();
  if (!savedSummaryIds.has(summary.id) && !window.location.hash.includes("demo-")) {
    saveRun(summary);
    savedSummaryIds.add(summary.id);
  }
  return `
    <main class="page-shell end-page ${summary.outcome}">
      <nav class="topbar">
        <button data-ui="title">Title</button>
        <button data-ui="scores">Run History</button>
        <button data-ui="start" class="primary">Play Again</button>
      </nav>
      <section class="end-card">
        <p class="eyebrow">${summary.outcome === "victory" ? "Victory" : "Failure"}</p>
        <h2>${escapeHtml(summary.title)}</h2>
        <p class="headline">${escapeHtml(summary.headline)}</p>
        <div class="summary-grid">
          ${summaryItem("Final Score", summary.score.toLocaleString())}
          ${
            summary.outcome === "failure"
              ? summaryItem("Failure Cause", summary.failureCause ?? summary.title)
              : summaryItem("Primary Ending", summary.primaryEnding)
          }
          ${
            summary.secondaryEnding
              ? summaryItem("Hybrid Path", summary.secondaryEnding)
              : summaryItem("Strongest Remaining Path", summary.strongestRemainingPath)
          }
          ${summaryItem("Day Reached", String(summary.day))}
          ${summaryItem("Trust", String(summary.trust))}
          ${summaryItem("Best Relationship", summary.bestRelationship)}
          ${summaryItem(summary.outcome === "victory" ? "Final Action" : "Triggering Event", summary.triggeringEvent)}
          ${summaryItem("Decisive Moment", summary.decisiveMoment)}
          ${shouldShowBiggestTurningPoint(summary) ? summaryItem("Biggest Turning Point", summary.biggestTurningPoint) : ""}
          ${summaryItem("Biggest Viral Event", summary.biggestViralEvent)}
          ${summaryItem("Worst Context Collapse", summary.worstContextCollapse)}
          ${summaryItem("Community", summary.community)}
          ${summaryItem(
            "Followers",
            `${summary.followers.closeFriends} close, ${summary.followers.nicheMembers} niche, ${summary.followers.dramaFollowers} drama`,
          )}
        </div>
        <div class="ending-explain-grid">
          <article>
            <h3>Mandatory Milestones Completed</h3>
            ${
              summary.completedMilestones.length
                ? `<ul>${summary.completedMilestones.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
                : "<p>No path completed enough mandatory milestones for a clean victory.</p>"
            }
          </article>
          <article>
            <h3>Important Thresholds Missed</h3>
            ${
              summary.missedThresholds.length
                ? `<ul>${summary.missedThresholds.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
                : "<p>No major missed thresholds on the credited path.</p>"
            }
          </article>
          <article>
            <h3>${summary.outcome === "victory" ? "Why This Path Won" : "Different Strategy"}</h3>
            <p>${escapeHtml(summary.strategyHint)}</p>
          </article>
          ${
            summary.outcome === "victory" && shouldShowClosestAlternative(summary)
              ? `<article>
                  <h3>Closest Alternative</h3>
                  <p>${escapeHtml(summary.strongestRemainingPath)} was the closest alternate path, but the credited ending completed the cleaner milestone set.</p>
                </article>`
              : ""
          }
        </div>
        <p class="archive-note">Run archived locally in this browser. Clear the archive from Run History when you want a fresh slate.</p>
      </section>
    </main>
  `;
}

function renderWarnings(state: GameState): string {
  const warnings = getFailureWarnings(state);
  return `
    <div class="warning-card">
      <h3>Failure Warnings</h3>
      ${
        warnings.length
          ? warnings
              .map(
                (warning) => `
                  <article class="${warning.level}">
                    <b>${escapeHtml(warning.name)}</b>
                    <span>${escapeHtml(warning.text)}</span>
                  </article>
                `,
              )
              .join("")
          : `<p>The feed is only humming ominously.</p>`
      }
    </div>
  `;
}

function renderVictoryPaths(state: GameState): string {
  return `
    <div class="paths-card">
      <h3>Victory Paths</h3>
      ${renderVictoryPathRows(state)}
    </div>
  `;
}

function renderVictoryPathsDrawer(state: GameState): string {
  return `
    <div class="modal-backdrop victory-paths-backdrop">
      <article class="event-modal victory-paths-drawer" role="dialog" aria-modal="true" aria-labelledby="victory-paths-title">
        <button class="modal-close" data-ui="close-victory-paths" aria-label="Close victory paths">Close</button>
        <p class="eyebrow">Victory Paths</p>
        <h2 id="victory-paths-title">All seven ways out.</h2>
        <p>Progress updates from explicit milestones. Opening this drawer does not advance the day or change the run.</p>
        <div class="paths-drawer-list">
          ${renderVictoryPathCards(state)}
        </div>
      </article>
    </div>
  `;
}

function renderVictoryPathRows(state: GameState): string {
  return getVictoryPathProgress(state)
    .map(
      (path) => `
        <div class="path-row ${path.status.toLowerCase().replaceAll(" ", "-")} ${path.qualifies ? "qualified" : ""}">
          <span>${escapeHtml(path.name)}</span>
          <div><i style="width:${path.value}%"></i></div>
          <b>${path.qualifies ? "Qualified" : escapeHtml(path.status)}</b>
          <small>${path.milestoneDetails.slice(0, 3).map((milestone) => renderMilestoneChip(milestone)).join("")}</small>
        </div>
      `,
    )
    .join("");
}

function renderVictoryPathCards(state: GameState): string {
  return getVictoryPathProgress(state)
    .map((path) => {
      const completed = path.milestoneDetails.filter((milestone) => milestone.complete);
      const next = path.milestoneDetails.filter((milestone) => !milestone.complete && milestone.mandatory).slice(0, 4);
      const optionalNext = path.milestoneDetails.filter((milestone) => !milestone.complete && !milestone.mandatory).slice(0, Math.max(0, 3 - next.length));
      const nextMilestones = [...next, ...optionalNext];
      return `
        <section class="path-detail-card ${path.status.toLowerCase().replaceAll(" ", "-")} ${path.qualifies ? "qualified" : ""}">
          <div class="path-detail-head">
            <div>
              <h3>${escapeHtml(path.name)}</h3>
              <span>${path.value}%</span>
            </div>
            <b>${path.qualifies ? "Qualified" : escapeHtml(path.status)}</b>
          </div>
          <div class="path-detail-meter"><i style="width:${path.value}%"></i></div>
          <div class="path-milestone-columns">
            <div>
              <strong>Completed</strong>
              ${
                completed.length
                  ? completed.slice(0, 5).map((milestone) => renderMilestoneLine(milestone, true)).join("")
                  : `<em>None yet.</em>`
              }
            </div>
            <div>
              <strong>Next</strong>
              ${
                nextMilestones.length
                  ? nextMilestones.map((milestone) => renderMilestoneLine(milestone, false)).join("")
                  : `<em>All listed milestones are complete.</em>`
              }
            </div>
          </div>
        </section>
      `;
    })
    .join("");
}

function renderMilestoneChip(milestone: VictoryMilestone): string {
  const label = milestoneLabel(milestone);
  const required = milestone.mandatory ? "required" : "bonus";
  const state = milestone.complete ? "complete" : "next";
  return `<em class="milestone-chip ${state} ${required}">${milestone.complete ? "Done" : milestone.mandatory ? "Req" : "Opt"}: ${escapeHtml(label)}</em>`;
}

function renderMilestoneLine(milestone: VictoryMilestone, complete: boolean): string {
  const label = milestoneLabel(milestone);
  return `<span class="milestone-line ${complete ? "complete" : "next"} ${milestone.mandatory ? "required" : "optional"}"><i>${complete ? "Done" : "Next"}</i>${escapeHtml(label)}${milestone.mandatory ? `<small>Required</small>` : `<small>Optional</small>`}</span>`;
}

function milestoneLabel(milestone: VictoryMilestone): string {
  return formatDisplayLabel(milestone.label);
}

function renderFeed(state: GameState): string {
  return `
    <section class="feed-panel" aria-label="SignalBarn feed">
      <div class="panel-heading compact">
        <div>
          <p class="eyebrow">SignalBarn Feed</p>
          <h3>Recent posts and reactions</h3>
        </div>
      </div>
      <div class="feed-stack">
        ${state.feedItems.map(renderFeedItem).join("")}
      </div>
    </section>
  `;
}

function renderFeedItem(item: FeedItem): string {
  return `
    <article class="feed-item ${item.kind} ${item.context.toLowerCase()} ${item.guestAvatar ? "has-avatar" : ""}">
      ${item.guestAvatar ? renderGuestAvatar("feed") : ""}
      <div class="feed-topline">
        <span>Day ${item.day}</span>
        <b>${escapeHtml(item.context)}</b>
      </div>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.body)}</p>
      <div class="feed-audience">${escapeHtml(item.audience)}</div>
      <div class="feed-metrics">
        <span>${item.reactions} reactions</span>
        <span>${item.comments} comments</span>
        <span>${item.shares} shares</span>
      </div>
      <div class="comment-samples">
        ${item.commentSamples
          .map(
            (comment) => `
              <span class="${comment.tone}">
                ${isRelationshipKey(comment.author) ? renderPersonAvatar(comment.author, "comment") : ""}
                <b>${escapeHtml(comment.author)}:</b> ${escapeHtml(comment.text)}
              </span>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderHud(state: GameState): string {
  const meters: MetricKey[] = [
    "trust",
    "agency",
    "belonging",
    "drama",
    "burnout",
    "heat",
    "realityDrift",
    "skillCred",
  ];
  return `
    <footer class="hud">
      <div class="reach-block">
        <span>Reach</span>
        <strong>${state.metrics.reach.toLocaleString()}</strong>
      </div>
      ${meters.map((key) => meter(key, state.metrics[key])).join("")}
      <div class="followers-strip">
        <span>Close ${state.followers.closeFriends}</span>
        <span>Niche ${state.followers.nicheMembers}</span>
        <span>Casual ${state.followers.casualFollowers}</span>
        <span>Drama ${state.followers.dramaFollowers}</span>
        <span>Opps ${state.followers.opportunityContacts}</span>
        <span>Relatives ${state.followers.realityRelatives}</span>
      </div>
    </footer>
  `;
}

function renderTodayStrip(state: GameState): string {
  return `
    <section class="today-strip">
      <div>
        <span>Today's goal</span>
        <b>${escapeHtml(todayGoal(state))}</b>
      </div>
      <p>Pick one action. Resolve the reaction. Keep useful people closer than the argument.</p>
      <em>One clean choice advances the day.</em>
    </section>
  `;
}

function renderReport(report: GameState["report"]): string {
  if (!report) return "";
  const options = report.responseOptions ?? ["clarify", "private", "lean"];
  const guestLabel = "Featured Guest Signal";
  const responseButtons = report.responseRequired
    ? `
      <div class="response-grid expanded">
        ${options.map((option) => `<button data-ui="respond" data-response="${option}">${escapeHtml(responseLabels[option])}</button>`).join("")}
      </div>
    `
    : `<button class="primary" data-ui="continue-report">End Day</button>`;
  return `
    <div class="modal-backdrop">
      <article class="event-modal ${report.kind}">
        ${
          report.guestAvatar
            ? `<div class="guest-modal-head">${renderGuestAvatar("modal")}<div><span>${escapeHtml(QWEN_FRANKLIN_PROJECT_TITLE)}</span><b>${guestLabel}</b>${report.credit ? `<small>${escapeHtml(report.credit)}</small>` : ""}${report.showGuestLinks ? renderGuestLinks("compact") : ""}</div></div>`
            : ""
        }
        <p class="eyebrow">${report.guestAvatar ? guestLabel : labelReportKind(report.kind)}</p>
        <h2>${escapeHtml(report.title)}</h2>
        <p>${escapeHtml(report.body)}</p>
        <div class="report-brief">
          <b>${report.kind === "collapse" ? "Context escaped" : report.kind === "viral" ? "Reach spike" : "Feed reaction"}</b>
          <span>${escapeHtml(report.context ?? "Contained")} audience pressure</span>
        </div>
        <div class="report-meta">
          ${report.source ? `<span><b>Source</b>${escapeHtml(report.source)}</span>` : ""}
          ${report.audience ? `<span><b>Audience</b>${escapeHtml(report.audience)}</span>` : ""}
          ${report.context ? `<span><b>Context</b>${escapeHtml(report.context)}</span>` : ""}
          ${report.benefited ? `<span><b>Benefited</b>${escapeHtml(report.benefited)}</span>` : ""}
          ${report.annoyed ? `<span><b>Annoyed</b>${escapeHtml(report.annoyed)}</span>` : ""}
        </div>
        <div class="effects-list">
          ${report.effectsText.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        ${report.mechanicalNote ? `<p class="modal-footnote">${escapeHtml(report.mechanicalNote)}</p>` : ""}
        ${responseButtons}
      </article>
    </div>
  `;
}

function renderPreviewReport(report: DayReport): string {
  const options = report.responseOptions ?? [];
  return `
    <div class="modal-backdrop" data-preview="qwen">
      <article class="event-modal ${report.kind} preview-modal">
        <div class="preview-ribbon">Non-scoring preview</div>
        <div class="guest-modal-head">${renderGuestAvatar("modal")}<div><span>${escapeHtml(QWEN_FRANKLIN_PROJECT_TITLE)}</span><b>Featured Guest Signal</b>${report.credit ? `<small>${escapeHtml(report.credit)}</small>` : ""}${renderGuestLinks("compact")}</div></div>
        <p class="eyebrow">Featured Guest Signal Preview</p>
        <h2>${escapeHtml(report.title)}</h2>
        <p>${escapeHtml(report.body)}</p>
        <div class="effects-list">
          ${report.effectsText.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <p class="modal-footnote">Preview only. These choices are shown for judges and do not modify the current run.</p>
        <div class="response-grid expanded preview-choices">
          ${options.map((option) => `<button type="button" disabled>${escapeHtml(responseLabels[option])}</button>`).join("")}
        </div>
        <button class="primary" data-ui="close-preview">Close Preview</button>
      </article>
    </div>
  `;
}

function renderGraph(state: GameState): string {
  const people = RELATIONSHIPS;
  const groupNodes = [
    ...state.joinedCommunityIds.map((id) => {
      const community = COMMUNITIES.find((item) => item.id === id);
      return community
        ? {
            id: community.name,
            label: community.name,
            avatar: community.avatar,
            tone: community.tone,
          }
        : undefined;
    }),
    state.createdGroup
      ? {
          id: state.createdGroup.name,
          label: state.createdGroup.name,
          avatar: undefined,
          tone: "healthy" as const,
        }
      : undefined,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    avatar?: "qwen-franklin";
    tone: "healthy" | "risky";
  }>;
  const nodes = [
    { id: "you", label: "You", x: 50, y: 50, kind: "you", score: 100, avatar: undefined, initials: "SB", avatarSrc: "" },
    ...people.map((name) => {
      const layout = graphLayouts[name];
      return {
        id: name,
        label: shortName(name),
        x: layout.x,
        y: layout.y,
        kind: nodeKind(name),
        score: state.relationships[name],
        avatar: undefined,
        initials: characterProfiles[name].initials,
        avatarSrc: characterAvatarSrc(name),
      };
    }),
    ...groupNodes.slice(0, 4).map((node, index) => ({
      id: node.id,
      label: node.label,
      x: 18 + index * 21,
      y: index % 2 === 0 ? 86 : 91,
      kind: node.avatar ? "qwen-group" : node.tone === "risky" ? "risky-group" : "group",
      score: node.id === state.createdGroup?.name ? state.createdGroup.health : 70,
      avatar: node.avatar,
      initials: groupInitials(node.label),
      avatarSrc: "",
    })),
  ];
  const links = nodes
    .filter((node) => node.id !== "you")
    .map((node) => {
      const width = (0.4 + Math.max(0, node.score) / 100).toFixed(2);
      return `
        <line x1="50" y1="50" x2="${node.x}" y2="${node.y}" stroke-width="${width}" class="${node.score > 64 ? "good" : node.score < 38 ? "bad" : "neutral"} ${state.affectedNodes.includes(node.id) ? "affected" : ""}" />
      `;
    })
    .join("");
  const nodeMarkup = nodes
    .map((node) => {
      const affected = state.affectedNodes.includes(node.id) ? "affected" : "";
      const selected = hoveredNode === node.id ? "selected" : "";
      const radius = node.kind === "you" ? 7 : node.kind.includes("group") ? 6 : 5;
      const labelY = node.kind.includes("group") ? node.y - 7.5 : node.y + 10;
      const nodeShape = node.avatar
        ? `<image href="./assets/qwen-franklin-avatar.svg" x="${node.x - radius}" y="${node.y - radius}" width="${radius * 2}" height="${radius * 2}" />`
        : node.avatarSrc
          ? `<image class="person-node-avatar" href="${escapeHtml(node.avatarSrc)}" x="${node.x - radius}" y="${node.y - radius}" width="${radius * 2}" height="${radius * 2}" />`
        : `<circle cx="${node.x}" cy="${node.y}" r="${radius}" /><text class="node-initials" x="${node.x}" y="${node.y + 1.2}">${escapeHtml(node.initials)}</text>`;
      return `
        <g class="graph-node ${node.kind} ${node.score < 35 ? "strained" : ""} ${affected} ${selected}" data-node-name="${escapeHtml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeHtml(node.id)}">
          ${nodeShape}
          <text class="node-label" x="${node.x}" y="${labelY}">${escapeHtml(node.label)}</text>
        </g>
      `;
    })
    .join("");

  return `
    <div class="graph-wrap">
      <svg class="social-graph" viewBox="0 0 100 100" role="img" aria-label="A fictional social graph of SignalBarn relationships and groups.">
        <defs>
          <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f7d86b" stop-opacity=".9"/>
            <stop offset="100%" stop-color="#58d7ff" stop-opacity=".1"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="${18 + state.metrics.heat * 0.18}" fill="url(#pulse)" class="heat-pulse" />
        ${links}
        ${nodeMarkup}
      </svg>
      ${renderGraphLegend()}
      ${renderNodeInspector(state)}
    </div>
    <div class="relationship-list">
      ${Object.entries(state.relationships)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, value]) => `<span>${escapeHtml(name)} <b>${value}</b></span>`)
        .join("")}
    </div>
  `;
}

function renderNodeInspector(state: GameState): string {
  const node = hoveredNode || state.affectedNodes[0] || "Old Friend Nate";
  const relationshipValue = state.relationships[node as keyof typeof state.relationships];
  const community = COMMUNITIES.find((item) => item.name === node);
  const group = state.createdGroup?.name === node ? state.createdGroup : undefined;
  const avatar = isRelationshipKey(node) ? renderPersonAvatar(node, "inspector") : "";
  return `
    <aside class="node-inspector">
      ${avatar}
      <div>
        <span>${hoveredNode ? "Inspecting" : "Recent signal"}</span>
        <h4>${escapeHtml(node)}</h4>
        <p>${escapeHtml(nodeBlurb(node))}</p>
        <b>${relationshipValue ? `Trust ${relationshipValue}` : community ? `${community.tone} community` : group ? `Group health ${group.health}` : "Central node"}</b>
      </div>
    </aside>
  `;
}

function inspectGraphNode(nextNode: string, restoreFocus = false): void {
  if (!nextNode || nextNode === hoveredNode) return;
  hoveredNode = nextNode;
  render();
  if (!restoreFocus) return;
  requestAnimationFrame(() => {
    const node = Array.from(app.querySelectorAll<SVGElement>("[data-node-name]")).find(
      (item) => item.getAttribute("data-node-name") === nextNode,
    );
    node?.focus({ preventScroll: true });
  });
}

function renderGraphLegend(): string {
  return `
    <div class="graph-legend" aria-label="Graph legend">
      <span><i class="legend-close"></i>Close</span>
      <span><i class="legend-steady"></i>Steady</span>
      <span><i class="legend-reality"></i>Reality friction</span>
      <span><i class="legend-drama"></i>Drama</span>
      <span><i class="legend-group"></i>Group</span>
      <span><i class="legend-strain"></i>Thin red lines strain</span>
      <span class="legend-help" tabindex="0" aria-label="Hover people for context. Drama followers are not community." data-tooltip="Hover people for context. Drama followers are not community.">Graph help</span>
    </div>
  `;
}

function renderForecastPanel(
  premise = GROUP_PREMISES[0],
  tone = GROUP_TONES[0],
  rules = GROUP_RULES[0],
  firstPost = GROUP_FIRST_POSTS[0],
): string {
  return `<div id="create-forecast-panel" class="forecast-panel">${renderForecastContent(premise, tone, rules, firstPost)}</div>`;
}

function renderForecastContent(
  premise: string,
  tone: string,
  rules: string,
  firstPost: string,
): string {
  const forecast = getGroupTradeoffs(premise, tone, rules, firstPost);
  const launchForecast = getGroupLaunchForecast(game, premise, tone, rules, firstPost);
  const postSignal = firstPost.includes("evidence")
    ? "evidence-first launch"
    : firstPost.includes("win")
      ? "positive ritual"
      : firstPost.includes("meetup")
        ? "offline bridge"
        : "conversation starter";
  return `
    <span>Live launch forecast</span>
    <b>${forecast.members} starting members / ${forecast.health} health</b>
    <p>${escapeHtml(forecast.audience)} / ${forecast.context} / ${escapeHtml(postSignal)}</p>
    ${renderCreateGroupPreview(premise, tone, rules, firstPost, forecast)}
    <dl class="forecast-readout">
      <dt>Risk</dt><dd>${escapeHtml(forecast.risk)}</dd>
      <dt>Tradeoffs</dt><dd>${forecast.tradeoffs.map(escapeHtml).join(", ")}</dd>
    </dl>
    <div class="effects-list small">
      ${launchForecast.effectsText.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderCreateGroupPreview(
  premise: string,
  tone: string,
  rules: string,
  firstPost: string,
  forecast: ReturnType<typeof getGroupTradeoffs>,
): string {
  const initials = makeGroupName(premise, tone)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const likelyAlly = premise.includes("Linux") || tone.includes("technical") ? "Linux Forum Mentor" : "Local Admin Carol";
  const likelyRival = rules.includes("No") || rules.includes("no") ? "Cousin Reply Guy" : "Former Classmate Darren";
  const previewTitle = firstPost.length > 46 ? `${firstPost.slice(0, 43)}...` : firstPost;
  return `
    <div class="group-preview" aria-label="Created group preview">
      <div class="preview-node">
        <span>${escapeHtml(initials || "GR")}</span>
        <i></i>
      </div>
      <div class="preview-card">
        <em>Sample first feed card</em>
        <strong>${escapeHtml(previewTitle)}</strong>
        <p>${escapeHtml(forecast.audience)} audience / ${forecast.members} members / ${forecast.health} health</p>
      </div>
      <dl>
        <dt>Likely ally</dt><dd>${escapeHtml(likelyAlly)}</dd>
        <dt>Likely rival</dt><dd>${escapeHtml(likelyRival)}</dd>
      </dl>
    </div>
  `;
}

function updateCreateForecast(): void {
  const form = app.querySelector<HTMLFormElement>("#create-group-form");
  const panel = app.querySelector<HTMLElement>("#create-forecast-panel");
  if (!form || !panel) return;
  const data = new FormData(form);
  const premise = String(data.get("premise") ?? GROUP_PREMISES[0]);
  const tone = String(data.get("tone") ?? GROUP_TONES[0]);
  const rules = String(data.get("rules") ?? GROUP_RULES[0]);
  const firstPost = String(data.get("firstPost") ?? GROUP_FIRST_POSTS[0]);
  panel.innerHTML = renderForecastContent(premise, tone, rules, firstPost);
}

function renderMiniGraph(): string {
  return `
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <line x1="60" y1="40" x2="24" y2="18"/>
      <line x1="60" y1="40" x2="100" y2="18"/>
      <line x1="60" y1="40" x2="28" y2="64"/>
      <line x1="60" y1="40" x2="95" y2="62"/>
      <circle cx="60" cy="40" r="9"/>
      <circle cx="24" cy="18" r="6"/>
      <circle cx="100" cy="18" r="6"/>
      <circle cx="28" cy="64" r="6"/>
      <circle cx="95" cy="62" r="6"/>
    </svg>
  `;
}

function renderRunRow(summary: RunSummary): string {
  return `
    <article class="run-row ${summary.outcome}">
      <div>
        <strong>${escapeHtml(summary.title)}</strong>
        <span>${new Date(summary.date).toLocaleDateString()} - ${escapeHtml(summary.headline)}</span>
      </div>
      <b>${summary.score.toLocaleString()}</b>
    </article>
  `;
}

function meter(key: MetricKey, value: number): string {
  const danger = key === "drama" || key === "burnout" || key === "heat" || key === "realityDrift";
  const fillClass = danger ? "danger" : "good";
  return `
    <div class="meter">
      <span>${metricLabels[key]}</span>
      <div class="meter-track"><i class="${fillClass}" style="width: ${Math.min(100, value)}%"></i></div>
      <b>${value}</b>
    </div>
  `;
}

function howCard(title: string, body: string): string {
  return `
    <article>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function renderPublicLinksCard(): string {
  return `
    <article class="public-links-card">
      <h3>Demo / Source</h3>
      <p>Public static build and source repository.</p>
      <div>
        ${renderExternalLink("PLAY LIVE DEMO", PUBLIC_DEMO_URL)}
        ${renderExternalLink("VIEW REPOSITORY", PUBLIC_REPOSITORY_URL)}
      </div>
    </article>
  `;
}

function renderInterestButton(interest: (typeof STARTING_INTERESTS)[number]): string {
  const selected = selectedInterestIds.includes(interest.id);
  return `
    <button
      class="interest-chip ${selected ? "selected" : ""}"
      data-ui="toggle-interest"
      data-interest-id="${interest.id}"
      aria-pressed="${selected}"
      title="${escapeHtml(interest.description)}"
    >
      ${escapeHtml(interest.label)}
    </button>
  `;
}

function renderGuestAvatar(size: "large" | "modal" | "card" | "feed"): string {
  return `
    <img
      class="guest-avatar ${size}"
      src="./assets/qwen-franklin-avatar.svg"
      alt="Fictional Qwen Franklin guest avatar"
      loading="lazy"
    />
  `;
}

function renderPersonAvatar(name: RelationshipKey, size: "inspector" | "comment" | "ending" = "comment"): string {
  return `
    <img
      class="person-avatar ${size}"
      src="${escapeHtml(characterAvatarSrc(name))}"
      alt="${escapeHtml(name)} avatar"
      loading="lazy"
    />
  `;
}

function characterAvatarSrc(name: RelationshipKey): string {
  return `./assets/characters/${characterProfiles[name].avatar}`;
}

function isRelationshipKey(value: string): value is RelationshipKey {
  return Object.prototype.hasOwnProperty.call(characterProfiles, value);
}

function renderGuestLinks(mode: "full" | "compact" = "full"): string {
  const projectLink = renderExternalLink("Visit Founding Father A.I.", QWEN_FRANKLIN_PROJECT_URL);
  const sourceLink = renderExternalLink("View Source", QWEN_FRANKLIN_REPOSITORY_URL);
  const links = [projectLink, sourceLink].filter(Boolean).join("");
  if (!links) return "";
  return `
    <div class="guest-links ${mode}">
      ${links}
    </div>
  `;
}

function renderExternalLink(label: string, href: string): string {
  const safeHref = safeExternalHref(href);
  if (!safeHref) {
    return "";
  }
  return `<a class="button-link" href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function openSafeExternal(href: string): void {
  const safeHref = safeExternalHref(href);
  if (!safeHref) return;
  window.open(safeHref, "_blank", "noopener,noreferrer");
}

function safeExternalHref(href: string): string {
  if (!href) return "";
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function selectField(name: string, label: string, values: string[]): string {
  return `
    <label>
      <span>${label}</span>
      <select name="${name}">
        ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(formatDisplayLabel(value))}</option>`).join("")}
      </select>
    </label>
  `;
}

function formatDisplayLabel(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "jpeg" || lower === "jpegs") return lower === "jpeg" ? "JPEG" : "JPEGs";
      if (lower === "ai") return "AI";
      if (lower === "dm" || lower === "dms") return lower === "dm" ? "DM" : "DMs";
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function summaryItem(label: string, value: string): string {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function shouldShowBiggestTurningPoint(summary: RunSummary): boolean {
  const turningPoint = normalizeSummaryText(summary.biggestTurningPoint);
  return turningPoint !== normalizeSummaryText(summary.triggeringEvent) && turningPoint !== normalizeSummaryText(summary.decisiveMoment);
}

function shouldShowClosestAlternative(summary: RunSummary): boolean {
  return (
    summary.strongestRemainingPath !== "None" &&
    normalizeSummaryText(summary.strongestRemainingPath) !== normalizeSummaryText(summary.primaryEnding) &&
    normalizeSummaryText(summary.strongestRemainingPath) !== normalizeSummaryText(summary.secondaryEnding ?? "")
  );
}

function normalizeSummaryText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function labelReportKind(kind: string): string {
  if (kind === "viral") return "Viral Event";
  if (kind === "collapse") return "Context Collapse";
  if (kind === "repair") return "Relationship Repair";
  return "Feed Event";
}

function todayGoal(state: GameState): string {
  const warnings = getFailureWarnings(state);
  if (warnings.some((warning) => warning.name.includes("Burnout"))) return "Lower burnout before the feed becomes the boss.";
  if (warnings.some((warning) => warning.name.includes("Context"))) return "Contain the room before every audience meets.";
  if (warnings.some((warning) => warning.name.includes("Trust"))) return "Repair one quiet relationship before chasing reach.";
  if (!state.joinedCommunityIds.length && !state.createdGroup) return "Find or build a room that is not just raw followers.";
  if (state.metrics.skillCred < 35) return "Turn attention into something useful.";
  return "Grow a path without letting drama define the score.";
}

function extractTopPath(title: string): string {
  return title
    .replace("Hybrid Victory: ", "")
    .replace(" Victory", "")
    .replace("Context Collapse", "Context Collapse")
    .replace("Feed Rot", "Feed Rot")
    .replace("Burnout Spiral", "Burnout Spiral");
}

function describeAction(action: ActionCard): {
  focus: string;
  upside: string;
  risk: string;
  relationshipRisk: string;
  tags: string[];
} {
  const effects = action.effects;
  const focus = action.tags.includes("knowledge")
    ? "Skill / Cred"
    : action.tags.includes("community")
      ? "Community"
      : action.tags.includes("repair")
        ? "Trust Repair"
        : action.tags.includes("viral")
          ? "Reach"
          : action.tags.includes("escape")
            ? "Burnout Relief"
            : "Mixed";
  const upside =
    (effects.skillCred ?? 0) > 4
      ? "+skill"
      : (effects.belonging ?? 0) > 4
        ? "+belonging"
        : (effects.agency ?? 0) > 4
          ? "+agency"
          : (effects.reach ?? 0) > 120
            ? "+reach"
            : (effects.trust ?? 0) > 4
              ? "+trust"
              : "situational";
  const risk =
    (effects.drama ?? 0) > 6 || action.tags.includes("context")
      ? "context risk"
      : (effects.heat ?? 0) > 8 || action.viralPotential > 14
        ? "heat risk"
        : (effects.burnout ?? 0) > 5
          ? "burnout risk"
          : (effects.realityDrift ?? 0) > 5
            ? "reality risk"
            : "low risk";
  const relationshipRisk = Object.values(action.relationships ?? {}).some((value) => value < -4)
    ? "High"
    : Object.values(action.relationships ?? {}).some((value) => value < 0)
      ? "Medium"
      : "Low";
  const tags = [upside, risk, ...action.tags.slice(0, 3)].slice(0, 5);
  return { focus, upside, risk, relationshipRisk, tags };
}

function cueForReport(kind?: string): Parameters<typeof playCue>[0] {
  if (kind === "viral") return "viral";
  if (kind === "collapse") return "collapse";
  return "notification";
}

function nodeKind(name: string): string {
  if (name === "Old Friend Nate" || name === "Golf Friend Rick" || name === "Small-Town Neighbor") return "close";
  if (name === "Aunt JPEG" || name === "Uncle Signal" || name === "Concerned Relative") return "reality";
  if (name === "Cousin Reply Guy" || name === "Former Classmate Darren") return "drama";
  if (name === "Linux Forum Mentor" || name === "Coworker Maya" || name === "Local Admin Carol") return "steady";
  return "person";
}

function nodeBlurb(name: string): string {
  const profile = characterProfiles[name as RelationshipKey];
  if (profile) {
    return `${profile.role}. ${relationshipFlavor(name)}`;
  }
  const blurbs: Record<string, string> = {
    "Old Friend Nate": "Loyal, allergic to recruitment, excellent early warning system.",
    "Coworker Maya": "Values credibility and quietly remembers public chaos.",
    "Aunt JPEG": "Believes suspicious images and resists correction with warmth and force.",
    "Uncle Signal": "High confidence, low evidence filter, frequent pattern weather.",
    "Cousin Reply Guy": "Accidentally boosts every argument by refusing to leave.",
    "Former Classmate Darren": "Rarely appears, somehow arrives with a match.",
    "Local Admin Carol": "Moderates unpredictably but appreciates visible rules.",
    "Concerned Relative": "DMs when the public thread gets weird.",
    "Golf Friend Rick": "Useful hobby connection with mysterious posture language.",
    "Linux Forum Mentor": "Calm expert energy. Strong defense against feed rot.",
    "Small-Town Neighbor": "Local context node. Knows which posts will travel offline.",
    "Founders & Future Society": "A credited guest room for history nerds, AI builders, and civic tinkering.",
  };
  return blurbs[name] ?? "A visible part of your current independence engine.";
}

function relationshipFlavor(name: string): string {
  const blurbs: Record<string, string> = {
    "Old Friend Nate": "Loyal, allergic to recruitment, excellent early warning system.",
    "Coworker Maya": "Values credibility and quietly remembers public chaos.",
    "Aunt JPEG": "Believes suspicious images and resists correction with warmth and force.",
    "Uncle Signal": "High confidence, low evidence filter, frequent pattern weather.",
    "Cousin Reply Guy": "Accidentally boosts every argument by refusing to leave.",
    "Former Classmate Darren": "Rarely appears, somehow arrives with a match.",
    "Local Admin Carol": "Moderates unpredictably but appreciates visible rules.",
    "Concerned Relative": "DMs when the public thread gets weird.",
    "Golf Friend Rick": "Useful hobby connection with mysterious posture language.",
    "Linux Forum Mentor": "Calm expert energy. Strong defense against feed rot.",
    "Small-Town Neighbor": "Local context node. Knows which posts will travel offline.",
  };
  return blurbs[name] ?? "A visible part of your current independence engine.";
}

function shortName(name: string): string {
  return name.replace("Former Classmate ", "").replace("Small-Town ", "").replace("Linux Forum ", "");
}

function groupInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function makeGroupName(premise: string, tone: string): string {
  const compact = premise
    .replace("Linux help desk", "Linux Help Desk")
    .replace("Homelab hobby night", "Homelab Porch")
    .replace("Golf swing study group", "Swing Study Porch")
    .replace("Retro game exchange", "Retro Trade Table")
    .replace("Local weird history club", "Local Weird History Room")
    .replace("Bigfoot field notes", "Blurry Evidence Desk")
    .replace("Small-town project board", "Small-Town Project Board")
    .replace("Vintage computer repair room", "Beige Box Bench")
    .replace("Local creator circle", "Local Maker Porch")
    .replace("Vintage computer repair bench", "Beige Box Bench")
    .replace("Golf swing lunch break", "Lunch Break Swing Lab")
    .replace("Bigfoot satire research desk", "Blurry Evidence Club")
    .replace("Neighborhood skill swap", "Neighbor Skill Barn");
  return `${compact} (${tone})`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
