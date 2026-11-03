(() => {
  const script = document.currentScript;
  const base = new URL('./', script.src);
  const root = document.documentElement;
  const originalLang = root.lang;
  const preferenceKey = 'amy.site-language';
  let mode = 'default';
  try { mode = localStorage.getItem(preferenceKey) || 'default'; } catch {}
  if (!['default', 'zh', 'en'].includes(mode)) mode = 'default';
  let catalog = {};
  let loadFailed = false;
  let missing = false;
  let ready = false;
  let blockTranslator = null;
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const giscusLanguages = new WeakMap();
  const watchedGiscusFrames = new WeakSet();
  const excluded = 'pre,code,script,style,svg,math,.katex,textarea,noscript,[translate="no"],.language-switch';
  const normalize = text => text.replace(/\s+/g, ' ').trim();

  let control = document.querySelector('[data-language-control]');
  if (!control) {
    const host = document.querySelector('.site-controls') || document.querySelector('.nav-actions') || document.querySelector('.theme-controls')?.parentElement || document.querySelector('.top .shell nav');
    if (!host) return;
    control = document.createElement('div');
    control.className = 'language-switch';
    control.setAttribute('translate', 'no');
    control.setAttribute('data-language-control', '');
    control.innerHTML = '<span class="language-label" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/></svg></span><select aria-label="Language / 语言"><option value="default">Default</option><option value="zh">中文</option><option value="en">English</option></select><svg class="language-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg><span class="language-status" role="status" hidden></span>';
    host.append(control);
  }
  const selector = control.querySelector('select');
  const status = control.querySelector('.language-status');
  selector.value = mode;
  let languageButton = null;
  let languageMenu = null;
  let languageOptions = [];
  function refreshLanguageMenu() {
    if (!languageButton) return;
    const text = selector.options[selector.selectedIndex].text;
    languageButton.textContent = text;
    languageButton.setAttribute('aria-label', 'Language / 语言: ' + text);
    languageOptions.forEach((button, index) => {
      const option = selector.options[index];
      if (button.textContent !== option.text) button.textContent = option.text;
      button.setAttribute('aria-selected', String(option.value === selector.value));
    });
  }
  const compactLanguageLabel = window.matchMedia('(max-width: 520px)');
  function updateDefaultLabel() {
    const option = selector.querySelector('option[value="default"]');
    const label = compactLanguageLabel.matches ? (mode === 'en' ? 'Default' : '默认') : '默认 / Default';
    if (option.textContent !== label) option.textContent = label;
    refreshLanguageMenu();
  }
  updateDefaultLabel();
  compactLanguageLabel.addEventListener('change', updateDefaultLabel);

  languageButton = document.createElement('button');
  languageButton.type = 'button';
  languageButton.className = 'language-trigger';
  languageButton.setAttribute('aria-haspopup', 'listbox');
  languageButton.setAttribute('aria-expanded', 'false');
  languageButton.setAttribute('aria-controls', 'site-language-menu');
  languageMenu = document.createElement('div');
  languageMenu.className = 'language-menu';
  languageMenu.id = 'site-language-menu';
  languageMenu.hidden = true;
  languageMenu.setAttribute('role', 'listbox');
  languageMenu.setAttribute('aria-label', 'Language / 语言');
  function closeLanguageMenu(focus = false) {
    languageMenu.hidden = true;
    languageButton.setAttribute('aria-expanded', 'false');
    if (focus) languageButton.focus();
  }
  function openLanguageMenu() {
    languageMenu.hidden = false;
    languageButton.setAttribute('aria-expanded', 'true');
    languageOptions[selector.selectedIndex]?.focus();
  }
  languageOptions = [...selector.options].map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.setAttribute('role', 'option');
    button.addEventListener('click', () => {
      selector.value = option.value;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      refreshLanguageMenu();
      closeLanguageMenu(true);
    });
    button.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? languageOptions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + languageOptions.length) % languageOptions.length;
        languageOptions[next].focus();
      } else if (event.key === 'Escape') { event.preventDefault(); closeLanguageMenu(true); }
      else if (event.key === 'Tab') closeLanguageMenu(true);
    });
    languageMenu.append(button);
    return button;
  });
  languageButton.addEventListener('click', () => languageMenu.hidden ? openLanguageMenu() : closeLanguageMenu());
  languageButton.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openLanguageMenu(); }
    else if (event.key === 'Escape') closeLanguageMenu();
  });
  document.addEventListener('pointerdown', event => { if (!control.contains(event.target)) closeLanguageMenu(); });
  control.addEventListener('focusout', () => { setTimeout(() => { if (!control.contains(document.activeElement)) closeLanguageMenu(); }, 0); });
  selector.hidden = true;
  control.append(languageButton, languageMenu);
  refreshLanguageMenu();

  function lookup(source) {
    if (mode === 'default') return source;
    const key = normalize(source);
    if (!key) return source;
    const entry = catalog[key];
    if (entry && typeof entry[mode] === 'string' && entry[mode] !== key) {
      const start = source.match(/^\s*/)[0];
      const end = source.match(/\s*$/)[0];
      return start + entry[mode] + end;
    }
    if ((!entry || typeof entry[mode] !== 'string') && mode === 'en' && /[\u3400-\u9fff]/.test(key)) missing = true;
    // A tag written as "#Name" reuses the translation of its bare label, so
    // adding a tag cannot leave the article chip untranslated while the
    // tag browser shows a translated label.
    if (key.startsWith('#') && key.length > 1) {
      const label = key.slice(1);
      const translated = lookup(label);
      if (translated !== label) return '#' + translated;
    }
    const count = key.match(/^(\d+) projects?(?: · (\d+) coming soon)?$/);
    if (count && mode === 'zh') return `${count[1]} 个作品${count[2] ? ` · ${count[2]} 项即将推出` : ''}`;
    if (mode === 'zh' && /^\d+ posts? with this tag\.$/.test(key)) return key.replace(/^(\d+).*$/, '带此标签的文章共 $1 篇。');
    if (mode === 'zh' && key.startsWith('View details: ')) return '查看详情：' + lookup(key.slice('View details: '.length));
    if (mode === 'zh' && key.startsWith('Artwork for ')) return '项目图片：' + lookup(key.slice('Artwork for '.length));
    return source;
  }

  function changeText(node) {
    let record = originals.get(node);
    if (!record || (node.nodeValue !== record.current && node.nodeValue !== record.source)) {
      record = { source: node.nodeValue, current: node.nodeValue };
      originals.set(node, record);
    }
    let translated = lookup(record.source);
    if (mode === 'en' && /[\u3400-\u9fff]/.test(record.source)) {
      const leading = record.source.trim().match(/^[：:，,；;。、]/)?.[0];
      const punctuation = { '：': ':', ':': ':', '，': ',', ',': ',', '；': ';', ';': ';', '。': '.', '、': ',' };
      if (leading && !catalog[normalize(record.source)]?.reviewedEn && !/^[:，,；;.。]/.test(translated.trimStart())) translated = punctuation[leading] + ' ' + translated.trimStart();
      if (node.previousSibling?.nodeType === Node.ELEMENT_NODE && /^[A-Za-z0-9]/.test(translated)) translated = ' ' + translated;
      if (node.nextSibling?.nodeType === Node.ELEMENT_NODE && /[A-Za-z0-9]$/.test(translated)) translated += ' ';
    }
    record.current = translated;
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }

  function changeAttributes(element) {
    let entries = attributes.get(element);
    if (!entries) { entries = {}; attributes.set(element, entries); }
    const keys = element.matches('meta[name="description"]') ? ['content'] : ['aria-label', 'title', 'alt', 'placeholder'];
    for (const key of keys) {
      if (!element.hasAttribute(key)) continue;
      const value = element.getAttribute(key);
      if (!entries[key] || (value !== entries[key].current && value !== entries[key].source)) entries[key] = { source: value, current: value };
      const translated = lookup(entries[key].source);
      entries[key].current = translated;
      if (value !== translated) element.setAttribute(key, translated);
    }
  }

  function syncGiscusLanguage() {
    const language = mode === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('iframe.giscus-frame').forEach(frame => {
      if (!watchedGiscusFrames.has(frame)) {
        watchedGiscusFrames.add(frame);
        frame.addEventListener('load', () => {
          giscusLanguages.delete(frame);
          syncGiscusLanguage();
        }, { once: true });
      }
      if (giscusLanguages.get(frame) === language) return;
      frame.contentWindow?.postMessage({giscus:{setConfig:{lang:language}}}, 'https://giscus.app');
      giscusLanguages.set(frame, language);
    });
  }

  function apply() {
    // Do not observe our own DOM moves or text replacements.
    observe.disconnect();
    try {
    missing = false;
    updateDefaultLabel();
    root.dataset.language = mode;
    root.lang = mode === 'zh' ? 'zh-CN' : mode === 'en' ? 'en' : originalLang;
    if (blockTranslator?.apply(mode).pending) missing = true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement?.closest(excluded) || blockTranslator?.manages(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let node;
    while ((node = walker.nextNode())) changeText(node);
    document.querySelectorAll('[aria-label],[title],[alt],[placeholder],meta[name="description"]').forEach(element => {
      if (!element.closest(excluded)) changeAttributes(element);
    });
    const title = document.querySelector('title')?.firstChild;
    if (title) changeText(title);
    const message = mode !== 'default' && loadFailed
      ? (mode === 'zh' ? '语言资源加载失败，请刷新重试。' : 'Language resources could not be loaded. Please refresh.')
      : missing ? 'Some new content is shown in its original language.' : '';
    if (status.textContent !== message) status.textContent = message;
    status.hidden = !message;
    syncGiscusLanguage();
    window.dispatchEvent(new CustomEvent('site-language-change', { detail: { language: mode } }));
    } finally {
      observe.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  let queued = false;
  const observe = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  });
  selector.addEventListener('change', () => {
    mode = selector.value;
    try { localStorage.setItem(preferenceKey, mode); } catch {}
    if (ready) apply();
  });

  async function start() {
    try {
      const key = location.pathname.replace(/\/index\.html$/, '/').split('/').map(segment => {
        try { return encodeURIComponent(decodeURIComponent(segment)); } catch { return segment; }
      }).join('/').replace(/\/?$/, '/');
      async function json(path, optional = false) {
        const response = await fetch(new URL(path, base), { cache: 'no-cache' });
        if (optional && response.status === 404) return {};
        if (!response.ok) throw new Error('Missing language resource: ' + path);
        return response.json();
      }
      const moduleUrl = new URL('inline-blocks.mjs', base);
      moduleUrl.search = new URL(script.src).search;
      const [shared, manifest, blockManifest, { createBlockTranslator }] = await Promise.all([
        json('site.json'), json('pages.json'), json('blocks/pages.json', true), import(moduleUrl.href),
      ]);
      const siteRoot = new URL('../', base).pathname;
      const blockKey = key.startsWith(siteRoot) ? '/' + key.slice(siteRoot.length) : key;
      const [page, blocks] = await Promise.all([
        manifest[key] ? json(manifest[key]) : {}, blockManifest[blockKey] ? json(blockManifest[blockKey]) : {},
      ]);
      catalog = { ...shared, ...page };
      blockTranslator = createBlockTranslator({ document, catalog: blocks, onInvalid: () => { missing = true; } });
    } catch { loadFailed = true; }
    ready = true;
    apply();
  }
  start();
})();
