// Inlined in <head> after vt.js and neu.js by BaseLayout.astro; the CSP
// allows the bundle by hash (deploy/Caddyfile). Optional: without it nav
// taps just don't tick. Prototype: design/prototypes/haptics-lab.html.

// One haptic tick per nav tap.
// - Android (Vibration API): a 26ms buzz, about one iOS switch tick.
// - iOS (no Vibration API): only a real tap that toggles an
//   <input type=checkbox switch> ticks, so each nav link carries a hidden
//   label wrapping a switch (Nav.astro), which .haptic-on lays over it. The
//   label's click bubbles through the link as usual (vt.js still holds it
//   pressed), but a label's activation replaces the link's, so we navigate
//   ourselves. Set from here, so no script means no labels and plain links.
//   Coarse pointers only: a mouse would lose Cmd/Ctrl-click to new tab.
if (navigator.vibrate) {
  addEventListener('click', (e) => e.target.closest?.('.site-nav a') && navigator.vibrate(26));
} else if (matchMedia('(pointer: coarse)').matches) {
  document.documentElement.classList.add('haptic-on');
  // Runs after vt.js's listener, so a same-page tap it cancelled stays put.
  addEventListener('click', (e) => {
    if (e.target.matches('.haptic') && !e.defaultPrevented) location.assign(e.target.parentNode.href);
  });
}
