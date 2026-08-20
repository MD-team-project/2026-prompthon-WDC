# Personas

**Stage**: INCEPTION - User Stories, Part 2
**Generated**: 2026-08-20T02:51:07Z
**Depth**: Brief, per story-generation-plan.md Question 8 answer D
**Source**: `requirements.md`, `story-generation-plan.md`

## Note on persona selection

Two personas, not three. These are not two different people - they are **the same LG product owner at two different points in their relationship with the product**. This is deliberate, and it is what Character Progression actually changes: the product behaves differently for someone with an empty skill list than for someone whose character has already learned their routine.

A third persona, the power user, was considered and excluded. A 1.5-day build cannot reach a demonstrable high-level state, and a persona whose experience cannot be put on screen cannot have its stories validated.

The hackathon judge is deliberately **not** a persona. A judge is an audience member observing the demo, not a user of the system. Judge concerns are handled in the Demo epic of `stories.md` instead.

---

## Persona 1: Min-seo - The Newcomer

| Attribute | Detail |
|---|---|
| **Role** | LG product owner, first session with the app |
| **State** | Character at level 1. Zero discovered skills. Usage history exists on the device but nothing has been surfaced from it yet |
| **Technical comfort** | Ordinary smartphone user. Has used ThinQ, mostly to turn things on and off |

### Goals

- Get the product to do something without hunting through a settings menu
- Understand what this character is and why it is here
- Find out what she is allowed to say to it

### Frustrations

Carried directly from the problem statement in `requirements.md` rather than invented:

- Today's ThinQ is a grid of buttons and sliders. Doing anything simple means finding the right one first
- The app has never once told her something she did not already know. It waits to be configured and does nothing else
- She does not know what an AI product experience is supposed to feel like, so a blank chat box is intimidating rather than inviting

### What she needs from the product

The first thirty seconds have to prove the premise. If her first sentence works, the thesis lands. If she has to guess at phrasing, she is back in a settings menu with extra steps.

---

## Persona 2: Do-yun - The Established User

| Attribute | Detail |
|---|---|
| **Role** | LG product owner, has been using the app across several sessions |
| **State** | Character has levelled up at least once. Two or three discovered skills exist. Has given revision feedback on at least one of them |
| **Technical comfort** | Comfortable. Expects the product to keep up with him |

### Goals

- Have the character notice his routine without being told about it
- Correct a skill that is nearly right instead of deleting it and starting over
- See that continued use is actually accumulating into something

### Frustrations

- Products that ask him to configure the same preference repeatedly, having learned nothing from the last time
- Automation that is close but wrong, with no way to nudge it - only to switch it off entirely
- Systems that claim to learn but show no evidence of it

### What he needs from the product

Evidence of accumulation. A skill he did not ask for, that is right often enough to be worth correcting when it is wrong. This persona is where the primary pillar either proves itself or does not.

---

## Persona to story mapping

Updated for stories.md revision 2, which removed US-1.2.

| Persona | Stories |
|---|---|
| Min-seo (Newcomer) | US-1.1, US-2.1, US-4.1, US-4.2 |
| Do-yun (Established) | US-1.1, US-2.1, US-3.2, US-3.3, US-3.4, US-4.1 |
| Neither - agent is the actor | US-3.1, US-3.2 |
| Neither - judge is the audience | US-5.1 |

US-3.1 and US-3.2 have no human actor by design, per the hybrid actor convention. Their outcomes are what Do-yun experiences, but the behaviour itself is initiated by the agent with no human trigger.
