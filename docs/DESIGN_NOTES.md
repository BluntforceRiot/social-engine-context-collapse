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
