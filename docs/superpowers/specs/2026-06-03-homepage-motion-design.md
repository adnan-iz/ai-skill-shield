# Homepage Motion Design

Date: 2026-06-03
Surface: Homepage at `/`
Status: Approved in chat, pending written-spec review

## Goal

Add premium motion to the homepage without making the product feel busy, slow, or marketing-heavy.

The animation should:

- concentrate on the hero and the three top stat cards
- feel like a premium product landing page
- use restrained entrance motion plus subtle ongoing ambient motion
- preserve fast interaction and readability

## Scope

In scope:

- hero badge, headline, supporting copy
- hero background treatment if needed for a subtle ambient effect
- top stat cards
- reduced-motion support

Out of scope:

- global site-wide scroll reveals
- heavy animation on lower homepage sections
- changing the information architecture or copy
- adding JS animation libraries

## Chosen Direction

The selected direction is "Cinematic Lift".

This direction combines:

- a short staggered entrance for the hero content
- a follow-up stagger for the stat cards
- a near-static resting state
- one restrained ambient drift or glow effect to keep the page feeling alive

The motion should feel intentional and premium, not energetic or decorative.

## Motion System

### Entrance Sequence

Hero content enters first:

1. Badge fades in and lifts slightly upward.
2. Headline follows with a slightly larger lift.
3. Supporting copy follows with the smallest delay.

Stat cards enter second:

1. Card one rises and fades in.
2. Card two follows.
3. Card three follows.

Timing principles:

- short total sequence
- visible enough to feel designed
- quick enough that the page still feels immediate

### Resting Motion

After the entrance completes:

- the page should appear mostly still
- one ambient effect may continue at a long duration
- the preferred ambient effect is a soft glow drift or background bloom movement

The cards themselves should not continue bouncing or pulsing in a visible loop.

## Implementation Approach

Use CSS-first animation only.

Preferred properties:

- `opacity`
- `transform`
- optional background-position or pseudo-element transform for ambient drift

Avoid:

- layout-affecting animation
- continuous scale pulses on cards
- animation tied to scroll position
- a new runtime dependency

## Component and File Impact

Primary implementation files:

- `app/page.tsx`
- `app/globals.css`

Expected changes:

- add semantic class names for hero content and stat cards
- add staged animation utility classes or section-specific homepage classes
- add keyframes for entrance and ambient drift
- add reduced-motion overrides

## Reduced Motion

Respect `prefers-reduced-motion: reduce`.

When reduced motion is requested:

- disable staggered entrances
- disable ambient drift
- render content immediately

The static visual design should still look polished without motion.

## Performance Constraints

Motion must not interfere with:

- first interaction on the GitHub Repo tab
- text readability
- mobile responsiveness
- page stability

Animation should stay on compositor-friendly properties where possible.

## Validation Plan

The implementation will be considered complete when the following are verified:

1. Homepage loads with GitHub Repo tab first and active by default.
2. Hero content animates in with a premium stagger.
3. Stat cards animate in after the hero.
4. Ongoing motion is subtle and not distracting.
5. Mobile layout still looks intentional.
6. No console errors or hydration warnings are introduced.
7. Reduced-motion mode removes the animation behavior cleanly.

## Risks

Main risks:

- over-animating and making the product feel less trustworthy
- introducing hydration mismatch through client-only motion state
- slowing perceived responsiveness around the primary input area

Mitigation:

- keep animation CSS-only
- keep motion isolated to non-critical regions
- verify the live page in browser after the change

## Recommendation

Implement the Cinematic Lift direction exactly as approved:

- premium entrance
- restrained ambient rest state
- hero and stat cards only
- no broad motion system expansion
