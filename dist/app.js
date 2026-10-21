const app = document.querySelector('#app');
if('scrollRestoration' in history)history.scrollRestoration='manual';
const atlasApp = document.querySelector('#atlasApp');
const search = document.querySelector('#globalSearch');
const diseases = window.DISEASES || [];
const bookNames = {
  1: '《刮痧疗法》',
  2: '《实用刮痧疗法》',
  3: '《图解刮痧疗法》',
  4: '《循经刮痧疗法》',
  5: '《中医刮痧疗法》'
};
const bookDialog = document.querySelector('#bookDialog');
const bookOptions = document.querySelector('#bookOptions');
const PAGE_SIZE = 60;
const PINYIN_BOUNDARIES = [
  ['A','阿'],['B','八'],['C','擦'],['D','搭'],['E','蛾'],['F','发'],
  ['G','噶'],['H','哈'],['J','击'],['K','喀'],['L','拉'],['M','妈'],
  ['N','拿'],['O','哦'],['P','趴'],['Q','七'],['R','然'],['S','撒'],
  ['T','塌'],['W','挖'],['X','西'],['Y','丫'],['Z','砸']
];
const pinyinCollator = new Intl.Collator('zh-CN-u-co-pinyin');
const initialOverrides = {'咳': 'K'};
const initialCache = new Map();
let activeBook = null;
let activeVariant = 0;
let activeInitial = null;
let visibleCount = PAGE_SIZE;
let atlasRendered = false;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const cleanFigureRefs = value => String(value ?? '').replace(/[（(]\s*(?:参见|见|详见)\s*图[^）)]*[）)]/g,'');
for(const disease of diseases){
  disease.summary=cleanFigureRefs(disease.summary);
  for(const variant of disease.variants||[])for(const field of variant.fields||[])field.body=cleanFigureRefs(field.body);
}
const standardPointNames = [...new Set((window.STANDARD_ACUPOINTS || []).map(point => point[0]))].sort((a, b) => b.length - a.length);
const pointPattern = standardPointNames.length ? new RegExp(standardPointNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;

function linkedPoints(body) {
  if (!pointPattern) return escapeHtml(body);
  let result = '', last = 0;
  for (const match of body.matchAll(pointPattern)) {
    result += escapeHtml(body.slice(last, match.index));
    result += `<a class="knowledge-link" href="#/atlas/${encodeURIComponent(match[0])}" title="在穴位图谱查看${escapeHtml(match[0])}">${escapeHtml(match[0])}</a>`;
    last = match.index + match[0].length;
  }
  return result + escapeHtml(body.slice(last));
}

function fieldOrder(title) {
  const heading = title.trim();
  if (/概述|简介|概况/.test(heading)) return 0;
  if (/症状|辨证分型|辨证论治|证候/.test(heading)) return 1;
  if (/穴位|取穴|腧穴/.test(heading)) return 2;
  if (/注意事项|禁忌|预防|附注|提示/.test(heading)) return 4;
  return 3;
}

function orderedFields(fields) {
  return fields.map((field, index) => ({field, index}))
    .sort((a, b) => fieldOrder(a.field.title) - fieldOrder(b.field.title) || a.index - b.index)
    .map(entry => entry.field);
}

function highlightName(name, query) {
  if (!query) return escapeHtml(name);
  const start = name.toLocaleLowerCase('zh-CN').indexOf(query.toLocaleLowerCase('zh-CN'));
  if (start < 0) return escapeHtml(name);
  return `${escapeHtml(name.slice(0, start))}<mark class="search-hit">${escapeHtml(name.slice(start, start + query.length))}</mark>${escapeHtml(name.slice(start + query.length))}`;
}

function editDistance(left, right) {
  const a = Array.from(left);
  const b = Array.from(right);
  let row = Array.from({length: b.length + 1}, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
    }
    row = next;
  }
  return row[b.length];
}

