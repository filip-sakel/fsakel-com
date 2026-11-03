// Inlined in <head> after vt.js by BaseLayout.astro; the CSP allows the
// pair by hash (deploy/Caddyfile). Optional: without it the neumorphic
// buttons (src/styles/neu.css) still sink on hover, just evenly and
// without tilting. Touch input is ignored, so phones get the even sink.

// The mouse position within the button as --px/--py, −1 … 1 (neu.css
// clamps it, for the hover zone just past the edge). Reading the rect on
// every move forces no extra work, so it isn't cached (docs/performance.md).
addEventListener('pointermove', (e) => {
  const el = e.pointerType === 'mouse' && e.target.closest?.('.neu');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--px', (2 * (e.clientX - r.left)) / r.width - 1);
  el.style.setProperty('--py', (2 * (e.clientY - r.top)) / r.height - 1);
}, { passive: true });
