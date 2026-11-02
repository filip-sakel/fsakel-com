// Inlined in <head> by BaseLayout.astro; the CSP allows it by hash
// (deploy/Caddyfile). Optional: without it the site works and every page
// slide goes forward.

// Slide direction (base.css): moving to an earlier nav item, or back out of
// a write-up, slides backward.
addEventListener('pagereveal', (e) => {
  const from = window.navigation?.activation?.from?.url;
  if (!e.viewTransition || !from) return;
  const order = (document.querySelector('meta[name="nav-order"]')?.content ?? '').split(' ');
  const rank = (url) => {
    const path = new URL(url).pathname;
    const i = order.findLastIndex((h) => (h === '/' ? path === '/' : path.startsWith(h)));
    // Pages below a section (write-ups) rank just after it.
    const depth = path.split('/').filter(Boolean).length;
    return Math.max(i, 0) + (depth > 1 ? 0.5 : 0);
  };
  if (rank(from) > rank(location.href)) e.viewTransition.types.add('back');
});

// Keep the pressed nav item sunk until the next page shows. Without this,
// releasing the click ends :active, so the item pops back up (and the old
// page's item stays selected) until the new page arrives with it selected.
let restore;
addEventListener('click', (e) => {
  const a = e.target.closest?.('.site-nav a');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const nav = a.closest('.site-nav');
  const prev = nav.querySelector('[aria-current]');
  if (prev === a) return;
  nav.dataset.navigating = '';
  prev?.removeAttribute('aria-current');
  a.setAttribute('aria-current', 'page');
  restore = () => {
    delete nav.dataset.navigating;
    a.removeAttribute('aria-current');
    prev?.setAttribute('aria-current', 'page');
  };
});
// Coming back to this page from the back/forward cache: undo the above.
addEventListener('pageshow', (e) => e.persisted && restore?.());
