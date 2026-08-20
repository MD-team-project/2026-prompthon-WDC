# Story to Unit Map

**Stage**: INCEPTION - Units Generation
**Generated**: 2026-08-20T07:34:07Z
**Source**: `stories.md` revision 4, 9 stories

## Why stories cut across units

The units are layer-shaped, so almost every story touches two of them. This was accepted knowingly when the split was chosen: the alternative was feature-shaped units, which would not have let three people work in parallel.

Each story therefore has a **primary** unit - the one that cannot deliver it without doing real work - and **contributing** units.

## Map

| Story | Primary | Contributing |
|---|---|---|
| **US-1.1** Control by saying what I want, see it in my character | BE | FE |
| **US-2.1** See my character level up when it learns something | FE | BE |
| **US-3.1** Discover a skill from usage history without being asked | BE | - |
| **US-3.2** Tell the owner what I made and why | BE | FE |
| **US-3.3** Use a skill my character discovered | BE | FE |
| **US-3.4** Correct a skill instead of deleting it | BE | FE |
| **US-4.1** Speak or type, and read the reply | FE | BE |
| **US-4.2** Use the app in my own language | FE | BE |
| **US-5.1** Follow the demo as a judge | FE | BE, INFRA |

## Load by unit

| Unit | Primary | Contributing |
|---|---|---|
| BE | 5 | 4 |
| FE | 4 | 6 |
| INFRA | **0** | 1 |

INFRA owning no stories is correct, not a gap. IaC produces no user-visible behaviour. It is an enabling unit that every story depends on and none belongs to.

## The one story with no primary owner in practice

**US-3.1 is the only story a single unit delivers alone**, and it is the deep pillar. Everything else needs two units to cooperate.

That makes US-3.1 both the least coordination-dependent and the most important piece of work in the build. It is also the one that can be finished and verified without waiting on anyone.
