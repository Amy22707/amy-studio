const projectContainer = document.querySelector('#projects');
const count = document.querySelector('#project-count');
const dialog = document.querySelector('#project-dialog');
const filters = [...document.querySelectorAll('[data-filter]')];
let projects = [];
let activeFilter = 'all';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const element = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
};

// External URLs must be explicit; local screenshots stay within the Studio site.
function externalUrl(value) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

function imageUrl(value) {
  const path = text(value);
  if (!path) return '';
  const absolute = externalUrl(path);
  if (absolute) return absolute;
  if (!path.startsWith('./images/') || path.includes('..') || path.includes('\\')) return '';
  return new URL(path, document.baseURI).href;
}

function link(label, href, primary = false) {
  const node = element('a', `button${primary ? ' primary' : ''}`, label);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function meta(project) {
  const node = element('div', 'project-meta');
  for (const label of [...(Array.isArray(project.platforms) ? project.platforms : []), text(project.version)]) {
    if (text(label)) node.append(element('span', '', text(label)));
  }
  return node;
}

function title(project) { return text(project.title) || (project.kind === 'game' ? 'A game, coming soon' : 'A tool, coming soon'); }
function description(project) { return text(project.description) || 'A new space on the workbench. More details will be shared when it is ready.'; }

function artwork(project) {
  const node = element('div', `project-art ${project.kind}`);
  const url = imageUrl(project.image);
  if (url) {
    const image = element('img');
    image.src = url;
    image.alt = `${title(project)} screenshot`;
    image.loading = 'lazy';
    image.addEventListener('error', () => { node.replaceWith(artwork({ ...project, image: '' })); }, { once: true });
    node.append(image);
    return node;
  }
  const illustration = element('div', project.kind === 'game' ? 'game-tile' : 'tool-tile');
  illustration.setAttribute('aria-hidden', 'true');
  if (project.kind === 'game') {
    for (const symbol of ['', '', '✦', '', '✦', '', '✦', '', '']) illustration.append(element('span', '', symbol));
  } else {
    illustration.append(element('strong', '', '⌘'));
    for (let i = 0; i < 3; i++) illustration.append(element('i'));
  }
  node.append(illustration, element('span', 'art-caption', 'PLACEHOLDER ART'));
  return node;
}

function openProject(project) {
  document.querySelector('#dialog-kind').textContent = project.kind === 'game' ? 'A LITTLE PLAY' : 'AN EVERYDAY TOOL';
  document.querySelector('#dialog-title').textContent = title(project);
  document.querySelector('#dialog-description').textContent = description(project);
  document.querySelector('#dialog-meta').replaceChildren(...meta(project).childNodes);
  document.querySelector('#dialog-details').textContent = text(project.details);
  const actions = document.querySelector('#dialog-links');
  actions.replaceChildren();
  for (const [label, key] of [['Download', 'downloadUrl'], ['Play online', 'playUrl'], ['Release notes', 'releaseUrl'], ['Source code', 'sourceUrl']]) {
    const href = externalUrl(project[key]);
    if (href) actions.append(link(label, href, actions.childElementCount === 0));
  }
  document.querySelector('#dialog-placeholder').hidden = Boolean(actions.childElementCount || text(project.details));
  dialog.showModal();
}

function card(project) {
  const node = element('article', 'project-card');
  const copy = element('div', 'project-copy');
  const topline = element('div', 'project-topline');
  const hasDownload = externalUrl(project.downloadUrl) || externalUrl(project.playUrl);
  topline.append(element('span', '', project.kind === 'game' ? 'GAME' : 'TOOL'), element('span', 'project-status', hasDownload ? 'AVAILABLE' : 'ON THE WORKBENCH'));
  const actions = element('div', 'project-actions');
  const details = element('button', 'detail-button', 'View details');
  details.type = 'button';
  details.append(element('span', '', '↗'));
  details.setAttribute('aria-haspopup', 'dialog');
  details.setAttribute('aria-label', `View details: ${title(project)}`);
  details.addEventListener('click', () => openProject(project));
  actions.append(details);
  if (externalUrl(project.downloadUrl)) actions.append(link('Download ↓', externalUrl(project.downloadUrl), true));
  else if (externalUrl(project.playUrl)) actions.append(link('Play ↗', externalUrl(project.playUrl), true));
  copy.append(topline, element('h3', '', title(project)), element('p', '', description(project)), meta(project), actions);
  node.append(artwork(project), copy);
  return node;
}

function renderProjects() {
  const shown = projects.filter((project) => activeFilter === 'all' || project.kind === activeFilter);
  projectContainer.replaceChildren(...shown.map(card));
  if (!shown.length) projectContainer.append(element('p', 'empty-note', 'Nothing here yet. Come back soon.'));
  count.textContent = `${shown.length} ${shown.length === 1 ? 'project' : 'projects'}`;
  filters.forEach((button) => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

filters.forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; renderProjects(); }));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

