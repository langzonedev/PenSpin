# PenSpin

PenSpin is a one-button rhythm game for Lang Systems Arcade. A first-person view puts the pen, your hand and the next beat in the same place.

## Play

Open [PenSpin on GitHub Pages](https://langzonedev.github.io/PenSpin/). Tap the playfield or press Space to flick the pen. Tap again as the dot meets the diamond. Keep landing spins as the beat speeds up. Tap again after a drop to retry.

The game starts at 75 BPM. Every five spins shortens the beat until it reaches about 136 BPM. Early and late hits within the timing window keep the streak alive, while perfect hits get their own sound and visual cue. A missed beat or two premature taps before the same beat ends the run. Leaving the tab pauses the game and resuming gives you a fresh beat.

## Run locally

From the repository root, run `python3 -m http.server 8000` and open <http://localhost:8000>. The game is static HTML, CSS, JavaScript and SVG. GitHub Pages serves the root of `main`.

Sound starts muted. The best streak and sound preference are stored in the current browser. The game makes no account, analytics or gameplay network requests.

## Human playtest

Start a run with one hand on a phone. Try to reach the first speed change at five spins. Check whether the diamond is easy to watch while the pen moves and whether the opening timing feels fair. Try the same run with sound enabled and compare how easy it is to find the beat.
