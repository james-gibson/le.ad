---
title: Claiming a desk
description: Four declared facts, one clock, and the reasons a claim is refused.
order: 2
updated: 2026-11-16
tags: desk, protocol
---

# Claiming a desk

A claim is not a request that someone approves. It is a statement of four facts plus the time
you made it, checked against a protocol that either fits or does not. There is nobody to ask.

## The four facts

| field | what it means | allowed |
| --- | --- | --- |
| `seed` | who is asking | a lowercase slug, 2–32 characters |
| `surface` | where they came from | `base`, `desk`, or `relay` |
| `rung` | the capability rung they hold | 1 to 6 |
| `distance` | their 42i distance from nominal | 0 to the rung's ceiling |

The claim also carries `at`: when it was issued, in epoch milliseconds. That is the only value
that moves, and it is what the lease is measured from.

## The refusals

A claim is refused, with its reason, when:

- **absolute zero** — a rung of 0 may connect to the desk, but it may not hold one. A desk is
  a readable surface, and absolute zero has not passed a single test.
- **drift** — the declared distance is past the ceiling of the declared rung. Rung 2 covers
  0–60; a claim of rung 2 at 74 is a claim the rung does not describe.
- **held** — the desk already has a holder inside its lease. One body at a time.
- **bad seed** — the name is not a slug, or it is not 2–32 characters.

A refusal changes nothing. The desk is not reserved, penalised, or marked; it stays exactly as
it was, and the claimant may try again with a claim that fits.

## The lease

Ninety seconds. A holder keeps the desk by calling the same claim again with a fresh clock —
that is what a heartbeat is, and nothing else is required. Silence is not a state: once the
lease is up, a reader sees an empty desk, because `sweep` runs on every read.

This is the part that makes it a hot desk instead of a booking. There is no cleanup task, no
expiry job, and no stale holder to explain away. The descriptor of a desk is a claim and a
deadline; when the deadline passes, the claim is not a claim any more.

## The link

The **copy link** button on a held desk produces a URL like:

```text
https://james-gibson.github.io/le.ad/#desk=ad-03&claim=AHluYXBzZXxkZXNr...
```

The fragment carries the desk and the encoded claim: `seed|surface|rung|distance|at`, base64url.
Opening the link on another machine validates the claim and, if it still fits, claims the desk
there. A Pages host never sees a fragment, so the handoff costs no request and leaves no log.

If the link is older than the lease, it is refused as **stale**. That is deliberate: a claim
link is a ticket, not a key, and a ticket is worth what its clock says.

## Keeping a desk

The switch under the row, *heartbeat while this tab is open*, sends the same heartbeat a seed
would, every fifteen seconds, for the desks this browser holds. It exists so the lease can be
watched rather than trusted: leave it off for a minute and a half and the lamp goes out.

A seed talking to the desk does the same thing over the protocol. The page is a reference
implementation, not a privileged client.
