# The Social Engine: Context Collapse

Find your people. Try not to lose the plot.

The Social Engine: Context Collapse is a static browser card-and-graph strategy sim about using a fictional social platform, SignalBarn, to build community, gain agency, survive virality, and avoid context collapse.

Built for Summer into AI Week 2: Independence Engines.

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

A run lasts 30 days. Each day you choose one action card, the social graph reacts, an event or viral fallout card may appear, and the core meters update.

Core actions include posting updates, sharing tutorials, joking, replying to threads, joining communities, creating a group, moderating, hosting events, repairing relationships, deleting posts, blocking drama, and touching grass.

The meters are Reach, Trust, Agency, Belonging, Drama, Burnout, Algorithm Heat, Reality Drift, and Skill Cred. Followers are split into Close Friends, Niche Community Members, Casual Followers, Drama Followers, Opportunity Contacts, and Reality-Friction Relatives. Losing drama followers can be healthy; losing close friends is expensive.

Victory paths include Community, Viral, Knowledge, Relationship, Creator, Organizer, and Escape. Failure endings include Context Collapse, Feed Rot, Unfriended by Christmas, Niche Capture, Burnout Spiral, Reply Guy Singularity, and Algorithm Dependent.

## Local Run History

Finished runs are stored only in local browser storage using:

```txt
social-engine.contextCollapse.runs.v1
```

There is no backend, login, tracking, analytics, or online leaderboard.

## Public Demo Notes

This is v0.1: a playable foundation with original placeholder/UI art, a working social graph, content cards, community joining/creation, virality, context collapse, multiple endings, and local run history.

All platform, character, and community names are fictional. The game does not use Facebook, Meta, Twitter/X, Reddit, TikTok, or any real platform branding, logos, UI clones, icons, trademarked visuals, or exact layouts.

The game is about social media dynamics without being a party-politics simulator. Conflict comes from social friction, weird relatives, misinformation pressure, virality, relationship maintenance, niche communities, and the feed turning every room into one room.

## Tools Used

- Vite
- TypeScript
- Playwright for screenshot capture
- Original SVG/CSS/HTML UI assets

## Screenshots

Generate v0.1 screenshots after starting preview:

```sh
npm run build
npm run preview
npm run screenshots:v01
```

The screenshot script expects the preview server at `http://127.0.0.1:4173/` by default. Set `SOCIAL_ENGINE_BASE_URL` if using another port.

## GitHub Pages

The Vite base is `./`, so the built files can run under a GitHub Pages project subpath after deployment. A workflow can be added later when the repo URL is known.
