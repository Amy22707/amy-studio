const root = document.documentElement;
const media = matchMedia('(prefers-color-scheme: dark)');
const toggle = document.querySelector('#theme-toggle');
const system = document.querySelector('#theme-system');
const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');
function paint() {
  const dark = current() === 'dark';
  toggle.firstElementChild.textContent = dark ? '☀' : '☾';
  toggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  toggle.title = toggle.getAttribute('aria-label');
  system.setAttribute('aria-pressed', String(!root.dataset.theme));
}
toggle.addEventListener('click', () => {
  root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('amy-studio.theme', root.dataset.theme); } catch {}
  paint();
});
system.addEventListener('click', () => {
  delete root.dataset.theme;
  try { localStorage.removeItem('amy-studio.theme'); } catch {}
  paint();
});
media.addEventListener('change', paint);
document.querySelector('#year').textContent = String(new Date().getFullYear());
paint();
