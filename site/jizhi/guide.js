const root = document.documentElement;
const media = matchMedia('(prefers-color-scheme: dark)');
const toggle = document.querySelector('#theme-toggle');
const system = document.querySelector('#theme-system');
const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');
function paint() {
  const dark = current() === 'dark';
  toggle.firstElementChild.textContent = dark ? '☀' : '☾';
  const label = root.dataset.language === 'en' ? `Switch to ${dark ? 'light' : 'dark'} mode` : `切换到${dark ? '浅' : '深'}色模式`;
  if (toggle.getAttribute('aria-label') !== label) toggle.setAttribute('aria-label', label);
  if (toggle.title !== label) toggle.title = label;
  const pressed = String(!root.dataset.theme);
  if (system.getAttribute('aria-pressed') !== pressed) system.setAttribute('aria-pressed', pressed);
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
window.addEventListener('site-language-change', paint);
document.querySelector('#year').textContent = String(new Date().getFullYear());
paint();
