// Optional enhancement for the CSS page slide (base.css). Without this script
// every navigation slides forward; with it, moving to an earlier nav item (or
// back out of a write-up) slides backward.
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
