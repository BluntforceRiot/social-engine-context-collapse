import "./styles.css";
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
  calculateScore,
  createDemoState,
  createGroup,
  createInitialState,
  joinCommunity,
  playAction,
  resolveReport,
} from "./sim";
import type { CreatedGroup, GameState, MetricKey, RunSummary, Screen } from "./types";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app root");
}
const app = appRoot;

let screen: Screen = "title";
let game: GameState = createInitialState();
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

window.addEventListener("hashchange", routeFromHash);
window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") {
    if (screen === "title") {
      navigate("scores");
    }
  }
  if (event.key === "Escape") {
    if (screen !== "title" && !game.report) {
      navigate("title");
    }
  }
});

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-ui]");
  if (!target) {
    return;
  }
  const command = target.dataset.ui ?? "";
  handleCommand(command, target);
});

routeFromHash();

function handleCommand(command: string, target: HTMLElement): void {
  if (command === "start") {
    game = createInitialState();
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
    render();
    return;
  }
  if (command === "join-community") {
    const communityId = target.dataset.communityId;
    if (!communityId) return;
    game = joinCommunity(game, communityId);
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
    const group: CreatedGroup = {
      name,
      premise,
      tone,
      rules,
      firstPost,
      members: 12,
      health: tone === "chaotic" ? 47 : 62,
    };
    game = createGroup(game, group);
    navigate("game", false);
    return;
  }
  if (command === "continue-report") {
    game = resolveReport(game);
    if (game.summary) {
      navigate("end", false);
    } else {
      render();
    }
    return;
  }
  if (command === "respond") {
    const response = target.dataset.response as "clarify" | "lean" | "private" | undefined;
    game = resolveReport(game, response);
    if (game.summary) {
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
  if (route === "howto") {
    screen = "howto";
  } else if (route === "scores") {
    screen = "scores";
  } else if (route === "community") {
    game = createInitialState();
    screen = "community";
  } else if (route === "create") {
    game = createInitialState();
    screen = "create";
  } else if (route === "demo-main") {
    game = createDemoState("main");
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
        <p class="pitch">A clickable card and graph strategy sim about the old magic of online communities and the absurd machinery of the feed.</p>
        <div class="hero-actions">
          <button class="primary" data-ui="start">Start Run</button>
          <button data-ui="howto">How To Play</button>
          <button data-ui="scores">Run History</button>
        </div>
        <p class="small-note">Fictional platform. No real social-network branding. Local browser storage only.</p>
      </section>
      <aside class="title-preview" aria-label="SignalBarn preview">
        <div class="browser-chrome"><span></span><span></span><span></span><strong>signalbarn.local</strong></div>
        <div class="mini-dashboard">
          <div class="mini-profile">
            <b>@smalltownbuilder</b>
            <span>Recent post: "Does anyone know Linux?"</span>
          </div>
          <div class="mini-feed">
            <div>Aunt JPEG reacted with a lighthouse.</div>
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
        <button data-ui="start" class="primary">Start Run</button>
      </nav>
      <section class="manual-panel">
        <p class="eyebrow">How To Play</p>
        <h2>Thirty days inside the feed engine.</h2>
        <div class="how-grid">
          ${howCard("Choose an action", "Post, reply, join groups, host events, repair damage, or touch grass. Each day advances after the reaction card resolves.")}
          ${howCard("Read the graph", "People and groups react differently. Losing close friends is worse than losing drama followers.")}
          ${howCard("Use virality carefully", "Reach creates opportunity, but Algorithm Heat can pull every audience into the same room.")}
          ${howCard("Build your path", "Win through community, knowledge, relationships, creator opportunity, organizing, virality, or escape.")}
          ${howCard("Avoid failures", "Burnout, feed rot, context collapse, niche capture, and reply storms can end the run early.")}
          ${howCard("Local history", "Finished runs are saved in localStorage only under the key shown in the README.")}
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
        <button data-ui="title">Exit</button>
      </header>
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
            ${game.createdGroup ? `<span>${escapeHtml(game.createdGroup.name)} (${game.createdGroup.members})</span>` : ""}
          </div>
          <div class="log-card">
            <h3>Recent Feed</h3>
            ${game.eventLog.map((entry) => `<p>${escapeHtml(entry)}</p>`).join("")}
          </div>
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

function renderActionCard(action: (typeof ACTIONS)[number]): string {
  return `
    <button class="action-card" data-ui="play-action" data-action-id="${action.id}">
      <span>${escapeHtml(action.label)}</span>
      <strong>${escapeHtml(action.title)}</strong>
      <small>${escapeHtml(action.description)}</small>
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
        <p class="body-copy">Joining gives instant members and content fuel. It also imports rivalries, tone, and whatever Local Admin Carol has recently decided.</p>
        <div class="community-grid">
          ${COMMUNITIES.map(
            (community) => `
              <article class="community-card ${community.tone}">
                <div>
                  <span>${community.tone === "healthy" ? "Useful niche" : "Risky weirdness"}</span>
                  <h3>${escapeHtml(community.name)}</h3>
                  <p>${escapeHtml(community.hook)}</p>
                </div>
                <dl>
                  <dt>Upside</dt><dd>${escapeHtml(community.upside)}</dd>
                  <dt>Risk</dt><dd>${escapeHtml(community.risk)}</dd>
                  <dt>Rivals</dt><dd>${escapeHtml(community.rivals.join(", "))}</dd>
                </dl>
                <button class="primary" data-ui="join-community" data-community-id="${community.id}">Join</button>
              </article>
            `,
          ).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderCreateGroup(): string {
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
          <p class="body-copy">Creating starts small, but it gives you tone and rule control. It also means every moderation failure has your fingerprints on it.</p>
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
        <button data-ui="start" class="primary">New Run</button>
      </nav>
      <section class="manual-panel wide">
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
  if (!summary) {
    return renderGame();
  }
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
      </section>
    </main>
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

function renderReport(report: GameState["report"]): string {
  if (!report) return "";
  const responseButtons = report.responseRequired
    ? `
      <div class="response-grid">
        <button data-ui="respond" data-response="clarify">Clarify publicly</button>
        <button data-ui="respond" data-response="private">Move to DMs</button>
        <button data-ui="respond" data-response="lean">Lean into reach</button>
      </div>
    `
    : `<button class="primary" data-ui="continue-report">End Day</button>`;
  return `
    <div class="modal-backdrop">
      <article class="event-modal ${report.kind}">
        <p class="eyebrow">${labelReportKind(report.kind)}</p>
        <h2>${escapeHtml(report.title)}</h2>
        <p>${escapeHtml(report.body)}</p>
        <div class="effects-list">
          ${report.effectsText.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
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
        kind: "person",
        score: state.relationships[name],
      };
    }),
    ...groupNodes.slice(0, 4).map((name, index) => ({
      id: name,
      label: name,
      x: 22 + index * 18,
      y: 88,
      kind: "group",
      score: 70,
    })),
  ];
  const links = nodes
    .filter((node) => node.id !== "you")
    .map(
      (node) => `
        <line x1="50" y1="50" x2="${node.x}" y2="${node.y}" class="${node.score > 60 ? "good" : node.score < 35 ? "bad" : "neutral"}" />
      `,
    )
    .join("");
  const nodeMarkup = nodes
    .map(
      (node) => `
        <g class="graph-node ${node.kind} ${node.score < 35 ? "strained" : ""}">
          <circle cx="${node.x}" cy="${node.y}" r="${node.kind === "you" ? 7 : 5}" />
          <text x="${node.x}" y="${node.y + 10}">${escapeHtml(node.label)}</text>
        </g>
      `,
    )
    .join("");

  return `
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
    <div class="relationship-list">
      ${Object.entries(state.relationships)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => `<span>${escapeHtml(name)} <b>${value}</b></span>`)
        .join("")}
    </div>
  `;
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

function shortName(name: string): string {
  return name.replace("Former Classmate ", "").replace("Small-Town ", "").replace("Linux Forum ", "");
}

function makeGroupName(premise: string, tone: string): string {
  const compact = premise
    .replace("Homelab hobby night", "Homelab Porch")
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
