import "./styles.css";
import { isMuted, playCue, toggleMute } from "./audio";
import {
  ACTIONS,
  COMMUNITIES,
  GROUP_FIRST_POSTS,
  GROUP_PREMISES,
  GROUP_RULES,
  GROUP_TONES,
  PLATFORM_NAME,
  RELATIONSHIPS,
  RUN_LENGTH_DAYS,
} from "./data";
import { clearRuns, loadRuns, RUN_HISTORY_KEY, saveRun } from "./storage";
import {
  createDemoState,
  createGroup,
  createInitialState,
  getFailureWarnings,
  getGroupTradeoffs,
  getVictoryPathProgress,
  joinCommunity,
  playAction,
  resolveReport,
} from "./sim";
import type {
  ActionCard,
  CreatedGroup,
  FeedItem,
  GameState,
  MetricKey,
  ResponseKey,
  RunSummary,
  Screen,
} from "./types";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app root");
}
const app = appRoot;

let screen: Screen = "title";
let game: GameState = createInitialState();
let hoveredNode = "";
const savedSummaryIds = new Set<string>();
let resetConfirmUntil = 0;

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
    game = createInitialState();
    hoveredNode = "";
    navigate("game");
    return;
  }
  if (command === "title") {
    navigate("title");
    return;
  }
  if (command === "howto") {
    navigate("howto");
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
  if (command === "join-community") {
    const communityId = target.dataset.communityId;
    if (!communityId) return;
    game = joinCommunity(game, communityId);
    playCue("notification");
    navigate("game", false);
    return;
  }
  if (command === "create-group") {
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
  if (route === "howto") {
    screen = "howto";
  } else if (route === "scores") {
    screen = "scores";
  } else if (route === "community") {
    game = createDemoState("main");
    screen = "community";
  } else if (route === "create") {
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
  } else if (route === "demo-victory") {
    game = createDemoState("victory");
    screen = "end";
  } else if (route === "demo-failure") {
    game = createDemoState("failure");
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
        <h1>The Social Engine:<span>Context Collapse</span></h1>
        <p class="subtitle">Find your people. Try not to lose the plot.</p>
        <p class="pitch">A sharp card-and-graph strategy sim about the old magic of online communities and the absurd machinery of the feed.</p>
        <div class="hero-actions">
          <button class="primary" data-ui="start">Start Run</button>
          <button data-ui="howto">How To Play</button>
          <button data-ui="scores">Run History</button>
          <button data-ui="toggle-mute">${isMuted() ? "Unmute" : "Mute"} Audio</button>
        </div>
        <p class="small-note">v0.3 final candidate. Fictional platform. No real social-network branding. Local browser storage only.</p>
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
  return `
    <main class="game-screen">
      <header class="game-header">
        <div>
          <p class="eyebrow">${PLATFORM_NAME} control room</p>
          <h2>Day ${game.day} / ${RUN_LENGTH_DAYS}</h2>
        </div>
        <div class="header-stat"><span>Score pace</span><strong>${game.scorePreview.toLocaleString()}</strong></div>
        <div class="header-stat"><span>Recent post</span><strong>${escapeHtml(game.recentPost)}</strong></div>
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
              <h3>Pick one today.</h3>
            </div>
          </div>
          <div class="action-list">
            ${ACTIONS.map(renderActionCard).join("")}
          </div>
        </aside>
      </section>
      ${renderHud(game)}
      ${game.report ? renderReport(game.report) : ""}
    </main>
  `;
}

function renderActionCard(action: ActionCard): string {
  const meta = describeAction(action);
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
    </button>
  `;
}

function renderCommunityChoice(): string {
  return `
    <main class="page-shell">
      <nav class="topbar">
        <button data-ui="game">Back to Run</button>
        <button data-ui="create" class="primary">Create New Group</button>
      </nav>
      <section class="manual-panel wide">
        <p class="eyebrow">Community Chooser</p>
        <h2>Join a room with gifts, baggage, and at least one recurring argument.</h2>
        <p class="body-copy">Joining gives instant members and content fuel. It also imports rivalries, tone, first-event risk, and whatever Local Admin Carol has recently decided.</p>
        <div class="community-grid">
          ${COMMUNITIES.map(renderCommunityCard).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderCommunityCard(community: (typeof COMMUNITIES)[number]): string {
  const likelyAudience = community.tone === "healthy" ? "niche learners, useful lurkers" : "curious weirdos, relatives, drama watchers";
  const firstEvent = community.tone === "healthy" ? "mentor advice or useful thread" : "rival quote-share or recruitment pressure";
  return `
    <article class="community-card ${community.tone}">
      <div>
        <span>${community.tone === "healthy" ? "Useful niche" : "Risky weirdness"}</span>
        <h3>${escapeHtml(community.name)}</h3>
        <p>${escapeHtml(community.hook)}</p>
      </div>
      <dl>
        <dt>Instant upside</dt><dd>${escapeHtml(community.upside)}</dd>
        <dt>Baggage / rivals</dt><dd>${escapeHtml(community.rivals.join(", "))}</dd>
        <dt>Known risk</dt><dd>${escapeHtml(community.risk)}</dd>
        <dt>Likely audience</dt><dd>${escapeHtml(likelyAudience)}</dd>
        <dt>First event likelihood</dt><dd>${escapeHtml(firstEvent)}</dd>
      </dl>
      <button class="primary" data-ui="join-community" data-community-id="${community.id}">Join</button>
    </article>
  `;
}

function renderCreateGroup(): string {
  const forecast = getGroupTradeoffs(GROUP_PREMISES[0], GROUP_TONES[0], GROUP_RULES[0], GROUP_FIRST_POSTS[0]);
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
          <div class="forecast-panel legacy-forecast">
            <span>Default launch forecast</span>
            <b>${forecast.members} starting members / ${forecast.health} health</b>
            <p>${escapeHtml(forecast.audience)} · ${forecast.context}</p>
            <div class="effects-list small">
              ${Object.entries(forecast.effects).map(([key, value]) => `<span>${value && value > 0 ? "+" : ""}${value} ${escapeHtml(key)}</span>`).join("")}
            </div>
          </div>
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
          ${summaryItem("Top Path", extractTopPath(summary.title))}
          ${summaryItem("Day Reached", String(summary.day))}
          ${summaryItem("Trust", String(summary.trust))}
          ${summaryItem("Best Relationship", summary.bestRelationship)}
          ${summaryItem("Biggest Viral Event", summary.biggestViralEvent)}
          ${summaryItem("Worst Context Collapse", summary.worstContextCollapse)}
          ${summaryItem("Community", summary.community)}
          ${summaryItem(
            "Followers",
            `${summary.followers.closeFriends} close, ${summary.followers.nicheMembers} niche, ${summary.followers.dramaFollowers} drama`,
          )}
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
      ${getVictoryPathProgress(state)
        .map(
          (path) => `
            <div class="path-row ${path.status.toLowerCase().replaceAll(" ", "-")}">
              <span>${escapeHtml(path.name)}</span>
              <div><i style="width:${path.value}%"></i></div>
              <b>${escapeHtml(path.status)}</b>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
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
    <article class="feed-item ${item.kind} ${item.context.toLowerCase()}">
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
      <p>Pick one action, resolve the reaction card, and keep useful people closer than the argument.</p>
      <em>Hover graph nodes for context. Drama followers are not the same as community.</em>
    </section>
  `;
}

function renderReport(report: GameState["report"]): string {
  if (!report) return "";
  const options = report.responseOptions ?? ["clarify", "private", "lean"];
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
        <p class="eyebrow">${labelReportKind(report.kind)}</p>
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
          ${(report.followerBreakdown ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        ${responseButtons}
      </article>
    </div>
  `;
}

function renderGraph(state: GameState): string {
  const people = RELATIONSHIPS.slice(0, 9);
  const groupNodes = [
    ...state.joinedCommunityIds.map((id) => COMMUNITIES.find((community) => community.id === id)?.name),
    state.createdGroup?.name,
  ].filter(Boolean) as string[];
  const nodes = [
    { id: "you", label: "You", x: 50, y: 50, kind: "you", score: 100 },
    ...people.map((name, index) => {
      const angle = (Math.PI * 2 * index) / people.length - Math.PI / 2;
      return {
        id: name,
        label: shortName(name),
        x: 50 + Math.cos(angle) * 34,
        y: 50 + Math.sin(angle) * 34,
        kind: nodeKind(name),
        score: state.relationships[name],
      };
    }),
    ...groupNodes.slice(0, 4).map((name, index) => ({
      id: name,
      label: name,
      x: 18 + index * 21,
      y: index % 2 === 0 ? 86 : 91,
      kind: name.includes("Bigfoot") || name.includes("Saucer") || name.includes("Flat") ? "risky-group" : "group",
      score: name === state.createdGroup?.name ? state.createdGroup.health : 70,
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
      return `
        <g class="graph-node ${node.kind} ${node.score < 35 ? "strained" : ""} ${affected} ${selected}" data-node-name="${escapeHtml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeHtml(node.id)}">
          <circle cx="${node.x}" cy="${node.y}" r="${node.kind === "you" ? 7 : node.kind.includes("group") ? 6 : 5}" />
          <text x="${node.x}" y="${node.y + 10}">${escapeHtml(node.label)}</text>
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
      ${renderNodeInspector(state)}
    </div>
    ${renderGraphLegend()}
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
  return `
    <aside class="node-inspector">
      <span>${hoveredNode ? "Inspecting" : "Recent signal"}</span>
      <h4>${escapeHtml(node)}</h4>
      <p>${escapeHtml(nodeBlurb(node))}</p>
      <b>${relationshipValue ? `Trust ${relationshipValue}` : community ? `${community.tone} community` : group ? `Group health ${group.health}` : "Central node"}</b>
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
    <dl class="forecast-readout">
      <dt>Risk</dt><dd>${escapeHtml(forecast.risk)}</dd>
      <dt>Tradeoffs</dt><dd>${forecast.tradeoffs.map(escapeHtml).join(", ")}</dd>
    </dl>
    <div class="effects-list small">
      ${Object.entries(forecast.effects).map(([key, value]) => `<span>${value && value > 0 ? "+" : ""}${value} ${escapeHtml(key)}</span>`).join("")}
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

function selectField(name: string, label: string, values: string[]): string {
  return `
    <label>
      <span>${label}</span>
      <select name="${name}">
        ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
      </select>
    </label>
  `;
}

function summaryItem(label: string, value: string): string {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
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
