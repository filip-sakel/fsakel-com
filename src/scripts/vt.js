// Inlined in <head> by BaseLayout.astro; the CSP allows it by hash
// (deploy/Caddyfile). Optional: without it the site works, every page
// slide goes forward, and the nav selection switches without animating.

// On arrival (before the first frame of the new page):
// - slide direction (base.css): moving to an earlier nav item, or back out
//   of a write-up, slides backward.
// - the nav item of the page we came from gets data-was, so Nav.astro
//   animates the selection over from it.
addEventListener('pagereveal', (e) => {
  const from = window.navigation?.activation?.from?.url;
  if (!e.viewTransition || !from) return;
  // The nav's own links give the order (src/data/site.ts).
  const links = document.querySelectorAll('.site-nav a');
  const item = (url) => {
    const path = new URL(url).pathname;
    return [...links].findLastIndex((a) => (a.pathname === '/' ? path === '/' : path.startsWith(a.pathname)));
  };
  // Pages below a section (write-ups) rank just after it.
  const rank = (url) => Math.max(item(url), 0) + (new URL(url).pathname.split('/').filter(Boolean).length > 1 ? 0.5 : 0);
  if (rank(from) > rank(location.href)) e.viewTransition.types.add('back');
  const was = links[item(from)];
  if (was && !was.hasAttribute('aria-current')) was.setAttribute('data-was', '');
});

// Hold the pressed nav item down until the next page shows. Without this,
// releasing the click ends :active and it pops back up while the page loads.
let held;
addEventListener('click', (e) => {
  const a = e.target.closest?.('.site-nav a');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  // Already on this page: stay put (no reload, no slide).
  if (a.pathname === location.pathname) return e.preventDefault();
  if (a.hasAttribute('aria-current')) return;
  held = a;
  a.setAttribute('data-held', '');
});
// Coming back to this page from the back/forward cache: let it go.
addEventListener('pageshow', (e) => e.persisted && held?.removeAttribute('data-held'));
