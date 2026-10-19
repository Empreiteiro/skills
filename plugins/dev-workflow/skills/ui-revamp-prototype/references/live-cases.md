# Building the live Cases tab

Mechanics for the rule in SKILL.md: every frame in Cases runs the direction for real.

- **React 18 UMD (cdnjs) + `htm` (jsdelivr), no build step**, or the app's own framework from a CDN if it is
  not React. A virtual DOM keeps focus and caret in a field while state changes; re-rendering with
  `innerHTML` loses the caret on the first keystroke. One root per frame (`ReactDOM.createRoot`), mounted
  after the chrome HTML is in place. Cases mounts on first visit and unmounts (`root.unmount()`) before the
  grouping switches.
- **The frame is the device.** Fixed height with internal scroll (`overscroll-behavior: contain`): the
  surface's real desktop width, 390 px for a phone, with what the app does on phones (16 px inputs and 44 px
  touch targets wherever the app has them). The frame slot is a flex item and **needs `min-width: 0`**:
  without it, it grows to the desktop width on a phone and the whole page scrolls sideways.
- **A surface that spans screens gets the whole app in the frame.** If the direction lives in more than one
  place (home, navigation, editor), the desktop frame is the app with its navigation at its real width
  (1200 px, say), scaled down with `zoom` when the column is narrower. A single-page surface uses its own
  width.
- **Focus requests across screens are consumable.** "Open settings with the caret in the box" crosses a
  screen change, so the destination mounts *after* the request. Keep a request counter and a "handled" ref;
  the destination honors the request on mount if the counter moved, and never again. An effect that skips
  the first render loses exactly this case.
- **Reserve each frame's space before mounting.** With dozens of live frames, mount each one as it enters
  the viewport (`IntersectionObserver`) and give the slot the device's `aspect-ratio`. Without the
  reservation, every mount pushes the page and the reader loses their place.
- **A tab hidden with `[hidden]` needs its own rule** (`[hidden] { display: none !important }`). The reset
  that guarantees it is only added at publish time, and the tab's `display: grid`/`flex` beats the attribute
  in the local file: both tabs show, and you review a page the stakeholder will never see.
- **Without a virtual DOM, three obligations.** If frames are built from strings and `innerHTML`, every
  redraw restores focus, selection and scroll; nothing redraws during IME composition (`compositionstart` /
  `compositionend`); and the field being typed in is patched, never redrawn.
- **New classes never reuse a variant name, and the `button` reset goes inside `:where()`.** A piece named
  `.ghost` animated every `btn ghost` in the frame, and a `.mock-app button { color: inherit }` beat the
  button variant's color and blanked the text of dark buttons. Both pass a syntax check and only show up in
  the script run or to the eye.
