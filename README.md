# The Social Engine: Context Collapse

Find your people. Try not to lose the plot.

The Social Engine: Context Collapse is a static browser card-and-graph strategy sim about using a fictional social platform, SignalBarn, to build community, gain agency, survive virality, and avoid context collapse.

Current version: v0.5 public submission candidate.

Built for Summer into AI Week 2: Independence Engines.

Demo URL:

```txt
https://bluntforceriot.github.io/social-engine-context-collapse/
```

Repository:

```txt
https://github.com/BluntforceRiot/social-engine-context-collapse
```

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
npm ci
npm run typecheck
npm run build
npm audit --audit-level=moderate
npm run preview
```

## How To Play

A run lasts 30 days. Choose up to three starting interests, then each day pick one card from a six-card hand.

The hand is composed from one relationship/community option, one knowledge/creator option, one growth/viral option, one boundary/repair option, one interest-biased option, and one state-dependent wildcard. The first refresh each day is free; extra refreshes add a little Heat/Burnout.

Victory paths are Community, Viral, Knowledge, Relationship, Creator, Organizer, and Escape. v0.5 makes each path qualify through explicit milestones instead of generic meter averages. Example: Organizer needs events, attendance, recurring participants, and group challenges; Escape needs offline days, direct contacts, boundaries, reduced platform dependence, and the late `Take The Community Independent` action.

Failure and non-victory endings include Context Collapse, Feed Rot, Unfriended by Christmas, Niche Capture, Burnout Spiral, Reply Guy Singularity, Algorithm Dependent, Survivor, Feed Veteran, and Offline but Intact.

## Controls

- Pick starting interests on the title screen.
- Click one daily action card to play a day.
- Click `Refresh Free` once per day to redraw the hand.
- Hover/focus graph nodes to inspect relationships.
- Choose fallout responses when viral/context-collapse modals appear.
- `M`: mute/unmute generated audio.
- `H` from title: run history.
- `Esc`: return to title when no modal is open.

## Local Storage

Finished runs are stored only in local browser storage:

```txt
social-engine.contextCollapse.runs.v1
```

Audio mute state is also local:

```txt
social-engine.contextCollapse.muted.v1
```

There is no backend, login, tracking, analytics, runtime LLM, or online leaderboard.

## Qwen Franklin Reference

The Qwen Franklin guest signal is a friendly competitor reference to Myles's Founding Father A.I. project.

Project:

```txt
https://merlinforge.substack.com/p/founding-father-ai-a-real-llm-in
```

Source:

```txt
https://github.com/myles-mf/summer-into-ai-2026/tree/main/week-1/founding-father
```

The `Visit Founding Father A.I.` and `View Source` links are active and open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

No Founding Father A.I. code, assets, model outputs, chat logs, private keys, deployment secrets, logos, or non-public materials are reused. The Qwen event writing, TypeScript integration, community card, feed cards, About/Credits page, and SVG guest avatar are original to The Social Engine. See `THIRD_PARTY_NOTICES.md` and `docs/submission/COMPETITOR_REFERENCE_QWEN_FRANKLIN.md`.

## Tools Used

- Vite
- TypeScript
- Playwright
- Generated WebAudio cues
- Original SVG/CSS/HTML UI assets
- ChatGPT for design support and review prompts
- Codex for implementation/integration

## Verification

Source-level 500-seed strategy matrix:

```sh
npm run balance:v05
```

Browser assertions:

```sh
npm run preview
npm run playtest:v05
```

Qwen reference assertions:

```sh
npm run preview
npm run playtest:qwen
```

Screenshots:

```sh
npm run preview
npm run screenshots:v05
```

## GitHub Pages

The Vite base is `./`, so the built files can run under a GitHub Pages project subpath.

A Pages workflow is included at `.github/workflows/deploy.yml`. After pushing to GitHub, enable GitHub Pages with Source set to GitHub Actions.
