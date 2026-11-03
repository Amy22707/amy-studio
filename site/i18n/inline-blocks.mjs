// Shared by the browser and the offline collector. No translated HTML is parsed.
export const blockTags = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'summary', 'figcaption']);
const boundaries = new Set(['p', 'ul', 'ol', 'li', 'pre', 'div', 'table', 'section', 'article', 'blockquote', 'figure', 'details']);
const formatting = new Set(['a', 'strong', 'em', 'b', 'i', 's', 'del', 'u', 'span', 'sub', 'sup', 'small', 'mark', 'abbr']);
const atomic = new Set(['code', 'pre', 'math', 'svg', 'img', 'br', 'kbd', 'samp', 'script', 'style', 'textarea', 'noscript']);
export const normalize = text => text.replace(/\s+/g, ' ').trim();

export function protectedNode(node, adapter) {
  return atomic.has(adapter.tag(node)) || adapter.attr(node, 'translate') === 'no' || /\bkatex(?:-display)?\b/.test(adapter.attr(node, 'class') || '');
}

export function inlineRuns(parent, adapter) {
  const runs = []; let run = [];
  for (const child of adapter.children(parent)) {
    if (boundaries.has(adapter.tag(child))) { if (run.length) runs.push(run); run = []; }
    else run.push(child);
  }
  if (run.length) runs.push(run);
  return runs;
}

export function describeRun(nodes, adapter) {
  const slots = []; let units = 0;
  function serialize(node, parent = null) {
    if (adapter.isText(node)) { const value = adapter.text(node).replace(/\s+/g, ' '); if (value.trim()) units++; return value; }
    const tag = adapter.tag(node);
    if (!tag) return '';
    const atom = protectedNode(node, adapter) || !formatting.has(tag);
    const id = slots.length;
    const slot = { id, node, tag, atom, parent, label: normalize(adapter.text(node)), children: [...adapter.children(node)] };
    slots.push(slot);
    if (atom) { units++; return `[[A${id}]]`; }
    return `[[O${id}]]${adapter.children(node).map(child => serialize(child, id)).join('')}[[C${id}]]`;
  }
  const source = normalize(nodes.map(node => serialize(node)).join(''));
  const identity = slots.map(slot => slot.atom
    ? [slot.tag, normalize(adapter.text(slot.node)), adapter.attr(slot.node, 'src') || '']
    : [slot.tag, slot.parent]);
  // Protected contents distinguish, e.g., two identical sentences about different formulas.
  const key = JSON.stringify([source, identity]);
  return { key, source, slots, units };
}

export function parseTemplate(template, slots) {
  if (typeof template !== 'string' || !template.trim()) throw new Error('Empty inline translation');
  const parts = []; const stack = []; const opened = new Set(); const closed = new Set(); const content = new Set();
  const token = /\[\[([AOC])(\d+)\]\]/g;
  let cursor = 0, match;
  while ((match = token.exec(template))) {
    if (match.index > cursor) {
      const text = template.slice(cursor, match.index); parts.push({ text });
      if (text.trim()) for (const id of stack) content.add(id);
    }
    const kind = match[1], id = Number(match[2]), slot = slots[id];
    if (!slot) throw new Error(`Unknown inline slot ${id}`);
    if (kind === 'C') {
      if (slot.atom || stack.pop() !== id || closed.has(id)) throw new Error(`Unbalanced inline slot ${id}`);
      if (slot.label && !content.has(id)) throw new Error(`Empty translated inline label ${id}`);
      closed.add(id);
    } else {
      if (opened.has(id) || (kind === 'A') !== slot.atom || (stack.at(-1) ?? null) !== slot.parent) throw new Error(`Invalid inline slot ${id}`);
      opened.add(id);
      if (kind === 'A') for (const parent of stack) content.add(parent);
      if (kind === 'O') stack.push(id);
    }
    parts.push({ kind, id }); cursor = token.lastIndex;
  }
  if (cursor < template.length) parts.push({ text: template.slice(cursor) });
  if (stack.length || opened.size !== slots.length || closed.size !== slots.filter(slot => !slot.atom).length) throw new Error('Missing inline slots');
  if (parts.some(part => part.text?.includes('[[') || part.text?.includes(']]'))) throw new Error('Malformed inline marker');
  return parts;
}

