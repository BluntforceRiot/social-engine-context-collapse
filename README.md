# The Social Engine: Context Collapse

Find your people. Try not to lose the plot.

The Social Engine: Context Collapse is a static browser card-and-graph strategy sim about using a fictional social platform, SignalBarn, to build community, gain agency, survive virality, and avoid context collapse.

Current version: v0.4.0 Qwen Franklin competitor-reference foundation.

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

A run lasts 30 days. Each day you choose one action card, the social graph reacts, a feed event or viral fallout card may appear, and the core meters update.

Core actions include posting updates, sharing tutorials, joking, replying to threads, joining communities, creating a group, moderating, hosting events, repairing relationships, deleting posts, blocking drama, and touching grass.

The meters are Reach, Trust, Agency, Belonging, Drama, Burnout, Algorithm Heat, Reality Drift, and Skill Cred. Followers are split into Close Friends, Niche Community Members, Casual Followers, Drama Followers, Opportunity Contacts, and Reality-Friction Relatives.

Losing drama followers can be healthy. Losing close friends can be devastating.

Victory paths include Community, Viral, Knowledge, Relationship, Creator, Organizer, and Escape. Failure endings include Context Collapse, Feed Rot, Unfriended by Christmas, Niche Capture, Burnout Spiral, Reply Guy Singularity, and Algorithm Dependent.

The v0.4.0 reference foundation includes the v0.3 final-candidate game loop plus a scripted Qwen Franklin guest signal with original Social Engine writing/art, an unlockable Founders & Future Society community, an Aunt JPEG media-literacy context-collapse event, and a rebuilt About/Credits page with a non-scoring event preview.

## Controls

- Click action cards to play a day.
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

This is a v0.4.0 foundation build, not the completed full v0.4 systems rebuild. It preserves the v0.3 final-candidate loop and adds the credited Qwen Franklin competitor reference so the larger victory-system and balance pass can build on it safely.

All platform, character, and community names are fictional. The game does not use Facebook, Meta, Twitter/X, Reddit, TikTok, or any real platform branding, logos, UI clones, icons, trademarked visuals, or exact layouts.

The Qwen Franklin guest signal is a friendly competitor reference to Myles's Founding Father A.I. project:

```txt
https://merlinforge.substack.com/p/founding-father-ai-a-real-llm-in
```

The `Visit Founding Father A.I.` link is active and opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`. The public article lists this source path:

```txt
https://github.com/myles-mf/summer-into-ai-2026/tree/main/week-1/founding-father
```

The public UI still does not render a `View Source` button in this foundation build; the implementation retains an optional source URL field for later use if that link should become an in-game button.

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

Generate v0.3 screenshots after starting preview:

```sh
npm run build
npm run preview
npm run screenshots:v03
```

The screenshot script expects the preview server at `http://127.0.0.1:4173/` by default and verifies that it is pointed at The Social Engine before capturing. Set `SOCIAL_ENGINE_BASE_URL` if using another port.

Generate Qwen Franklin reference screenshots:

```sh
npm run build
npm run preview
npm run screenshots:qwen
```

## Balance Smoke Test

Run three automated 30-day strategy passes against a local preview server:

```sh
npm run preview
npm run playtest:v03
```

The playtest script writes `PLAYTEST_SOCIAL_ENGINE_V03.txt` locally for the review packet.

Run targeted Qwen Franklin reference checks:

```sh
npm run preview
npm run playtest:qwen
```

The Qwen playtest writes `PLAYTEST_SOCIAL_ENGINE_QWEN_REFERENCE_V2.txt` and verifies discoverability, non-mutating preview behavior, the active project link, absence of source-link UI while no source URL is configured, joined-state lockout, Aunt JPEG responses, About/Credits content, and horizontal overflow checks at 1440x900, 1366x768, and 1280x720.

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
