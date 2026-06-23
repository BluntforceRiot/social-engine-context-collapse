# The Social Engine: Context Collapse

Find your people. Try not to lose the plot.

The Social Engine: Context Collapse is a static browser card-and-graph strategy sim about using a fictional social platform, SignalBarn, to build community, gain agency, survive virality, and avoid context collapse.

Current version: v0.3 final candidate.

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

The v0.3 run screen includes a compact "Today's goal" strip for first-time clarity, a graph legend for node categories, stronger viral/context-collapse cards, and a live create-group forecast that updates as you change premise, tone, rules, and first post.

## Controls

- Click action cards to play a day.
- Hover graph nodes to inspect relationships.
- Choose fallout responses when viral/context-collapse modal appears.
- `M`: mute/unmute generated audio.
- `H` from title: run history.
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

This is v0.3: a public final-candidate prototype with original CSS/SVG interface art, a working social graph, stacked feed cards, strategic action cards, community joining/creation, WebAudio cues, virality, context collapse, multiple endings, visible victory paths, failure warnings, local run history, and automated 30-day playtest coverage.

All platform, character, and community names are fictional. The game does not use Facebook, Meta, Twitter/X, Reddit, TikTok, or any real platform branding, logos, UI clones, icons, trademarked visuals, or exact layouts.

## Tools Used

- Vite
- TypeScript
- Playwright for screenshot capture
- Generated WebAudio cues
- Original SVG/CSS/HTML UI assets

## Screenshots

Generate v0.3 screenshots after starting preview:

```sh
npm run build
npm run preview
npm run screenshots:v03
```

The screenshot script expects the preview server at `http://127.0.0.1:4173/` by default. Set `SOCIAL_ENGINE_BASE_URL` if using another port.

## Balance Smoke Test

Run three automated 30-day strategy passes against a local preview server:

```sh
npm run preview
npm run playtest:v03
```

The playtest script writes `PLAYTEST_SOCIAL_ENGINE_V03.txt` locally for the review packet.

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
