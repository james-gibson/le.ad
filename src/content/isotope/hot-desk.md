---
title: The desk-claim isotope
description: The one thing le.ad introduces — a lease on a connection point, specified as an isotope and proposed upstream.
order: 1
updated: 2026-11-16
tags: isotope, desk, lease, upstream
---

# The desk-claim isotope

The lab already measures whether a caller may act: a 42i distance, a rung, a ceiling. It does
not say what happens when a caller wants *somewhere to be*. That is the gap this isotope fills,
and it is the only thing le.ad adds to the canon.

A desk is a connection point with an address and no content. A seed claims it, holds it for a
lease, and leaves. The rule the lattice did not have is the last clause: **a connection point
that is held needs a clock, and silence has to return it.** Without that, "held" is a fact
about the last writer, which is indistinguishable from a rumour.

## The identity

```text
isotope    6fBcXp8gZNhhBwwbQMP0t9F5MuxpzGWMX_l2k5TJd24
signature  33778bc4c5bdda4e…  (hmac-sha256, key seed-42)
canon      72 tokens, 14 parts
source     features/hot-desk.feature
```

The id is content-addressed by the canon, so it changes only if the behaviour changes. Running

```sh
npm run isotope
```

re-derives it from `features/hot-desk.feature` with the real `brine.py`, not a reimplementation.
If the number above is not what that command prints, the page is wrong and the build should be
stopped — which is why the publish guard checks it.

## The rules, in one table

| rule | the desk does this | and refuses with |
| --- | --- | --- |
| rung 0 | may connect, may not hold | `rung-zero` |
| distance past the rung ceiling | nothing changes | `drift` |
| a second claim inside the lease | nothing changes | `held` |
| heartbeat by the holder | lease ends 90s after the heartbeat | — |
| heartbeat by another seed | nothing changes | `not-holder` |
| release by the holder | empty immediately | — |
| release by another seed | nothing changes | `not-holder` |
| reading at or past the lease | empty, with no holder | — |
| a claim link older than the lease | refused on arrival | `stale` |

The ceilings are the lattice's, not new ones: rung 1 holds 0–20, rung 2 holds 0–60, rung 3
holds 0–100, rung 4 holds 0–140, rung 5 holds 0–180, rung 6 holds 0–220. le.ad fixes one
constant of its own — `LEASE_MS` — at ninety seconds, and states it rather than deriving it,
because a lease is an operational choice and the lattice is not.

## The feature

The specification is fourteen scenarios, each with exactly one action, no background and no
data tables, so the canon reads it the way a human does:

```gherkin
Scenario: an expired lease returns the desk to the row
  Given a desk held by a seed
  When the desk is read 90 seconds after the claim was issued
  Then the desk reports no holder
  And the desk is empty
```

That scenario is the whole isotope. Everything else is what keeps it honest: refusals that
change nothing, a record that is identical for identical claims, and a link that is a ticket
with an expiry rather than a key.

## The reference implementation

`src/lib/desk.ts` is the state machine, and it is pure: every decision is a function of
`(desk, claim, now)`, so the page and the feature cannot drift without a test noticing. The
page renders it three ways at once — the row of desks, the record, and the claim link — which
is the cheapest possible conformance suite: if the implementation breaks, the desk in front of
you stops lighting.

## Status: proposed, not adopted

This is the first home of the isotope, not its final one. The proposal is filed as
[isotope#46](https://github.com/james-gibson/isotope/issues/46): upstream the feature as
`isotope/features/hot-desk.feature`, and move the constant to `trust.go` beside the rung
ceilings. Until that lands:

- the feature file lives here, validated against the real canon;
- the isotope id above is the one this file produces;
- no other seed should depend on the shape of the claim — it is a proposal, and a proposal may
  be refused.

The thing that makes it worth upstreaming is not the page. It is that a federation needs a
smaller verb than "grant" for a connection point: *hold this, for now, and let it go.*