function similarNames(query, pool = diseases) {
  if (Array.from(query).length < 2) return [];
  const maxDistance = query.length <= 4 ? 1 : 2;
  return [...new Set(pool.map(item => item.name))]
    .map(name => ({name, distance: editDistance(query, name)}))
    .filter(item => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance || a.name.length - b.name.length)
    .slice(0, 5);
}

function fieldTone(title) {
  if (/症状|辨证分型|辨证论治|证候/.test(title)) return 'symptoms';
  if (/穴位|取穴|腧穴/.test(title)) return 'points';
  if (/注意事项|禁忌|预防|附注|提示/.test(title)) return 'notes';
  if (/概述|简介|概况/.test(title)) return 'overview';
  if (/方义|原理|解析/.test(title)) return 'rationale';
  if (/^治法$|治疗原则/.test(title)) return 'strategy';
  return 'treatment';
}

function renderBody(body, title) {
  const content = /穴位|取穴|腧穴|刮痧|刮拭|刮治|治疗|操作|方案/.test(title) ? linkedPoints(body) : escapeHtml(body);
  return content.replace(/(取穴|选穴|操作方法|刮拭顺序|刮治方法|治法)([：:])/g, '<span class="copy-label">$1$2</span>');
}

function renderBookOptions() {
  bookOptions.innerHTML = `<button type="button" class="book-option${activeBook === null ? ' selected' : ''}" data-book="all" aria-pressed="${activeBook === null}">全部书籍</button>` +
    Object.entries(bookNames).map(([number, name]) => `<button type="button" class="book-option${activeBook === Number(number) ? ' selected' : ''}" data-book="${number}" aria-pressed="${activeBook === Number(number)}">${escapeHtml(name)}</button>`).join('');
}

function pinyinInitial(name) {
  if (initialCache.has(name)) return initialCache.get(name);
  const first = Array.from(name)[0] || '';
  let result = '#';
  if (initialOverrides[first]) result = initialOverrides[first];
  else if (/^[A-Za-z]/.test(first)) result = first.toUpperCase();
  else if (/\p{Script=Han}/u.test(first)) {
    result = 'A';
    for (const [letter, boundary] of PINYIN_BOUNDARIES) {
      if (pinyinCollator.compare(first, boundary) >= 0) result = letter;
      else break;
    }
  }
  initialCache.set(name, result);
  return result;
}

function syncBookFilterControl() {
  const current = activeBook === null ? '全部书籍' : bookNames[activeBook];
  const trigger = document.querySelector('#openBookFilter');
  const reset = document.querySelector('#resetBookFilter');
  if (trigger) {
    trigger.innerHTML = `${activeBook === null ? '按书籍筛选' : escapeHtml(current)} <span aria-hidden="true">▾</span>`;
    trigger.setAttribute('aria-label', `按书籍筛选，当前：${current}`);
  }
  if (reset) reset.hidden = activeBook === null;
}

