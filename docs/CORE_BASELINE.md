# Lang Systems Core Baseline

PenSpin adopts [Lang Systems Core Development](https://github.com/langzonedev/LangSystems-Core-Development/tree/2946b0de1b86a02821d01ec031fd2aae58573cc6), reviewed 9 November 2026. Review again after the first human playtest or a change to hosting or data handling.

- **Product brief** — An arcade rhythm game in which a player starts a pen spin and keeps it alive with timed taps. The desk, hand and pen establish the first-person view.
- **Architecture** — Static browser app on GitHub Pages. The beat uses a monotonic browser clock. The browser stores only the best streak and the sound setting. There is no server, account or third-party runtime dependency.
- **UX review** — The Core UX Designer recommended a grip-adjacent timing cue, forgiving opening cadence, phase-stable beats, explicit judgements, immediate retry and pause on tab hide. PenSpin also respects reduced-motion preferences for decorative trails and thumb motion.
- **Acceptance** — One touch or Space starts a run. On-time and near-timed hits keep the streak, rapid premature tapping ends the run, missing a beat drops the pen, retry resets the run and the best score survives reload. The arcade release is a human playtest candidate.
