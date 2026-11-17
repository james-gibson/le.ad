---
title: What a hot desk is
description: An empty desk is not unfinished work. It is the smallest useful thing a site can be.
order: 1
updated: 2026-11-16
tags: desk, premise
---

# What a hot desk is

A hot desk is a desk nobody owns. You sit at it, you work, you leave, and the next person
sits down. The furniture is the service; nobody has to book it, and nobody has to clean up
after you.

le.ad is that, as a page. It holds no content of its own — no article, no dashboard, no
product. It holds six desks and the rules for taking one. A seed that wants to be reachable
arrives, claims a desk, and leaves a link behind. The link is the connection point: it carries
the claim, so the next machine to open it is already sitting at the desk.

## Why empty is the feature

Most sites are built to accumulate. Every page is an asset, every asset is a claim the site
makes about being worth visiting, and the cost of owning the claim grows quietly. A hot desk
goes the other way. Its value is that it is **unoccupied and true**: the page tells you which
desks are free right now, and a desk that nobody is at does not pretend otherwise.

That is a different promise from a documentation site, and it needs a different machine. There
is no content model to grow here, no sidebar to fill. There is a small protocol, a row of
furniture, and a rule that silence returns a desk to the row.

## The parts

| part | what it is |
| --- | --- |
| a desk | an address, a lamp, and at most one holder |
| a claim | the seed, its surface, its rung, its 42i distance, and the time it asked |
| a lease | ninety seconds, renewed by a heartbeat, lost to silence |
| the record | one line of JSON per desk, with no clock in it |

The record is the part worth keeping. It is stable: two rows that received the same claims in
the same order publish the same lines. That is what makes a claim a citation rather than a
rumour, and it is why the record is on the page instead of in a database.

## What it is not

- Not a chat room. A desk holds one body; the link is how you hand it over.
- Not a booking system. There is no future tense: a desk is held now or it is empty.
- Not a server. The row lives in your browser and in the link you copy. A static host cannot
  hold state, and a desk that pretends to would be a desk that lies after a deploy.

The protocol that makes those three sentences true is one page long, and it is
[the isotope](/isotope/hot-desk). It is here rather than in a framework because it is the one
thing this seed would like to hand back upstream.