function renderHome(query = '') {
  const needle = query.trim().toLocaleLowerCase('zh-CN');
  const pool = activeBook === null ? diseases : diseases.filter(item => item.book === activeBook);
  const nameMatches = pool.filter(item => item.name.toLocaleLowerCase('zh-CN').includes(needle));
  const matches = needle || !activeInitial ? nameMatches : nameMatches.filter(item => pinyinInitial(item.name) === activeInitial);
  const visible = matches.slice(0, visibleCount);
  const suggestions = needle && !nameMatches.length ? similarNames(needle, pool) : [];
  syncBookFilterControl();
  document.title = '痧证汇方';
  const tip = (window.SITE_FEATURES && window.SITE_FEATURES.getDailyTip) ? window.SITE_FEATURES.getDailyTip() : null;
  const tipBlock = tip ? `<details class="daily-tip"><summary><span class="daily-tip-tag">今日科普</span><strong>${escapeHtml(tip.title)}</strong><span class="tip-toggle" aria-hidden="true"></span></summary><p>${escapeHtml(tip.body)}</p></details>` : '';
  app.innerHTML = `
    ${needle ? '' : `<section class="home-entry">${tipBlock}</section>`}
    <section class="directory" aria-live="polite">
      <div class="section-heading"><h2>${needle ? '搜索结果' : '病症索引'}</h2><div class="book-filter-inline"><span class="book-filter-current">${activeBook === null ? '全部书籍' : escapeHtml(bookNames[activeBook])}</span><button type="button" class="book-filter-trigger" id="openBookFilter" aria-haspopup="dialog">按书籍筛选 <span aria-hidden="true">▾</span></button><button type="button" class="book-filter-reset" id="resetBookFilter" ${activeBook === null ? 'hidden' : ''}>查看全部</button></div></div>
      ${!needle ? `<div class="initial-index" aria-label="按拼音首字母定位"><span>拼音首字母</span><button type="button" class="${activeInitial === null ? 'active' : ''}" data-initial="all" aria-pressed="${activeInitial === null}">全部</button>${PINYIN_BOUNDARIES.map(([letter]) => `<button type="button" class="${activeInitial === letter ? 'active' : ''}" data-initial="${letter}" aria-pressed="${activeInitial === letter}">${letter}</button>`).join('')}</div>` : ''}
      ${matches.length ? `<div class="disease-grid">${visible.map(item => `
        <a class="disease-link" href="#/disease/${item.id}">
          <div><strong>${highlightName(item.name, needle)}</strong><p>${escapeHtml(item.summary)}</p></div>
          <small>${item.variants.length > 1 ? `${item.variants.length} 条知识` : '查看知识'} →</small>
        </a>`).join('')}</div>${matches.length > visible.length ? '<button type="button" class="load-more">加载更多</button>' : ''}` : `<div class="empty">${needle ? `没有找到“${escapeHtml(query)}”。请尝试其他疾病名称。` : '这一首字母下暂无疾病。'}</div>`}
    </section>`;
  app.querySelectorAll('[data-initial]').forEach(button => button.addEventListener('click', () => {
    activeInitial = button.dataset.initial === 'all' ? null : button.dataset.initial;
    visibleCount = PAGE_SIZE;
    renderHome(search.value);
  }));
  app.querySelector('.load-more')?.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderHome(search.value);
  });
  app.querySelector('#openBookFilter')?.addEventListener('click', () => { renderBookOptions(); bookDialog.showModal(); });
  app.querySelector('#resetBookFilter')?.addEventListener('click', () => {
    activeBook = null;
    activeInitial = null;
    visibleCount = PAGE_SIZE;
    if (location.hash === '#/' || !location.hash) renderHome(search.value);
    else location.hash = '#/';
  });
  if (!matches.length) {
    const empty = app.querySelector('.empty');
    if (suggestions.length) {
      empty.insertAdjacentHTML('beforeend', `<div class="suggestions"><span>你是不是想找：</span>${suggestions.map(item => `<button type="button" data-suggestion="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`).join('')}</div>`);
      empty.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => {
        search.value = button.dataset.suggestion;
        renderHome(search.value);
      }));
    }
  }
}