export const domAdapter = {
  tag: node => node.nodeType === 1 ? node.localName : '',
  children: node => [...node.childNodes],
  isText: node => node.nodeType === 3,
  text: node => node.textContent || '',
  attr: (node, name) => node.nodeType === 1 ? node.getAttribute(name) : null,
};

export function createBlockTranslator({ document, catalog, onInvalid = () => {} }) {
  const records = new Set();
  const parents = new WeakSet();
  let managedText = new WeakSet();
  const candidates = [...blockTags].join(',');
  const excluded = 'pre,code,script,style,svg,math,.katex,textarea,noscript,[translate="no"],.language-switch';

  function discover() {
    for (const parent of document.body.querySelectorAll(candidates)) {
      if (parents.has(parent) || parent.closest(excluded)) continue;
      parents.add(parent);
      for (const nodes of inlineRuns(parent, domAdapter)) {
        const description = describeRun(nodes, domAdapter);
        const entry = catalog[description.key] || {};
        if (description.units < 2 || !/[\u3400-\u9fff]/.test(description.source)) continue;
        const start = document.createComment('i18n:start'), end = document.createComment('i18n:end');
        parent.insertBefore(start, nodes[0]);
        parent.insertBefore(end, nodes.at(-1).nextSibling);
        records.add({ parent, start, end, nodes, description, entry, current: null });
      }
    }
  }

  function rememberText(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 3) managedText.add(node);
      else if (node.nodeType === 1) rememberText([...node.childNodes]);
    }
  }

  function restore(record) {
    // Use original nodes, not clones: listeners, formula DOM, hrefs and IDs survive.
    for (const slot of [...record.description.slots].reverse()) if (!slot.atom) slot.node.replaceChildren(...slot.children);
    replace(record, record.nodes);
  }

  function replace(record, nodes) {
    let node = record.start.nextSibling;
    while (node && node !== record.end) { const next = node.nextSibling; node.remove(); node = next; }
    for (const child of nodes) record.parent.insertBefore(child, record.end);
  }

  function render(record, parts) {
    const root = []; const stack = [root]; const updates = [];
    for (const part of parts) {
      if (part.text !== undefined) stack.at(-1).push(document.createTextNode(part.text));
      else if (part.kind === 'C') stack.pop();
      else {
        const slot = record.description.slots[part.id];
        stack.at(-1).push(slot.node);
        if (part.kind === 'O') { const children = []; updates.push([slot.node, children]); stack.push(children); }
      }
    }
    for (const [element, children] of updates.reverse()) element.replaceChildren(...children);
    replace(record, root);
    return root;
  }

  return {
    apply(language) {
      managedText = new WeakSet();
      let pending = 0;
      for (const record of records) {
        if (!record.parent.isConnected || record.start.parentNode !== record.parent || record.end.parentNode !== record.parent) {
          records.delete(record); parents.delete(record.parent);
        }
      }
      discover();
      for (const record of records) {
        if (!record.parent.isConnected || record.start.parentNode !== record.parent || record.end.parentNode !== record.parent) {
          records.delete(record); parents.delete(record.parent); continue;
        }
        const target = language === 'default' ? null : record.entry[language];
        if (language === 'en' && !target) pending++;
        const variant = target ?? null;
        if (record.current !== variant) {
          try {
            if (target) render(record, parseTemplate(target, record.description.slots));
            else restore(record);
            record.current = variant;
          } catch (error) { restore(record); record.current = null; onInvalid(error, record.description.key); }
        }
        const nodes = []; let node = record.start.nextSibling;
        while (node && node !== record.end) { nodes.push(node); node = node.nextSibling; }
        rememberText(nodes);
      }
      return { pending };
    },
    manages: node => managedText.has(node),
  };
}
