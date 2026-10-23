# React Bits components

Source: [React Bits](https://reactbits.dev) by David Haz, TypeScript + CSS variants, fetched from the
registry (`https://reactbits.dev/r/<Name>-TS-CSS.json`). License: MIT + Commons Clause (free to use in
commercial products; the components themselves may not be resold).

| Component | Used for | Local changes |
|---|---|---|
| BlurText | Landing headline word-by-word reveal | Added an `as` prop so it can render a `span` inside an `h1` |
| CountUp | Staff overview numbers | none |
| SpotlightCard | Landing example worker cards (pointer spotlight) | none |
| ShinyText | "Joining is free" line in the worker band on the landing page | none |
| StatusMark | Success marks (hired, terms confirmed) | none |

All of them respect `prefers-reduced-motion`. Keep heavy WebGL components (backgrounds, 3D) out of the
app: many workers use low-end Android phones.
