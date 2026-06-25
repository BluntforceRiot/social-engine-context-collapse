# Design Notes

## Theme Fit

The Social Engine: Context Collapse treats social media as an independence engine.

The internet gave people independence from geography and old gatekeepers. You could grow up in a tiny place and still find Linux mentors, coding peers, golf advice, local events, retro computer collectors, weird hobby groups, and people who understood what your offline world did not.

Then the feed became another engine: reach, belonging, argument, context collapse, burnout, and dependency.

## Not A Party-Politics Simulator

The game avoids real politicians, real political parties, and red/blue partisan conflict. Conflict comes from social friction, family weirdness, misinformation pressure, virality, relationship maintenance, niche communities, and the feed turning every audience into one room.

## Fictional Platform

The in-game service is SignalBarn, an original fictional platform with rural/weird-internet identity. It uses graph nodes, feed cards, group rooms, profile snippets, and dashboard panels without copying any real platform.

No real platform names, logos, layouts, or trademarked visual references are used.

## v0.2 Visual Direction

The brief asks for nostalgia without mud. v0.2 keeps early-internet/forum energy but executes it as a crisp modern browser game:

- sharp typography
- high contrast
- clean spacing
- deliberate color palette
- animated SVG graph states
- polished hover/focus states
- no gray-box prototype panels
- no blurry raster UI

## v0.3 Final Candidate Pass

v0.3 focuses on first-run clarity, public-demo scan speed, and balance rather than new systems.

- The run screen now opens with a compact "Today's goal / how this works" strip.
- The social graph has a category legend, fewer lower-label collisions, affected-node pulses, and clearer relationship strain.
- Viral and context-collapse cards expose source, audience, context, who benefited, and who got annoyed in a faster scan pattern.
- Create Group now has a live forecast that changes with premise, tone, rules, and first post.
- Failure thresholds and repair responses were tuned after automated full-run playtests so most runs reach a readable ending instead of collapsing too early.

## v0.4 Qwen Franklin Competitor Reference

The Qwen Franklin crossover is designed as a credited, affectionate guest signal from a friendly competitor rather than a copied feature or scoring sticker.

- It is optional and appears only once per run.
- It cannot appear before Day 8.
- Knowledge, creator, coding, Linux, retro, and community-oriented play guarantees one invitation between Days 8 and 14 so reviewers can actually see the reference.
- Other play styles get a moderate random chance in that same window.
- It is scripted and static, with no runtime LLM, backend, API key, or network request.
- It uses original Social Engine event writing and an original SVG guest avatar.
- It adds a Knowledge/Agency-leaning community without overpowering the normal score paths.
- Its unique failure pressure is media-literacy context collapse: relatives confusing a synthetic historical guest account with literal evidence.
- About/Credits includes active `Visit Founding Father A.I.` and `View Source` links plus a non-scoring `Preview Featured Guest Signal` button.

## v0.4 Systems Rebuild

The full v0.4 pass preserves the Qwen reference foundation while rebuilding the game identity and balance surface around it.

- Starting interests give each run a public identity before Day 1.
- The main dashboard now shows a six-card daily hand instead of the full action catalogue.
- Daily hands are influenced by selected interests, current pressure, and recent action history.
- Meter gains use light diminishing returns so high stats still matter without snowballing linearly.
- Viral events and context-collapse events are resolved through separate risk checks; when both trigger, high context risk can override raw virality.
- Victory progress is backed by concrete milestones for Community, Viral, Knowledge, Relationship, Creator, Organizer, and Escape paths.
- Created groups are single-launch anchors; relaunching cannot reapply creation rewards.
- Graph nodes now use clustered layout, role-based initials, and richer inspector copy to make the recurring cast feel intentional.
- `npm run playtest:v04` runs seeded browser balance passes across Knowledge/Qwen, Creator, Organizer, and Weird Internet strategies.

## v1.0 Submission Build

The submission build turns the visible path labels into real strategy outcomes.

- Each victory path has explicit path-specific counters and mandatory milestones.
- Primary victories require path progress, mandatory milestones, and no path-specific disqualifier.
- Hybrids are optional and require both paths to qualify closely; random play no longer produces automatic two-path wins.
- Positive meters use stronger diminishing returns and targeted decay so good runs do not pin every number at 100.
- Repeated actions receive visible fatigue labels and reduced positive gains.
- The daily hand is a compact six-card deck with one free refresh.
- Viral play now splits into skilled conversion/recovery and reckless heat-chasing.
- Escape requires a late explicit `Take The Community Independent` action.
- End screens explain what qualified, what was missed, and how another strategy could have changed the result.
- Recurring people now use original SVG avatars instead of initials-only identity.
- Source-level balance runs cover 500 seeds each across nine policies and write `BALANCE_REPORT_SOCIAL_ENGINE_V100.md` for the final release packet.

## Core Loop

Each run lasts 30 days.

1. Choose one action.
2. Apply direct meter, follower, and relationship effects.
3. Trigger a feed event, viral event, or context collapse.
4. If fallout occurs, choose a response.
5. Advance the day and check victory/failure.

## v0.2 Systems

- Strategic action cards with category, upside, risk, tags, viral potential, and relationship risk.
- Feed cards with audience, context state, reaction/comment/share indicators, and fictional comments.
- Social graph nodes with relationship categories, community styling, warning nodes, and affected-node pulses.
- Graph hover inspector for relationship or community details.
- Visible victory path progress.
- Failure warnings before collapse.
- Expanded viral/fallout response choices.
- Generated WebAudio cues with mute toggle.

## Meter Intent

- Reach rewards growth but increases exposure.
- Trust protects close ties and credibility.
- Agency measures real-world opportunity and independence.
- Belonging measures support and community health.
- Drama and Burnout are pressure meters.
- Algorithm Heat controls escape velocity.
- Reality Drift tracks rabbit-hole pull.
- Skill Cred supports Knowledge and Creator paths.

## Followers Are Not Generic

Followers are split into categories because the game should not reward raw audience size blindly. Losing drama followers can improve a run. Losing close friends can trigger failure.

## Victory And Failure

Multiple victory paths are calculated from the final state and shown during play as rough progress. Hybrid titles are possible when multiple paths qualify. Failures can occur early if trust, burnout, drama, reality drift, or relationship health collapses.

The v0.3 target feel is "painfully funny but fair": risky viral play can still win, but repair, moderation, local organizing, and useful knowledge posts now have enough weight to compete with raw reach.
