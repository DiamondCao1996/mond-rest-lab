# MOND Rest Lab

A browser-based field guide for collecting a five-minute resting baseline and a participant-paced VR safety experiment with MOND HRV and Shimmer GSR+ in iMotions.

The six steps cover session naming, sensor placement, stream setup, study timing, recording, and export. The protocol records five minutes of settling followed by five minutes of rest. Only the rest phase is the baseline analysis window.

## Use

Open the [published guide](https://DiamondCao1996.github.io/mond-rest-lab/). Enter a participant code (E1 is the example), date and run number. Follow each step and tick items after completing them in the real applications. Download the local notes as text or JSON, and preserve them alongside the original recordings.

- Native keyboard-accessible HTML controls; responsive desktop and mobile layouts.
- Local draft persistence, copyable study labels, manual observation notes.
- Downloadable neutral fixation PNG for the two iMotions study items.
- Optional ten-minute rehearsal or one-minute quick practice. Neither controls a recording.
- No analytics, external fonts, backend, runtime dependencies or sensor connections.

## VR experiment and comparison

Open **VR experiment & comparison** in the workflow switch, or [the direct page](https://diamondcao1996.github.io/mond-rest-lab/experiment.html). Link an exact saved REST session from the same participant. Rest and VR drafts use separate storage keys. Importing the baseline identity does not verify that data were collected.

The five VR steps cover paired identity, equipment/iMotions preparation, a manual event notebook, subjective ratings and behaviour, and quality-aware comparison/export. The operator clock is open-ended: 10–15 minutes is an expectation, never a cutoff. Pauses remain in elapsed time. Native task events, not this clock, define the analysis interval.

The proposed primary comparison is REST_300s versus the first 300 seconds after the actual safety-task onset (after familiarisation). Subsequent non-overlapping five-minute windows are secondary; shorter tails stay preserved. Freeze the protocol before collection. Compare common stage labels separately where justified, since experience changes the stage reached at a given time.

The worksheet accepts manually calculated HR, RMSSD, SDNN/SDRR, tonic SCL and SCR/min summaries, computes VR-minus-rest and percentage differences, and provides delta log RMSSD. It does not calculate physiology from raw files or classify stress. Quality declarations are not independent verification. LF/HF guidance is conditional on valid sampling, stationarity and a prespecified spectral method.

Six NASA-TLX dimensions can be transcribed for an unweighted Raw TLX mean (performance 0=perfect, 100=failure). The other short ratings are explicitly ad hoc. Missing values remain missing. JSON downloads contain all draft fields; event and comparison CSV downloads carry timing/provenance caveats. CSV text fields are protected against formula interpretation. Download each comparison before replacing its values.

Movement, controller grip, posture/headset differences, novelty and discomfort are prominent confounds. Pilot sensor contact during the actual interaction; resting validation does not establish accuracy in active VR. Keep raw data and methods separate from the public source repository.

## Limits and privacy

This page cannot connect to devices, start/stop iMotions, verify recording status, or collect sensor data. Checklists are operator declarations. Browser timer and note timestamps are not scientific event markers. Exported files are collection notes, not physiological data.

Notes are stored in this browser's localStorage and are not sent to a server. They are accessible to someone using the same browser profile. Export notes before clearing the draft or browser data. GitHub receives ordinary site requests when serving the public page; external reference links open only when clicked.

The 25% MOND host-time tolerance with a 100 ms floor is the selected exploratory policy from the established workflow. It is not a universally validated optimum. Streamed rolling RMSSD differs from whole-phase RMSSD; observed events are not an independently verified complete beat sequence. No clinical interpretation is provided.

## Local development

Requires a current Node.js version supporting the built-in test runner. No install or build step.

```sh
npm test
npm start
```

Open http://127.0.0.1:4173. The development server exposes only the explicitly listed public page assets.

## GitHub Pages

Publish the `main` branch, root directory. `.nojekyll` keeps the static files unchanged. The public site uses `index.html`, `styles.css`, `app.js`, `core.js`, `favicon.svg`, and `experiment.html`, `experiment.css`, `experiment.js`, `experiment-core.js`.

No actual participant measurements, prior reports, machine paths or credentials belong in this repository. Keep exported participant logs and sensor recordings elsewhere.

## References

- [Shimmer GSR+ User Guide, revision 1.13](https://shimmersensing.com/wp-content/docs/support/documentation/GSR_User_Guide_rev1.13.pdf)
- [MOND LSL integration guide](https://github.com/DiamondCao1996/hrv-sensor/blob/main/docs/guides/LSL_INTEGRATION.md)
- [iMotions stimuli](https://imotions.com/products/imotions-lab/features/stimuli/) and [API overview](https://imotions.com/products/imotions-lab/developers/api/)
- [Laborde et al. (2017), HRV study design and reporting](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00213/full)
- [Boucsein et al. (2012), EDA publication recommendations](https://doi.org/10.1111/j.1469-8986.2012.01384.x)
- [NASA-TLX package](https://humansystems.arc.nasa.gov/groups/tlx/downloads/TLX.pdf)

Menu paths reflect the established iMotions workflow and may differ by installed version. Use native stimulus boundaries and verify timestamp origins before aligning signals.
