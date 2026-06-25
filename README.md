# The Social Engine: Context Collapse

Find your people. Try not to lose the plot.

The Social Engine: Context Collapse is a static browser card-and-graph strategy sim about using a fictional social platform, SignalBarn, to build community, gain agency, survive virality, and avoid context collapse.

Current version: v0.4.0 full systems rebuild with Qwen Franklin reference preserved.

Built for Summer into AI Week 2: Independence Engines.

## Pitch

The internet gave people independence from geography and old gatekeepers. Then the feed became a new engine of reach, belonging, argument, and dependency.

This is not a party-politics simulator. The game is about social media dynamics, old internet community discovery, context collapse, virality, relationship maintenance, weird relatives, niche communities, and the feed as an engine.

## Run Locally

```sh
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build And Verify

```sh
npm run typecheck
npm run build
npm audit --audit-level=moderate
npm run preview
```

## How To Play

A run lasts 30 days. Choose up to three starting interests, then each day pick one card from a six-card hand. The hand is biased by interests, current pressure, and recent actions so runs have identity without becoming a deck-management game.

Core actions include posting updates, sharing tutorials, joking, replying to threads, joining communities, creating a group, moderating, hosting events, repairing relationships, deleting posts, blocking drama, and touching grass.

The meters are Reach, Trust, Agency, Belonging, Drama, Burnout, Algorithm Heat, Reality Drift, and Skill Cred. Followers are split into Close Friends, Niche Community Members, Casual Followers, Drama Followers, Opportunity Contacts, and Reality-Friction Relatives.

Losing drama followers can be healthy. Losing close friends can be devastating.

Victory paths include Community, Viral, Knowledge, Relationship, Creator, Organizer, and Escape. Each path now tracks concrete milestones such as trusted rooms, skill credibility, low heat, events hosted, and close ties preserved. Failure endings include Context Collapse, Feed Rot, Unfriended by Christmas, Niche Capture, Burnout Spiral, Reply Guy Singularity, and Algorithm Dependent.

The v0.4.0 rebuild adds starting interests, a daily action hand, milestone-backed victory progress, meter diminishing returns, corrected viral/context-collapse sequencing, create-group exploit protection, improved character identity in the graph, and a deterministic balance suite. It preserves the scripted Qwen Franklin guest signal with original Social Engine writing/art, an unlockable Founders & Future Society community, an Aunt JPEG media-literacy context-collapse event, and the About/Credits non-scoring event preview.

## Controls

- Pick starting interests on the title screen.
- Click one daily action-card hand option to play a day.
- Hover graph nodes to inspect relationships.
- Choose fallout responses when viral/context-collapse modal appears.
- `M`: mute/unmute generated audio.
- `H` from title: run history.
- About / Credits from title: view project and competitor reference credits.
- Preview Qwen Franklin Event from About / Credits: opens a non-scoring judge preview.
- `Esc`: return to title when no modal is open.

## Local Run History

Finished runs are stored only in local browser storage using:

```txt
social-engine.contextCollapse.runs.v1
```

Audio mute state is stored locally using:

```txt
social-engine.contextCollapse.muted.v1
```

There is no backend, login, tracking, analytics, or online leaderboard.

## Public Demo Notes

This is the v0.4.0 full systems rebuild. It remains a static browser game with no backend, login, tracking, analytics, or online leaderboard.

All platform, character, and community names are fictional. The game does not use Facebook, Meta, Twitter/X, Reddit, TikTok, or any real platform branding, logos, UI clones, icons, trademarked visuals, or exact layouts.

The Qwen Franklin guest signal is a friendly competitor reference to Myles's Founding Father A.I. project:

```txt
https://merlinforge.substack.com/p/founding-father-ai-a-real-llm-in
```

The `Visit Founding Father A.I.` and `View Source` links are active and open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

```txt
https://github.com/myles-mf/summer-into-ai-2026/tree/main/week-1/founding-father
```

No Founding Father A.I. code, assets, model outputs, chat logs, private keys, deployment secrets, logos, or non-public materials are reused. The Qwen event writing, TypeScript integration, community card, feed cards, About/Credits page, and SVG guest avatar are original to The Social Engine. See `THIRD_PARTY_NOTICES.md` and `docs/submission/COMPETITOR_REFERENCE_QWEN_FRANKLIN.md`.

The Qwen invitation can appear only once per run, not before Day 8. Qualifying knowledge, creator, coding, Linux, retro, and community-oriented play guarantees one invitation between Days 8 and 14; other play styles have a moderate random chance in the same window. The event is optional, modestly tuned, and not required for any victory.

The Aunt JPEG event can follow public Qwen sharing/guest-post paths and keeps the joke on SignalBarn audience context collapse and media literacy, not on Myles or the project.

## Tools Used

- Vite
- TypeScript
- Playwright for screenshot capture
- Generated WebAudio cues
- Original SVG/CSS/HTML UI assets
- Original Qwen Franklin guest avatar SVG for this crossover

## Screenshots

Generate v0.4 screenshots after starting preview:

```sh
npm run build
npm run preview
npm run screenshots:v04
```

The screenshot script expects the preview server at `http://127.0.0.1:4173/` by default and verifies that it is pointed at The Social Engine before capturing. Set `SOCIAL_ENGINE_BASE_URL` if using another port.

Generate Qwen Franklin reference screenshots:

```sh
npm run build
npm run preview
npm run screenshots:qwen
```

## Balance Smoke Test

Run the older v0.3 smoke or the v0.4 deterministic balance suite against a local preview server:

```sh
npm run preview
npm run playtest:v03
npm run playtest:v04
```

The v0.4 balance suite writes `PLAYTEST_SOCIAL_ENGINE_V04_BALANCE.txt` and uses seeded browser runs across Knowledge/Qwen, Creator, Organizer, and Weird Internet strategies.

Run targeted Qwen Franklin reference checks:

```sh
npm run preview
npm run playtest:qwen
```

The Qwen playtest writes `PLAYTEST_SOCIAL_ENGINE_QWEN_REFERENCE_V2.txt` and verifies discoverability, non-mutating preview behavior, active project/source links, joined-state lockout, Aunt JPEG responses, About/Credits content, and horizontal overflow checks at 1440x900, 1366x768, and 1280x720.

## GitHub Pages

The Vite base is `./`, so the built files can run under a GitHub Pages project subpath.

A Pages workflow is included at `.github/workflows/deploy.yml`. After pushing to GitHub, enable GitHub Pages with Source set to GitHub Actions.

Potential repo:

```txt
social-engine-context-collapse
```

Potential demo URL:

```txt
https://bluntforceriot.github.io/social-engine-context-collapse/
```
