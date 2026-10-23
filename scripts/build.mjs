import { cp, mkdir, readFile, access } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const site = resolve('site');
const data = JSON.parse(await readFile(resolve(site, 'data/studio.json'), 'utf8'));
if (!Array.isArray(data.projects) || !Array.isArray(data.updates)) throw new Error('projects and updates must be arrays.');
const ids = new Set();
function checkUrl(value, field) {
  if (!value) return;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`${field} must use an HTTP(S) URL.`);
  const frogPage = url.pathname === '/studio/travel-frog/' || url.pathname === '/studio/travel-frog/play/icon-512.png';
  if (url.hostname.toLowerCase() === 'amy22707.github.io' && !url.pathname.startsWith('/amy-studio/') && !frogPage) {
    throw new Error(`${field} links back to the personal website. Keep Studio links within /amy-studio/.`);
  }
}
for (const project of data.projects) {
  if (!project.id || ids.has(project.id)) throw new Error('Every project needs a unique id.');
  ids.add(project.id);
  if (!['game', 'tool'].includes(project.kind)) throw new Error(`Unknown project kind: ${project.id}`);
  for (const field of ['title', 'description', 'details', 'version', 'image', 'downloadUrl', 'playUrl', 'sourceUrl', 'releaseUrl']) {
    if (typeof project[field] !== 'string') throw new Error(`${project.id}: ${field} must be a string.`);
  }
  if (!Array.isArray(project.platforms) || project.platforms.some((value) => typeof value !== 'string')) throw new Error(`${project.id}: platforms must be a string array.`);
  for (const field of ['pageUrl', 'downloadUrl', 'playUrl', 'sourceUrl', 'releaseUrl']) checkUrl(project[field], `${project.id}.${field}`);
  if (project.image) {
    if (/^https?:\/\//.test(project.image)) checkUrl(project.image, `${project.id}.image`);
    else {
      const path = resolve(site, project.image);
      if (!project.image.startsWith('./images/') || !path.startsWith(resolve(site, 'images') + sep)) throw new Error(`${project.id}: local images belong in ./images/.`);
      await access(path);
    }
  }
}
for (const update of data.updates) {
  if (typeof update.title !== 'string') throw new Error('Every update needs a title string.');
  checkUrl(update.url, 'update.url');
}
checkUrl(data.contact?.feedbackUrl, 'contact.feedbackUrl');
await mkdir(resolve('dist'), { recursive: true });
await cp(site, resolve('dist'), { recursive: true });
console.log(`Built Amy Studio: ${data.projects.length} project slots. Output: dist/`);
