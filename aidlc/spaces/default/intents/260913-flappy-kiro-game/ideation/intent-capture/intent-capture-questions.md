## Sources

- [desc] Initial description: "Build a browser-based Flappy Kiro game. The player controls Ghosty with Space or mouse/tap, avoids obstacles, earns points, and can restart after game over."
- [scope] Workflow-selected scope: `flappy-kiro-game`.

---

## Q1. What is the primary goal of this game — a personal project, a demo/portfolio piece, or something else?

A. Personal fun / learning project
B. Portfolio / demo to showcase skills
C. Public-facing product for users
D. Internal tool or prototype
X. Other (please specify)

[Answer]:

---

## Q2. Who plays this game? Is the audience anyone with a browser, or a specific group (e.g. Kiro IDE users, friends, a specific community)?

A. Anyone with a web browser (general public)
B. Kiro IDE users / developers specifically
C. A specific private group (friends, team)
D. Not yet defined
X. Other (please specify)

[Answer]:

---

## Q3. What counts as success for this build? (select all that apply)

A. Game is playable end-to-end with no crashes
B. Smooth frame rate (≥ 50 fps) on desktop
C. Touch/tap controls work on mobile
D. High score is tracked and displayed
X. Other (please specify)

[Answer]:

---

## Q4. The existing `game.js` already implements a largely complete Flappy Bird–style game with Ghosty. Should this workflow treat that as the final implementation, or does it need significant changes (new features, bug fixes, visual overhaul)?

A. The existing implementation is mostly done — polish and verify it
B. It needs specific changes or additions (I'll describe in Other)
C. Start fresh — replace the current code
D. Not yet decided
X. Other (please specify)

[Answer]:

---

## Assumptions & Open Questions

- [assumption] The game runs entirely client-side (no backend, no persistent leaderboard server).
- [assumption] The target browsers are modern evergreen browsers (Chrome, Firefox, Safari, Edge).
- [assumption] Mobile support means responsive layout + touch/pointer events, not a native app wrapper.
