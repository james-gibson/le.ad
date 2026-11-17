---
title: The UI, from tuiparts
description: What tuiparts.sh actually is, what it cannot be on a static page, and the half of it le.ad took.
order: 1
updated: 2026-11-16
tags: ui, tuiparts, parts
---

# The UI, from tuiparts

[tuiparts.sh](https://tuiparts.sh/) is a parts library for terminal interfaces. Its claim is
narrow and sharp: **package the difficult behaviour, copy the opinionated layer.** Interaction
— focus, keyboard activation, pointer events, collections, overlay layering, lifecycle — ships
as versioned packages. Presentation — glyphs, palette, density, labels, variants — installs as
source into your repository, where you can read and change it.

le.ad takes that split, and the vocabulary that comes with it, and drops the terminal.

## Why not the package

tuiparts renders through [OpenTUI](https://github.com/anomalyco/opentui), which is a native
terminal renderer. Its Roots and Parts are OpenTUI renderables: a `Box`, a `Text`, an edit
buffer owned by the terminal's input contract. There is no OpenTUI renderer for a browser, so
`@tuiparts/react` cannot be a dependency of a GitHub Pages site — every Part would need a host
that is not there.

Pretending otherwise would be the worst outcome: a page that says "built with tuiparts" while
rendering `<div>`s behind an adapter nobody can trace. So the site is explicit about the line.

## What is carried over

**The division.** Behaviour lives in typed controls; presentation lives in a token file and a
stylesheet, both of which you can edit without a runtime theme engine.

**The token contract.** `src/ui/theme.ts` copies tuiparts' `Tokens` interface field for field —
`colors`, `glyphs`, `borders`, `density` — including the rule that intent colours are
*background and foreground pairs*, so a component never infers text contrast. The default desk
theme registers `primary` as the accent fill with `night` as its foreground, which is exactly
the pairing the palette page measures.

**The vocabulary.** A desk is assembled from `Box`, `Row`, `Stack`, `Text`, `Panel`, `Badge`
and `Dot` — Parts, not divs with page-specific class names. Controls are Roots: `Switch` owns
`checked` and exposes it as `aria-checked`; `Tabs` owns the roving focus stop.

**The presentation-is-source rule.** There is no theme runtime repainting anything. `theme.ts`
is a small registry with `get`, `subscribe` and `setActive` for the one component that needs to
know — and `setMode` returns `false` for a light mode it cannot honestly provide.

## What is not carried over

- Glyph-drawn borders. `BORDERS` exports tuiparts' four border styles as characters, but the
  desk draws its lines in CSS, because a browser has subpixel rules and a terminal does not.
- Density in character cells. `density.paddingX` is still expressed in `ch`, and the shell
  maps it to real space, but a browser is not a cell grid and pretending it is would fight the
  layout at every breakpoint.
- The recipes themselves. `Button`, `Field`, `Switch`, `Tabs` are written here, in the shape a
  tuiparts recipe would have, so replacing one with the upstream source later is a file swap
  and not a rewrite.

## Where each piece lives

| file | what it is |
| --- | --- |
| `src/ui/theme.ts` | the token contract, two registered themes, the border characters |
| `src/ui/theme.css` | the wall and the base type — the part tuiparts would call presentation |
| `src/ui/parts.tsx` | Box, Row, Stack, Text, Panel, Badge, Dot |
| `src/ui/controls.tsx` | Button, Field, Input, Select, Switch, Tabs |
| `src/pages/Design.tsx` | the catalogue, live, with the props the site actually uses |

If a web renderer for OpenTUI ever ships, the files to delete are the last three rows. The
token contract is the part that would survive, which is the same bet tuiparts makes on the
terminal.