function renderUpdates(updates) {
  const entries = (Array.isArray(updates) ? updates : []).filter((entry) => text(entry.title));
  if (!entries.length) return;
  const list = document.querySelector('#updates-list');
  list.replaceChildren();
  for (const entry of entries) {
    const row = element('article', 'update-row');
    const time = element('time', '', text(entry.date));
    if (/^\d{4}-\d{2}-\d{2}$/.test(text(entry.date))) time.dateTime = entry.date;
    const copy = element('div');
    const heading = element('h3');
    const href = externalUrl(entry.url);
    if (href) { const a = element('a', '', entry.title); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; heading.append(a); }
    else heading.textContent = entry.title;
    copy.append(heading, element('p', '', text(entry.description)));
    row.append(time, copy);
    list.append(row);
  }
}

function renderContact(contact) {
  const links = [];
  const email = text(contact?.email);
  if (/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    const a = element('a', '', 'Email the studio ↗');
    a.href = `mailto:${email}`;
    links.push(a);
  }
  const href = externalUrl(contact?.feedbackUrl);
  if (href) { const a = element('a', '', 'Send feedback ↗'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.push(a); }
  if (links.length) document.querySelector('#contact-links').replaceChildren(...links);
}

async function loadCollection() {
  try {
    const response = await fetch(new URL('./data/studio.json', import.meta.url));
    if (!response.ok) throw new Error('Could not load collection');
    const data = await response.json();
    if (!Array.isArray(data.projects)) throw new Error('Invalid collection');
    projects = data.projects.filter((project) => project && ['game', 'tool'].includes(project.kind));
    renderProjects();
    renderUpdates(data.updates);
    renderContact(data.contact);
  } catch {
    projectContainer.replaceChildren(element('p', 'empty-note', 'The collection could not be loaded. Please refresh or try again later.'));
    count.textContent = '';
  } finally { projectContainer.setAttribute('aria-busy', 'false'); }
}

const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');
const themeButton = document.querySelector('#theme-toggle');
const systemButton = document.querySelector('#theme-system');
function currentTheme() { return root.dataset.theme || (media.matches ? 'dark' : 'light'); }
function paintTheme() {
  const dark = currentTheme() === 'dark';
  themeButton.firstElementChild.textContent = dark ? '☀' : '☾';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  themeButton.title = themeButton.getAttribute('aria-label');
  systemButton.setAttribute('aria-pressed', String(!root.dataset.theme));
}
themeButton.addEventListener('click', () => {
  root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('amy-studio.theme', root.dataset.theme); } catch {}
  paintTheme();
});
systemButton.addEventListener('click', () => {
  delete root.dataset.theme;
  try { localStorage.removeItem('amy-studio.theme'); } catch {}
  paintTheme();
});
media.addEventListener('change', paintTheme);
document.querySelector('#year').textContent = String(new Date().getFullYear());
paintTheme();
loadCollection();