function renderDisease(id) {
  const item = diseases.find(disease => disease.id === id);
  if (!item) { location.hash = '#/'; return; }
  activeVariant = Math.min(activeVariant, item.variants.length - 1);
  const variant = item.variants[activeVariant];
  const relatedTerms = (window.SITE_FEATURES?.glossaryTerms || []).filter(term =>
    term.title.length >= 3 && variant.fields.some(field => field.body.includes(term.title))
  ).slice(0, 8);
  syncBookFilterControl();
  document.title = `${item.name}｜痧证汇方`;
  const tabs = item.variants.length > 1 ? `<div class="variant-tabs" role="tablist" aria-label="选择分型或知识">${item.variants.map((entry, index) => `<button role="tab" aria-selected="${index === activeVariant}" class="${index === activeVariant ? 'active' : ''}" data-variant="${index}">${escapeHtml(entry.label)}</button>`).join('')}</div>` : '';
  app.innerHTML = `
    <div class="breadcrumb"><a class="back-index" href="${activeBook === null ? '#/' : `#/book/${activeBook}`}">← 返回病症索引</a><span>${escapeHtml(item.name)}</span></div>
    <section class="detail-hero"><p class="eyebrow">痧证汇方</p><h1>${escapeHtml(item.name)}</h1></section>
    ${tabs}
    <article class="detail-card">${orderedFields(variant.fields).map(field => `<section class="content-section tone-${fieldTone(field.title)}${field.body.length > 120 ? ' long-copy' : ''}"><h2>${escapeHtml(field.title)}</h2><p>${renderBody(field.body, field.title)}</p></section>`).join('')}</article>
    ${relatedTerms.length ? `<section class="related-knowledge"><h2>文中相关词条</h2><div>${relatedTerms.map(term => `<a href="#/glossary/${encodeURIComponent(term.title)}">${escapeHtml(term.title)} →</a>`).join('')}</div></section>` : ''}
    <div class="detail-actions"><button type="button" id="addCurrentToCompare">＋ 加入方案对比</button><a class="compare-view-btn" href="#/compare">查看对比 <span>→</span></a></div>`;
  app.querySelector('#addCurrentToCompare').addEventListener('click', event => {
    const status = window.SITE_FEATURES.addToCompare(id, activeVariant);
    event.currentTarget.textContent = status === 'added' ? '已加入对比' : status === 'exists' ? '已在对比中' : '已选满 3 条';
  });
  document.querySelectorAll('[data-variant]').forEach(button => button.addEventListener('click', () => {
    activeVariant = Number(button.dataset.variant);
    renderDisease(id);
  }));
}

function route() {
  const match = location.hash.match(/^#\/disease\/(.+)$/);
  const atlasMatch = location.hash.match(/^#\/atlas(?:\/(.+))?$/);
  const glossaryMatch = location.hash.match(/^#\/glossary(?:\/(.+))?$/);
  const bookMatch = location.hash.match(/^#\/book\/([1-5])$/);
  const nextBook = bookMatch ? Number(bookMatch[1]) : null;
  if (!match && nextBook !== activeBook) { activeInitial = null; visibleCount = PAGE_SIZE; }
  if (!match) activeBook = nextBook;
  app.hidden = !!atlasMatch;
  atlasApp.hidden = !atlasMatch;
  window.__atlas3d?.setPaused(!atlasMatch);
  if (match) renderDisease(match[1]);
  else if (atlasMatch) {
    syncBookFilterControl();
    const focusName = atlasMatch[1] ? decodeURIComponent(atlasMatch[1]) : '';
    if (!atlasRendered) { window.SITE_FEATURES.renderAtlas(atlasApp, focusName); atlasRendered = true; }
    else if (focusName) window.SITE_FEATURES.focusAtlasPoint(focusName);
    document.title = '穴位图谱｜痧证汇方';
    if (focusName) requestAnimationFrame(() => atlasApp.querySelector('.atlas3d-layout')?.scrollIntoView({block:'start'}));
  }
  else if (glossaryMatch) { syncBookFilterControl(); window.SITE_FEATURES.renderGlossary(app, glossaryMatch[1] ? decodeURIComponent(glossaryMatch[1]) : ''); document.title = '刮痧知识词典｜痧证汇方'; }
  else if (location.hash === '#/compare') { syncBookFilterControl(); window.SITE_FEATURES.renderCompare(app); document.title = '方案对比｜痧证汇方'; }
  else renderHome(search.value);
  const section = atlasMatch ? 'atlas' : glossaryMatch ? 'glossary' : location.hash === '#/compare' ? 'compare' : 'home';
  document.querySelectorAll('[data-nav]').forEach(link => { link.classList.toggle('active', link.dataset.nav === section); if (link.dataset.nav === section) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  window.SITE_FEATURES.updateBadge();
  if(!glossaryMatch?.[1]){requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));}
  const activePage = atlasMatch ? atlasApp : app;
  // A growing mobile atlas iframe must not be the focused outer main: some
  // browsers re-scroll that focused box as its height changes after loading.
  if(!atlasMatch)activePage.focus({preventScroll:true});
  activePage.classList.remove('page-enter');
  void activePage.offsetWidth;
  activePage.classList.add('page-enter');
}

search.addEventListener('input', () => {
  buildSuggestions(search.value);
  activeInitial = null;
  visibleCount = PAGE_SIZE;
  if (location.hash.match(/^#\/(?:disease|atlas|glossary)\//) || ['#/atlas','#/glossary','#/compare'].includes(location.hash)) location.hash = activeBook === null ? '#/' : `#/book/${activeBook}`;
  renderHome(search.value);
});
function buildSuggestions(q) {
  const box = document.querySelector('#searchSuggest');
  if (!box) return;
  const needle = q.trim().toLocaleLowerCase('zh-CN');
  if (!needle) { box.hidden = true;search.setAttribute('aria-expanded','false'); return; }
  const dis = diseases.filter(d => d.name.toLocaleLowerCase('zh-CN').includes(needle)).slice(0,3);
  if (!dis.length) { box.hidden = true;search.setAttribute('aria-expanded','false'); return; }
  const seg = (label, items, html) => items.length ? `<div class="ss-group"><span class="ss-label">${label}</span>${items.map(html).join('')}</div>` : '';
  box.innerHTML = seg('病症', dis, d => `<button type="button" class="ss-item" data-type="disease" data-id="${d.id}" data-name="${escapeHtml(d.name)}"><strong>${highlightName(d.name, q)}</strong><small>查看病证</small></button>`);
  box.hidden = false;
  search.setAttribute('aria-expanded','true');
  box.querySelectorAll('.ss-item').forEach(b => b.addEventListener('click', () => {
    const type = b.dataset.type;
    box.hidden = true;
    search.setAttribute('aria-expanded','false');
    if (type === 'disease') location.hash = `#/disease/${b.dataset.id}`;
    else if (type === 'point') location.hash = `#/atlas/${encodeURIComponent(b.dataset.name)}`;
    else location.hash = `#/glossary/${encodeURIComponent(b.dataset.name)}`;
    search.blur();
  }));
}
search.addEventListener('blur', () => { setTimeout(() => { const box = document.querySelector('#searchSuggest'); if (box&&!box.contains(document.activeElement)){box.hidden = true;search.setAttribute('aria-expanded','false');} }, 160); });
document.querySelector('#closeBookFilter').addEventListener('click', () => bookDialog.close());
bookDialog.addEventListener('click', event => { if (event.target === bookDialog) bookDialog.close(); });
bookOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-book]');
  if (!option) return;
  const next = option.dataset.book === 'all' ? null : Number(option.dataset.book);
  bookDialog.close();
  activeBook = next;
  activeInitial = null;
  visibleCount = PAGE_SIZE;
  const nextHash = next === null ? '#/' : `#/book/${next}`;
  if (location.hash === nextHash) renderHome(search.value);
  else location.hash = nextHash;
});
window.addEventListener('hashchange', () => { activeVariant = 0; route(); });
const backToTop=document.querySelector('#backToTop');
window.addEventListener('scroll',()=>{backToTop.hidden=window.scrollY<500;},{passive:true});
backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
search.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'&&!document.querySelector('#searchSuggest').hidden){event.preventDefault();document.querySelector('#searchSuggest .ss-item')?.focus();}
  if(event.key==='Escape'){document.querySelector('#searchSuggest').hidden=true;search.setAttribute('aria-expanded','false');}
  if(event.key==='Enter'){document.querySelector('#searchSuggest').hidden=true;search.setAttribute('aria-expanded','false');search.blur();}
});
document.querySelector('#searchSuggest').addEventListener('keydown',event=>{
  const choices=[...document.querySelectorAll('#searchSuggest .ss-item')],index=choices.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();document.querySelector('#searchSuggest').hidden=true;search.setAttribute('aria-expanded','false');search.focus();}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=index+(event.key==='ArrowDown'?1:-1);if(next<0)search.focus();else choices[Math.min(next,choices.length-1)]?.focus();}
});
route();
