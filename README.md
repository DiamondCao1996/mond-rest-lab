# MOND Rest Lab

A browser-based field guide for collecting a five-minute resting baseline with MOND HRV and Shimmer GSR+ in iMotions.

The six steps cover session naming, sensor placement, stream setup, study timing, recording, and export. The protocol records five minutes of settling followed by five minutes of rest. Only the rest phase is the baseline analysis window.

## Use

Open the [published guide](https://DiamondCao1996.github.io/mond-rest-lab/). Enter a participant code (E1 is the example), date and run number. Follow each step and tick items after completing them in the real applications. Download the local notes as text or JSON, and preserve them alongside the original recordings.

- Native keyboard-accessible HTML controls; responsive desktop and mobile layouts.
- Local draft persistence, copyable study labels, manual observation notes.
- Downloadable neutral fixation PNG for the two iMotions study items.
- Optional ten-minute rehearsal or one-minute quick practice. Neither controls a recording.
- No analytics, external fonts, backend, runtime dependencies or sensor connections.

## Scope

This page cannot connect to devices, start/stop iMotions, verify recording status, or collect sensor data. Checklists are operator declarations. Browser timer and note timestamps are not scientific event markers. Exported files are collection notes, not physiological data.

Notes are stored in this browser's localStorage and are not sent to a server. They are accessible to someone using the same browser profile. Export notes before clearing the draft or browser data. GitHub receives ordinary site requests when serving the public page; external reference links open only when clicked.

The 25% MOND host-time tolerance with a 100 ms floor is the selected exploratory policy from the established workflow. It is not a universally validated optimum. Streamed rolling RMSSD differs from whole-phase RMSSD; observed events are not an independently verified complete beat sequence. No clinical interpretation is provided.

## Local development

Requires a current Node.js version supporting the built-in test runner. No install or build step.

```sh
npm test
npm start
```

Open http://127.0.0.1:4173. The development server exposes only the five public page assets.

## GitHub Pages

Publish the `main` branch, root directory. `.nojekyll` keeps the static files unchanged. The public site needs only `index.html`, `styles.css`, `app.js`, `core.js`, and `favicon.svg`.

No actual participant measurements, prior reports, machine paths or credentials belong in this repository. Keep exported participant logs and sensor recordings elsewhere.

## References

- [Shimmer GSR+ User Guide, revision 1.13](https://shimmersensing.com/wp-content/docs/support/documentation/GSR_User_Guide_rev1.13.pdf)
- [MOND LSL integration guide](https://github.com/DiamondCao1996/hrv-sensor/blob/main/docs/guides/LSL_INTEGRATION.md)

Menu paths reflect the established iMotions workflow and may differ by installed version. Use native stimulus boundaries and verify timestamp origins before aligning signals.
