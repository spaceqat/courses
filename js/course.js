
/* js/i18n.js */
/* Language switch for the bilingual course. Chinese is the source; English is layered on top.
   Choose with ?lang=en / ?lang=zh (remembered) or the header button. Switching reloads the page;
   progress and bookmarks are shared between the two languages.
   Until the learner picks one, the course follows the browser: the first of its preferred languages
   that is Chinese or English decides; a browser that lists neither gets English. */
function browserLanguage(){
 const list=(typeof navigator!=='undefined'&&(navigator.languages?.length?navigator.languages:[navigator.language]))||[];
 for(const tag of list){const l=String(tag||'').toLowerCase();if(l.startsWith('zh'))return 'zh';if(l.startsWith('en'))return 'en'}
 return list.filter(Boolean).length?'en':'zh';
}
const LANG=(()=>{
 try{
  const asked=new URLSearchParams(location.search).get('lang');
  if(asked==='en'||asked==='zh'){localStorage.setItem('spq.lang',asked);return asked}
  const saved=localStorage.getItem('spq.lang');
  return saved==='en'||saved==='zh'?saved:browserLanguage();
 }catch(e){try{return browserLanguage()}catch(e2){return 'zh'}}
})();
// L('中文','English') picks the string for the current language.
function L(zh,en){return LANG==='en'&&en!==undefined?en:zh}
if(typeof document!=='undefined'){
 document.documentElement.lang=LANG==='en'?'en':'zh-CN';
 if(LANG==='en'){document.documentElement.classList.add('lang-en');document.title='SpaceQat | Introduction to Quantum Computing';
  document.addEventListener('DOMContentLoaded',()=>{const skip=document.querySelector('.skip-link');if(skip)skip.textContent='Skip to main content';});}
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-lang-switch]');
  if(button)setCourseLanguage(button.dataset.langSwitch);
 });
}
function setCourseLanguage(next){
 if(next===LANG)return;
 try{localStorage.setItem('spq.lang',next)}catch(e){}
 const url=new URL(location.href);url.searchParams.delete('lang');
 if(url.href===location.href)location.reload();else location.href=url.href;
}
function languageToggle(){
 const next=LANG==='en'?'zh':'en';
 return `<button type="button" class="lang-toggle" data-lang-switch="${next}" lang="${next==='en'?'en':'zh-CN'}" aria-label="${next==='en'?'Switch to English':'切换到中文'}">${next==='en'?'EN':'中文'}</button>`;
}
;
/* js/notation.js */
/* Shared display notation. Simulation keys and runnable code stay untouched. */
function courseNotation(text){
  // Existing inline/display TeX is already authored; never wrap it a second time.
  return text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map((part,i)=>{
    if(i%2)return part;
    return part.replace(/\|([\w+−\-ψφΦΨαβ]+)[>⟩]|(?<![A-Za-z0-9_\\])(?:q\d+|CNOT|SWAP|CZ|CX|HH|HZH|[xyz]|[HXYZST](?:\d+)?)(?![A-Za-z0-9_])/g,(token,state)=>{
      if(state)return '$|'+state.replace(/[ψφΦΨαβ]/g,c=>({ψ:'\\psi',φ:'\\phi',Φ:'\\Phi',Ψ:'\\Psi',α:'\\alpha',β:'\\beta'}[c])+' ')+'\\rangle$';
      const indexed=token.match(/^([qHXYZST])(\d+)$/);
      return '$'+(indexed?indexed[1]+'_{'+indexed[2]+'}':token.length>1&&!/^H[HZ]*$/.test(token)?'\\mathrm{'+token+'}':token)+'$';
    });
  }).join('');
}

function coursePlainNotation(text){
  // Native select menus cannot contain KaTeX HTML. Use readable Unicode there.
  return text.replace(/\|([\w+−\-ψφΦΨαβ]+)>/g,'|$1⟩')
    .replace(/\b(q|[HXYZST])(\d+)\b/g,(_,symbol,index)=>symbol+[...index].map(n=>'₀₁₂₃₄₅₆₇₈₉'[n]).join(''));
}

// KaTeX (about 300 KB) is not part of the first screen: it starts loading as soon as this script runs, in parallel
// with the rest of the course, so it is ready before a lesson needs it. Its two main fonts are fetched at the same
// time rather than after the first formula renders. Roots typeset before it arrives wait in a queue.
const COURSE_MATH={state:'idle',queue:new Set(),
  css:'vendor/katex/katex.min.css',scripts:['vendor/katex/katex.min.js','vendor/katex/contrib/auto-render.min.js'],
  fonts:['vendor/katex/fonts/KaTeX_Main-Regular.woff2','vendor/katex/fonts/KaTeX_Math-Italic.woff2']};
function ensureCourseMath(){
  if(typeof renderMathInElement==='function'){COURSE_MATH.state='ready';return}
  if(COURSE_MATH.state!=='idle'||typeof document==='undefined'||!document.head)return;
  COURSE_MATH.state='loading';
  const add=(tag,attrs)=>{const el=document.createElement(tag);Object.assign(el,attrs);document.head.append(el);return el};
  COURSE_MATH.fonts.forEach(href=>add('link',{rel:'preload',as:'font',type:'font/woff2',crossOrigin:'anonymous',href}));
  add('link',{rel:'stylesheet',href:COURSE_MATH.css});
  // async=false: both scripts download in parallel but run in order (auto-render needs katex).
  const loaded=COURSE_MATH.scripts.map(src=>new Promise((resolve,reject)=>add('script',{src,async:false,onload:resolve,onerror:reject})));
  const release=()=>{const roots=[...COURSE_MATH.queue];COURSE_MATH.queue.clear();return roots};
  Promise.all(loaded).then(()=>{
    COURSE_MATH.state='ready';
    release().forEach(root=>{if(root.isConnected)typesetCourseMath(root)});unhideCourseMath();
  }).catch(()=>{COURSE_MATH.state='idle';release();unhideCourseMath()});
  // A very slow network should not keep text hidden: show it as written after 8 s; it still renders when KaTeX arrives.
  setTimeout(unhideCourseMath,8000);
}
function unhideCourseMath(){document.querySelectorAll('.math-pending').forEach(el=>el.classList.remove('math-pending'))}
ensureCourseMath();
function typesetCourseMath(root){
  if(!root)return;
  if(typeof renderMathInElement!=='function'){
    // Not loaded yet: briefly hide only the text that holds $…$ (so no raw TeX shows) and render once KaTeX arrives.
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const node=walker.currentNode;if(node.data.includes('$'))node.parentElement?.classList.add('math-pending')}
    if(![...COURSE_MATH.queue].some(queued=>queued.contains(root)))COURSE_MATH.queue.add(root);
    ensureCourseMath();return;
  }
  const ignored='pre,code,script,style,textarea,annotation,.katex,.katex-display,[data-no-math]';
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    const parent=node.parentElement;
    if(!parent||parent.closest(ignored))continue;
    if(parent.closest('svg'))continue;
    const text=parent.closest('select,option')?coursePlainNotation(node.data):courseNotation(node.data);
    if(text!==node.data)node.data=text;
  }
  renderMathInElement(root,{
    delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
    ignoredTags:['script','noscript','style','textarea','pre','code','option','select','svg'],
    ignoredClasses:['katex','katex-display'],throwOnError:false
  });
  // SVG text uses native spans, preserving its coordinates and text-anchor.
  for(const label of root.querySelectorAll('svg text')){
    if(label.dataset.notation)continue;
    const original=label.textContent;
    const formatted=courseNotation(original);
    if(formatted===original)continue;
    label.dataset.notation='true';
    label.replaceChildren();
    for(const [i,part] of formatted.split(/\$([^$]*)\$/g).entries()){
      const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');
      if(i%2){
        span.setAttribute('font-family','KaTeX_Main, Times New Roman, serif');
        const indexed=part.match(/^([qHXYZST])_\{(\d+)\}$/);
        if(indexed){
          span.textContent=indexed[1];span.setAttribute('font-style','italic');
          const sub=document.createElementNS(span.namespaceURI,'tspan');
          sub.setAttribute('baseline-shift','sub');sub.setAttribute('font-size','70%');
          sub.setAttribute('font-style','normal');sub.textContent=indexed[2];span.append(sub);
        }else{
          span.textContent=part.replace(/\\rangle/g,'⟩').replace(/\\mathrm\{([^}]+)\}/g,'$1')
            .replace(/\\(psi|phi|Phi|Psi|alpha|beta)\s*/g,(_,name)=>({psi:'ψ',phi:'φ',Phi:'Φ',Psi:'Ψ',alpha:'α',beta:'β'}[name]));
          if(/^[HXYZSTxyz]+$/.test(part))span.setAttribute('font-style','italic');
        }
      }else span.textContent=part;
      label.append(span);
    }
  }
}
;
/* js/progress.js */
/* Completion records and per-lesson bookmarks for the current curriculum.
   The course has not launched; earlier preview stores (spq.done, spq.done.v2–v9) are ignored. */
const COURSE_STORE='spq.course.v1';
const COURSE_RESUME_STORE=COURSE_STORE+'.resume';
const CAREER_DIRECTIONS=['hardware','software','theory','application'];
// Progress is saved after every page and answer. If the lesson content has not changed, the bookmark resumes
// with all answers; if it has, the learner goes back to the same page when it still exists (matched by content).
function courseHash(value){
 const text=JSON.stringify(value);let hash=2166136261;
 for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return (hash>>>0).toString(16);
}
function courseLessonRevision(lesson){return courseHash(lesson.revisionPages||lesson.pages)}
function coursePageKey(lesson,step){return courseHash((lesson.revisionPages||lesson.pages)[step])}
function courseCleanResume(value,lessons,done){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const records={};
 for(const [id,lesson] of Object.entries(lessons)){
  const record=value[id],revision=courseLessonRevision(lesson);
  if(done[id]||!record||!Number.isInteger(record.step)||record.step<0)continue;
  if(record.revision!==revision){
   // The lesson was edited since this bookmark: keep the place, drop answers that may no longer line up.
   const pages=lesson.revisionPages||lesson.pages;
   const step=pages.findIndex((page,i)=>coursePageKey(lesson,i)===record.pageKey);
   if(step>0)records[id]={revision,step,pageKey:record.pageKey,answers:{},carry:object(record.carry),carrySnapshots:{}};
   continue;
  }
  if(record.step>=lesson.pages.length)continue;
  const answers={};
  lesson.pages.forEach((page,i)=>{
   const answer=object(record.answers)[i];
   if(page.o){
    const valid=n=>Number.isInteger(n)&&n>=0&&n<page.o.length;
    if(page.multi&&Array.isArray(answer?.selected)&&answer.selected.every(valid))answers[i]={selected:answer.selected,submitted:answer.submitted===true};
    else if(!page.multi&&valid(answer))answers[i]=answer;
   }
   else if(page.art==='timeline'&&Number.isInteger(answer?.historyIndex))answers[i]={historyIndex:answer.historyIndex};
   else if(page.art==='careerDirections'&&CAREER_DIRECTIONS.includes(answer?.careerDirection))answers[i]={careerDirection:answer.careerDirection};
   else if(page.art==='careerNext'&&CAREER_DIRECTIONS.includes(answer?.careerInterest))answers[i]={careerInterest:answer.careerInterest};
   else if(page.art==='hardwareOverview'&&Number.isInteger(answer?.routeIndex)&&answer.routeIndex>=0&&answer.routeIndex<5)answers[i]={routeIndex:answer.routeIndex};
  });
  records[id]={revision,step:record.step,pageKey:record.pageKey,answers,carry:object(record.carry),carrySnapshots:object(record.carrySnapshots)};
 }
 return records;
}
function courseLoadResume(storage,lessons,done){
 const raw=storage.getItem(COURSE_RESUME_STORE);
 return raw===null?{}:courseCleanResume(JSON.parse(raw),lessons,done);
}
// Keep only current lesson IDs that are marked complete.
function courseCleanProgress(value,ids){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(ids.filter(id=>value[id]===1||value[id]===true).map(id=>[id,1]));
}
function courseLoadProgress(storage,ids){
 try{
  const raw=storage.getItem(COURSE_STORE);
  if(raw===null)return {done:{}};
  try{return {done:courseCleanProgress(JSON.parse(raw),ids)};}
  catch(e){return {done:{},error:L('进度记录无法读取；可以重新学习。','Your saved progress could not be read; you can start again.')};}
 }catch(e){return {done:{},error:L('当前浏览器无法保存进度；关闭后可能需要重新学习。','This browser cannot save your progress; you may need to start again after closing it.')};}
}
;
/* js/ui.js */
/* Shared visual behavior; no course or simulation state lives here. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const syncThemeColor=()=>document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--course-neutral-1').trim());
  // The course has a single light theme. Some hosts (such as embedded previews) put data-theme="dark"
  // on <html>, which would switch only the shared colour scales and leave the page half dark. Keep it light.
  const keepLight=()=>{if(document.documentElement.getAttribute('data-theme')!=='light')document.documentElement.setAttribute('data-theme','light')};
  keepLight();syncThemeColor();
  new MutationObserver(()=>{keepLight();syncThemeColor()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const springs = Object.freeze({
    drag: Object.freeze({stiffness: 1200, damping: 80, mass: 1}),
    like: Object.freeze({stiffness: 380, damping: 18, mass: 1})
  });
  // Unit step response of m*x'' + c*x' + k*x = k, starting at rest.
  function springProgress(seconds, preset) {
    const {stiffness: k, damping: c, mass: m} = preset;
    const a = c / (2 * m), w2 = k / m;
    if (a * a > w2) {
      const d = Math.sqrt(a * a - w2), r1 = -a + d, r2 = -a - d;
      return 1 + (r2 * Math.exp(r1 * seconds) - r1 * Math.exp(r2 * seconds)) / (r1 - r2);
    }
    if (a * a === w2) return 1 - Math.exp(-a * seconds) * (1 + a * seconds);
    const w = Math.sqrt(w2 - a * a);
    return 1 - Math.exp(-a * seconds) * (Math.cos(w * seconds) + a / w * Math.sin(w * seconds));
  }
  const animations = new WeakMap();
  function springScale(element, target, preset, initial) {
    cancelAnimationFrame(animations.get(element));
    if (reduced.matches) {element.style.removeProperty('scale'); return;}
    const from = initial ?? (parseFloat(element.style.scale) || 1), start = performance.now();
    function frame(now) {
      if (!element.isConnected) {animations.delete(element); return;}
      const elapsed = (now - start) / 1000;
      element.style.scale = from + (target - from) * springProgress(elapsed, preset);
      if (elapsed < 1.2 && !reduced.matches) animations.set(element, requestAnimationFrame(frame));
      else {element.style.scale = target; animations.delete(element);}
    }
    animations.set(element, requestAnimationFrame(frame));
  }
  // Append text chunks, preserving graphemes and scheduling across chunk boundaries.
  // Call cancelStream before replacing content or abandoning a stream.
  const streams = new WeakMap();
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', {granularity: 'grapheme'}) : null;
  function appendStreamText(element, text) {
    const chunk = String(text);
    if (reduced.matches) {element.append(document.createTextNode(chunk)); return;}
    const now = performance.now();
    let next = Math.max(now, streams.get(element) || now);
    const fragment = document.createDocumentFragment();
    const characters = segmenter ? Array.from(segmenter.segment(chunk), item => item.segment) : Array.from(chunk);
    for (const character of characters) {
      const span = document.createElement('span');
      span.className = 'stream-char';
      span.textContent = character;
      span.style.setProperty('--stream-delay', `${next - now}ms`);
      span.addEventListener('animationend', () => span.replaceWith(document.createTextNode(character)), {once: true});
      fragment.append(span);
      next += 30;
    }
    streams.set(element, next);
    element.append(fragment);
  }
  function cancelStream(element) {
    streams.delete(element);
    element.querySelectorAll('.stream-char').forEach(span => span.replaceWith(document.createTextNode(span.textContent)));
  }
  function prepareDetails(details) {
    if (details.classList.contains('motion-details')) return;
    const summary = details.querySelector(':scope > summary');
    if (!summary) return;
    const body = document.createElement('div');
    body.className = 'disclosure-body';
    for (const child of Array.from(details.childNodes)) if (child !== summary) body.append(child);
    details.append(body);
    details.classList.add('motion-details');
    const sync = () => {body.inert = !details.open;};
    sync();
    details.addEventListener('toggle', sync);
  }
  function enhance(root) {
    if (!(root instanceof Element)) return;
    if (root.matches('details')) prepareDetails(root);
    root.querySelectorAll('details').forEach(prepareDetails);
  }
  enhance(document.body);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) enhance(node);
  }).observe(document.body, {childList: true, subtree: true});

  // Spring feedback is opt-in; the course keeps direct manipulation still.
  document.addEventListener('pointerdown', event => {
    const target = event.target.closest?.('[data-spring-drag]');
    if (!target || event.button !== 0) return;
    springScale(target, 1.01, springs.drag);
    const pointerId = event.pointerId;
    const release = e => {
      if (e.pointerId !== pointerId) return;
      springScale(target, 1, springs.drag);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      target.removeEventListener('lostpointercapture', release);
    };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    target.addEventListener('lostpointercapture', release);
  });
  // Opt-in hook for a future like control; it does not create or toggle likes.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-like]');
    if (button && !button.disabled) springScale(button, 1, springs.like, .92);
  });
  // 保留原内容占位，加载文字与图标不改变按钮宽高；结束时恢复原节点和可用状态。
  const busyButtons = new WeakMap();
  function beginButtonBusy(button, label, {iconOnly = false} = {}) {
    if (busyButtons.has(button)) return busyButtons.get(button);
    const disabled = button.disabled, ariaLabel = button.getAttribute('aria-label');
    const rest = document.createElement('span'), pending = document.createElement('span');
    rest.className = 'button-rest';rest.setAttribute('aria-hidden', 'true');
    while (button.firstChild) rest.append(button.firstChild);
    pending.className = 'button-pending';pending.setAttribute('aria-hidden', 'true');
    pending.innerHTML = '<svg class="button-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (!iconOnly) pending.append(document.createTextNode(label));
    button.append(rest, pending);button.classList.add('button-busy');
    button.disabled = true;button.setAttribute('aria-busy', 'true');button.setAttribute('aria-label', label);
    const release = () => {
      if (!busyButtons.has(button)) return;
      button.replaceChildren(...rest.childNodes);button.classList.remove('button-busy');
      button.disabled = disabled;button.removeAttribute('aria-busy');
      // 操作可能已写入“已复制”等结果，不覆盖新的可访问名称。
      if (button.getAttribute('aria-label') === label) {
        if (ariaLabel === null) button.removeAttribute('aria-label');
        else button.setAttribute('aria-label', ariaLabel);
      }
      busyButtons.delete(button);
    };
    busyButtons.set(button, release);
    return release;
  }
  window.CourseUI = Object.freeze({springs, springProgress, appendStreamText, cancelStream, beginButtonBusy});
})();
;
/* js/directory.js */
/* Course navigation owns only its DOM; lesson state remains owned by app.js. */
window.CourseDirectory = (() => {
  const expanded = new Map();
  let lastChapter, cleanup = () => {};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = path => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  function mount() {
    cleanup();
    const main = app.querySelector('.lesson-main');
    if (!main) return;
    const chapter = S.lesson.id.split('-')[0];
    // 进入新的一章时只展开当前章，其余收起，保证当前节始终在目录里可见。
    if (chapter !== lastChapter) { expanded.clear(); expanded.set(chapter, true); }
    lastChapter = chapter;
    const layout = document.createElement('div');
    layout.className = 'course-reading-layout';
    main.before(layout);
    const sidebar = document.createElement('aside');
    sidebar.className = 'course-directory-sidebar';
    layout.append(sidebar, main);
    const contents = document.createElement('div');
    contents.className = 'course-directory-content';
    contents.innerHTML = `<button type="button" class="directory-back">${icon('m14 6-6 6 6 6')}${L('返回课程地图','Back to course map')}</button><nav aria-label="${L('章节目录','Chapters')}">${Object.entries(LEVELS).map(([id,level],i)=>`<section class="directory-chapter"><button type="button" class="directory-chapter-toggle" data-chapter="${id}" aria-expanded="${!!expanded.get(id)}" aria-controls="directory-lessons-${id}"><span class="directory-number">${String(i+1).padStart(2,'0')}</span><span>${escape(level.name)}</span>${icon('m6 9 6 6 6-6')}</button><div class="directory-lessons" id="directory-lessons-${id}" ${expanded.get(id)?'':'hidden'}>${level.list.map(id=>`<button type="button" class="directory-lesson" data-lesson="${id}" aria-label="${escape(REQUIRED_CATALOG[id].title)}${L('，',', ')}${S.done[id]?L('已完成','done'):S.resume[id]?L('学习中','in progress'):L('未完成','not done')}" ${id===S.lesson.id?'aria-current="page"':''}><span class="directory-lesson-status" aria-hidden="true">${courseAchievementBadge(!!S.done[id])}</span><span>${escape(REQUIRED_CATALOG[id].title)}</span></button>`).join('')}</div></section>`).join('')}</nav>`;
    const dialog = document.createElement('dialog');
    dialog.id = 'course-directory-drawer';
    dialog.className = 'course-directory-drawer';
    dialog.setAttribute('aria-labelledby','directory-title');
    dialog.innerHTML = `<div class="directory-heading"><strong id="directory-title">${L('章节目录','Chapters')}</strong><button type="button" class="directory-close" aria-label="${L('关闭章节目录','Close chapter list')}">${icon('m6 6 12 12M18 6 6 18')}</button></div>`;
    app.append(dialog);
    const directoryTitle = dialog.querySelector('#directory-title');
    const returnButton = contents.querySelector('.directory-back');
    const menu = document.createElement('button');
    menu.type = 'button';menu.className = 'directory-menu';
    menu.innerHTML = icon('m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15');
    menu.setAttribute('aria-label',L('章节目录','Chapters'));menu.title = L('章节目录','Chapters');
    menu.setAttribute('aria-haspopup','dialog');menu.setAttribute('aria-controls',dialog.id);menu.setAttribute('aria-expanded','false');
    main.querySelector('#quit')?.remove();
    main.querySelector('.lesson-meta').append(menu);
    const mobile = matchMedia('(width < 850px)');
    const unlock = () => {
      document.documentElement.classList.remove('course-directory-open');
      menu.setAttribute('aria-expanded','false');
    };
    let exitAnimation = null;
    const finishClose = restore => {
      exitAnimation = null;
      dialog.close();
      dialog.classList.remove('is-closing');
      dialog.style.removeProperty('--directory-exit-from');
      dialog.style.removeProperty('--directory-backdrop-from');
      unlock();
      if (restore) (mobile.matches ? menu : contents.querySelector('[aria-current]')).focus({preventScroll:true});
    };
    const close = (restore = true) => {
      if (!dialog.open) return;
      // Navigation/resize disposes immediately; ordinary dismissal keeps the modal
      // and scroll lock until its exit finishes. Capture an interrupted entrance.
      if (!restore || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishClose(restore);return;
      }
      if (exitAnimation) return;
      dialog.style.setProperty('--directory-exit-from',getComputedStyle(dialog).transform);
      dialog.style.setProperty('--directory-backdrop-from',getComputedStyle(dialog,'::backdrop').opacity);
      dialog.classList.add('is-closing');
      const animation = dialog.getAnimations().find(a=>a.animationName==='directory-slide-out');
      if (!animation) {finishClose(restore);return;}
      exitAnimation = animation;
      const complete = () => {if(exitAnimation===animation) finishClose(restore);};
      animation.finished.then(complete,complete);
    };
    const position = () => {
      const hadFocus = contents.contains(document.activeElement) || dialog.contains(document.activeElement) || document.activeElement === menu;
      close(false);
      if (mobile.matches && directoryTitle.parentElement !== contents) {
        directoryTitle.replaceWith(returnButton);
        contents.prepend(directoryTitle);
      } else if (!mobile.matches && directoryTitle.parentElement === contents) {
        returnButton.replaceWith(directoryTitle);
        contents.prepend(returnButton);
      }
      (mobile.matches ? dialog : sidebar).append(contents);
      if (hadFocus) (mobile.matches ? menu : contents.querySelector('[aria-current]')).focus({preventScroll:true});
    };
    position();mobile.addEventListener('change',position);
    const current = contents.querySelector('[aria-current]');
    if (current && !mobile.matches) {
      const offset = current.getBoundingClientRect().top - sidebar.getBoundingClientRect().top;
      if (offset < 0 || offset > sidebar.clientHeight - 60) sidebar.scrollTop += offset - sidebar.clientHeight / 3;
    }
    menu.onclick = () => {
      dialog.showModal();document.documentElement.classList.add('course-directory-open');menu.setAttribute('aria-expanded','true');
      dialog.querySelector('.directory-close').focus({preventScroll:true});
    };
    dialog.querySelector('.directory-close').onclick = () => close();
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{
      const r=dialog.getBoundingClientRect();
      if(event.target===dialog && (event.clientX<r.left || event.clientX>=r.right || event.clientY<r.top || event.clientY>=r.bottom)) close();
    });
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab') return;
      const focusable=[...dialog.querySelectorAll('button')].filter(node=>node.getClientRects().length && !node.disabled);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    });
    returnButton.onclick = () => {close(false);home();window.scrollTo(0,0);};
    contents.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button) return;
      if(button.dataset.chapter){
        const state=button.getAttribute('aria-expanded')!=='true';
        expanded.set(button.dataset.chapter,state);button.setAttribute('aria-expanded',String(state));
        document.getElementById(button.getAttribute('aria-controls')).hidden=!state;
      } else if(button.dataset.lesson){
        close();
        if(button.dataset.lesson!==S.lesson.id) open(button.dataset.lesson);
      }
    });
    cleanup = () => {close(false);unlock();mobile.removeEventListener('change',position);cleanup=()=>{};};
  }
  return {mount,dispose:()=>cleanup()};
})();
;
/* js/app.js */
/* 课程外壳：目录、步骤与进度 */
// 暂停展示章首页；保留渲染与导航代码，改为 true 即可恢复。
const SHOW_CHAPTER_DIRECTORY=false;
const S={intro:false,lesson:null,i:0,picked:null,answers:{},passed:{},gateOK:false,carry:{},carrySnapshots:{},done:{},resume:{}};
// Transient feedback only; saved completion records never replay the stamp.
const pendingAchievementStamps=new Set();
const app=document.getElementById('app');
function codeToolbar(label=L('复制整段代码','Copy code')){
  const safeLabel=String(label).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return `<div class="code-toolbar"><span class="code-status" role="status"></span><button type="button" class="code-copy" data-copy-label="${safeLabel}" aria-label="${safeLabel}" title="${safeLabel}"><svg class="copy-symbol" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><svg class="copy-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button></div>`;
}
function codeBlock(code){
  const escaped=String(code).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div class="code-block">${codeToolbar()}<pre><code>${escaped}</code></pre></div>`;
}
async function copyCode(text){
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return;
    }
  }catch(e){}
  // Support local files and browsers where the Clipboard API is unavailable.
  const field=document.createElement('textarea'),focused=document.activeElement;
  field.value=text;
  field.setAttribute('readonly','');
  field.className='clipboard-fallback';
  document.body.appendChild(field);
  try{
    field.focus({preventScroll:true});
    field.select();
    if(!document.execCommand('copy'))throw new Error('Copy failed');
  }finally{
    field.remove();
    if(focused&&focused.isConnected)focused.focus({preventScroll:true});
  }
}
const copyStatusTimers=new WeakMap();
function clearCopyStatusTimer(status){
  const timers=copyStatusTimers.get(status);
  if(timers){
    clearTimeout(timers.fade);
    clearTimeout(timers.clear);
    copyStatusTimers.delete(status);
  }
  status.classList.remove('is-fading');
}
app.addEventListener('click',async event=>{
  const button=event.target.closest('.code-copy');
  if(!button||button.disabled)return;
  const block=button.closest('.code-block,[data-code-copy-scope]'),status=block.querySelector('.code-status');
  const copyLabel=button.dataset.copyLabel||L('复制整段代码','Copy code');
  const releaseBusy=CourseUI.beginButtonBusy(button,L('正在复制','Copying'),{iconOnly:true});
  clearCopyStatusTimer(status);
  status.textContent='';
  button.classList.remove('is-copied');
  button.setAttribute('aria-label',copyLabel);
  try{
    await copyCode(block.querySelector('code').textContent);
    status.textContent=L('已复制','Copied');
    button.classList.add('is-copied');
    button.setAttribute('aria-label',L('已复制','Copied'));
    const fade=setTimeout(()=>status.classList.add('is-fading'),2380);
    const clear=setTimeout(()=>{
      status.textContent='';
      status.classList.remove('is-fading');
      copyStatusTimers.delete(status);
      button.classList.remove('is-copied');
      button.setAttribute('aria-label',copyLabel);
    },2500);
    copyStatusTimers.set(status,{fade,clear});
  }catch(e){
    status.textContent=L('复制失败，请手动选择代码复制','Copy failed. Please select the code and copy it manually.');
  }finally{
    releaseBusy();
  }
});
const STORE=COURSE_STORE;
let progressNotice='';
const allIds=()=>Object.values(LEVELS).flatMap(level=>level.list);
function load(){
 let result;
 try{result=courseLoadProgress(localStorage,allIds())}catch(e){result={done:{},error:L('当前浏览器无法保存进度。','This browser cannot save your progress.')}}
 S.done=result.done;
 progressNotice=result.error||'';
 try{S.resume=courseLoadResume(localStorage,LESSONS,S.done)}catch(e){S.resume={}}
}
function save(){try{S.done=courseCleanProgress(S.done,allIds());localStorage.setItem(STORE,JSON.stringify(S.done));if(typeof courseSyncCompletionTime==='function')courseSyncCompletionTime()}catch(e){progressNotice=L('当前浏览器无法保存进度；关闭后可能需要重新学习。','This browser cannot save your progress; you may need to start again after closing it.')}}
// Header progress: finished lessons count in full, lessons in progress by the share of pages already passed.
function courseProgressPercent(){
 const ids=allIds();if(!ids.length)return 0;
 const part=id=>{
  if(S.done[id])return 1;
  const lesson=typeof LESSONS==='undefined'?null:LESSONS[id],step=S.lesson?.id===id?S.i:S.resume?.[id]?.step;
  return Number.isInteger(step)&&lesson?.pages.length?step/lesson.pages.length:0;
 };
 return ids.reduce((sum,id)=>sum+part(id),0)/ids.length*100;
}
function saveResume(){
 try{localStorage.setItem(COURSE_RESUME_STORE,JSON.stringify(S.resume))}catch(e){progressNotice=L('当前浏览器无法保存进度；关闭后可能需要重新学习。','This browser cannot save your progress; you may need to start again after closing it.')}
}
function rememberStep(){
 if(!S.lesson||S.intro||S.done[S.lesson.id])return;
 S.resume[S.lesson.id]={revision:courseLessonRevision(S.lesson),step:S.i,pageKey:coursePageKey(S.lesson,S.i),answers:S.answers,carry:S.carry,carrySnapshots:S.carrySnapshots};
 saveResume();
}
window.addEventListener('pagehide',rememberStep);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')rememberStep()});
function fill(t){return String(t).replace(/\{([A-Za-z_]\w*)\}/g,(m,k)=>S.carry[k]!==undefined?S.carry[k]:m)}
function typesetMath(root){typesetCourseMath(root)}
function progressHeader(label,progress){return `<header class="site-header"><div class="shell"><div class="header-row"><a class="brand" href="https://space-qat.com/" aria-label="${L('访问量立方官网','Visit the SpaceQat website')}"><img src="assets/spaceqat-logo-600.png?v=20261103" alt="${L('量立方 SpaceQat','SpaceQat')}" width="4221" height="1639"></a><span class="step-label">${label}</span>${languageToggle()}</div><div class="progress" role="progressbar" aria-label="${L('课程完成进度','Course progress')}" aria-valuemin="0" aria-valuemax="${allIds().length}" aria-valuenow="${allIds().filter(id=>S.done[id]).length}"><span style="--progress:${progress}%"></span></div></div></header>`}
function siteFooter(){return `<footer class="site-footer"><div class="shell"><span>${L('© 2026 量立方 SpaceQat','© 2026 SpaceQat')}</span><a href="https://space-qat.com/">${L('量立方官网','SpaceQat website')}</a></div></footer>`}
function showWelcome(){
  const dialog=document.createElement('dialog');
  dialog.className='welcome-dialog';
  dialog.setAttribute('aria-labelledby','welcome-title');
  dialog.setAttribute('aria-describedby','welcome-intro');
  dialog.innerHTML=`<section class="welcome-card">
    <a href="https://space-qat.com/" aria-label="${L('访问量立方官网','Visit the SpaceQat website')}"><img class="welcome-brand" src="assets/spaceqat-logo-600.png?v=20261103" alt="${L('量立方 SpaceQat','SpaceQat')}" width="116"></a>${languageToggle()}
    <h2 id="welcome-title" tabindex="-1" autofocus>${L('亲爱的量子冒险家，你好！','Hello, quantum adventurer!')}</h2>
    <p id="welcome-intro">${L('欢迎来到量立方的量子计算入门课程！不需要任何量子力学基础，我们会从“量子计算到底能做什么”出发，一起认识量子比特，体验纠缠，看看真实的量子硬件，了解纠错和量子算法，最后用 FatQat 写出你的第一个量子程序。准备好了吗？我们出发吧！','Welcome to SpaceQat’s introduction to quantum computing! No background in quantum mechanics is needed. Starting from the question “what can quantum computers actually do?”, we will meet qubits, explore entanglement, look at real quantum hardware, learn about error correction and quantum algorithms, and finally write your first quantum program with FatQat. Ready? Let’s go!')}</p>
    <div class="welcome-credit"><img class="welcome-credit-logo" src="assets/openqi-logo.png?v=20261103" alt="" width="569" height="120"><p>${L('本互动课程由','This interactive course is developed by')}<strong><a href="https://open-qi.com/" target="_blank" rel="noopener noreferrer">${L('通源量智','OPEN-QI')}</a></strong>${L('开发','')}</p></div>
    <button class="primary welcome-start" type="button">${L('开始学习','Start learning')}</button>
  </section>`;
  dialog.querySelector('.welcome-start').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('welcome-open');
    dialog.remove();
    document.getElementById('start')?.focus({preventScroll:true});
  },{once:true});
  document.body.append(dialog);
  document.body.classList.add('welcome-open');
  dialog.showModal();
}
let disposeJourney=()=>{};
let journeySeen=0;
function home(){
 window.CourseDirectory?.dispose();
 disposeJourney();
 rememberStep();
 const chapter=S.lesson?.id.split('-')[0];
 S.lesson=null;S.intro=false;
 renderIslandHome(chapter);
}
function open(id,step,chapterEntry=false){
 if(!LESSONS[id])return;
 disposeJourney();
 islandCatProgress=allIds().indexOf(id)/allIds().length;
 rememberStep();
 const saved=step===undefined&&!S.done[id]?S.resume[id]:null;
 S.lesson=LESSONS[id];S.lesson.id=id;S.i=step??saved?.step??0;
 S.answers=saved?.answers||{};S.passed={};S.carry=saved?.carry||{};S.carrySnapshots=saved?.carrySnapshots||{};
 S.intro=SHOW_CHAPTER_DIRECTORY&&(chapterEntry||(step===undefined&&!saved&&LEVELS[id.split('-')[0]].list[0]===id));
 if(S.intro)renderChapterTitle();else render();
 window.scrollTo(0,0);
}
function renderChapterTitle(){
 if(!SHOW_CHAPTER_DIRECTORY){S.intro=false;render();return}
 window.CourseDirectory?.dispose();
 disposeJourney();
 S.intro=true;
 const id=S.lesson.id,chapter=id.split('-')[0],level=LEVELS[chapter],number=Object.keys(LEVELS).indexOf(chapter)+1,ids=allIds();
 const previousId=ids[ids.indexOf(level.list[0])-1];
 const completed=level.list.filter(id=>S.done[id]).length;
 app.innerHTML=progressHeader(L(`第 ${number} 章 / 共 ${Object.keys(LEVELS).length} 章`,`Chapter ${number} of ${Object.keys(LEVELS).length}`),courseProgressPercent())+`
 <main id="main-content" class="chapter-title-main shell">
   <div class="chapter-title-meta"><span>${L('量子计算入门','Introduction to quantum computing')}</span><button id="quit" class="text-button">${L('返回课程地图','Back to course map')}</button></div>
   <section class="chapter-title-card" aria-labelledby="chapter-title">
     <div class="chapter-cover-intro">
       <p class="chapter-cover-label">${L(`第 ${number} 章`,`Chapter ${number}`)}</p>
       <h1 id="chapter-title" tabindex="-1">${level.name}</h1>
       <div class="chapter-cover-progress"><span>${L('本章进度','Chapter progress')}</span><span>${L(`已完成 ${completed} / ${level.list.length} 节`,`${completed} of ${level.list.length} lessons done`)}</span></div>
       <progress class="chapter-cover-meter" max="${level.list.length}" value="${completed}" aria-label="${L('本章学习进度','Chapter progress')}"></progress>
     </div>
     <div class="chapter-cover-outline">
       <div class="chapter-outline-heading"><h2>${L('本章内容','In this chapter')}</h2></div>
       <ol class="chapter-lesson-list">${level.list.map((lessonId,i)=>`<li><button class="chapter-lesson-link" data-chapter-lesson="${lessonId}"><span class="chapter-lesson-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="chapter-lesson-copy"><span class="chapter-lesson-title">${LESSONS[lessonId].title}</span><span class="chapter-lesson-state">${S.done[lessonId]?L('已完成','Done'):S.resume[lessonId]?L('学习中','In progress'):L('未开始','Not started')}</span></span><span class="chapter-lesson-badge" aria-hidden="true">${courseAchievementBadge(!!S.done[lessonId])}</span></button></li>`).join('')}</ol>
       <div class="chapter-title-actions"><button id="back" class="ghost">${previousId?L('返回上一章','Previous chapter'):L('返回课程地图','Back to course map')}</button><button id="chapter-start" class="primary">${S.resume[id]?L('继续学习','Continue learning'):L('开始本章','Start chapter')}</button></div>
     </div>
   </section>
 </main>`+siteFooter();
 document.getElementById('quit').onclick=()=>{home();window.scrollTo(0,0)};
 document.getElementById('back').onclick=()=>{if(previousId)open(previousId,LESSONS[previousId].pages.length-1);else home();window.scrollTo(0,0)};
 document.getElementById('chapter-start').onclick=()=>{S.intro=false;render();window.scrollTo(0,0);app.querySelector('h1').setAttribute('tabindex','-1');app.querySelector('h1').focus({preventScroll:true})};
 app.querySelectorAll('[data-chapter-lesson]').forEach(button=>button.onclick=()=>{
  open(button.dataset.chapterLesson);
  if(S.intro){S.intro=false;render();}
  const heading=app.querySelector('h1');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
 });
 document.getElementById('chapter-title').focus({preventScroll:true});
}
function next(){
  const lesson=S.lesson;
  S.carrySnapshots[S.i]={...S.carry};
  if(S.i<lesson.pages.length-1){S.i++;render();window.scrollTo(0,0);return}
  const wasComplete=courseIsComplete();
  if(!S.done[lesson.id])pendingAchievementStamps.add(lesson.id);
  S.done[lesson.id]=1;save();
  delete S.resume[lesson.id];saveResume();
  if(!wasComplete&&courseIsComplete()){showCourseCompletion();return}
  const nx=nextId(lesson.id);if(nx)open(nx,undefined,nx.split('-')[0]!==lesson.id.split('-')[0]);else{home();window.scrollTo(0,0)}
}
function previous(){
  if(!S.lesson)return;
  S.carrySnapshots[S.i]={...S.carry};
  if(S.i===0){
    if(SHOW_CHAPTER_DIRECTORY&&LEVELS[S.lesson.id.split('-')[0]].list[0]===S.lesson.id){renderChapterTitle();window.scrollTo(0,0);return}
    const ids=allIds(),index=ids.indexOf(S.lesson.id),id=ids[index-1];
    if(id){open(id,LESSONS[id].pages.length-1);return}
    home();window.scrollTo(0,0);return;
  }
  S.i--;render();window.scrollTo(0,0);
}
function nextId(id){const ids=allIds(),k=ids.indexOf(id);return k>=0&&k<ids.length-1?ids[k+1]:null}
function render(){
  window.CourseDirectory?.dispose();
  disposeJourney();
  S.picked=null;S.gateOK=false;
  const lesson=S.lesson,page=lesson.pages[S.i],ids=allIds(),idx=ids.indexOf(lesson.id),level=LEVELS[lesson.id.split('-')[0]],chapterNumber=Object.values(LEVELS).indexOf(level)+1;
  const snapshot=S.carrySnapshots[S.i];
  if(snapshot)S.carry={...snapshot};
  app.innerHTML=progressHeader('',courseProgressPercent())+`<main id="main-content" class="lesson-main shell"><div class="lesson-meta"><span class="lesson-no">${L(`第 ${chapterNumber} 章 / ${level.name}`,`Chapter ${chapterNumber} / ${level.name}`)}</span><button id="quit" class="text-button map-button" aria-label="${L('课程地图','Course map')}" title="${L('课程地图','Course map')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg></button></div><div class="lesson-card"><div class="thread"><h1>${lesson.ask}</h1></div><div class="dots" aria-label="${L(`本节步骤 ${S.i+1} / ${lesson.pages.length}`,`Step ${S.i+1} of ${lesson.pages.length}`)}">${lesson.pages.map((_,j)=>`<span class="dot${j<=S.i?' on':''}"></span>`).join('')}</div><div class="screen" id="scr" tabindex="0" role="region" aria-label="${L('课程内容','Lesson content')}"></div></div><div class="bottom"><p class="hintline" id="hint" role="status"></p><div class="lesson-actions"><button class="ghost back" id="back">${L('上一步','Back')}</button><button class="primary go" id="go"></button></div></div></main>`+siteFooter();
  document.getElementById('quit').onclick=()=>{home();window.scrollTo(0,0)};document.getElementById('back').onclick=previous;
  if(idx===0&&S.i===0)document.getElementById('back').textContent=L('返回地图','Back to map');document.getElementById('go').onclick=next;
  window.CourseDirectory?.mount();
  ({ask:pAsk,say:pSay,show:pShow,play:pPlay,flaw:pFlaw,end:pEnd})[page.t](page);
  typesetMath(app);
  if(S.passed[S.i]&&page.t==='play'&&!['lab','qubit','teleportLesson','groverLock'].includes(page.c)){
    go('继续',true);hint('');
  }
  if(snapshot)S.carry={...snapshot};
  rememberStep();
}
// Button labels set by lessons and components; English is looked up here so every caller stays short.
const GO_LABELS={'继续':'Continue','下一节':'Next lesson','进入下一章':'Next chapter','完成本节，返回地图':'Finish lesson, back to map','完成学习，查看旅程':'Finish and see your journey','确认答案':'Check answer','开始实验':'Start experiment','开始传态':'Start teleportation','进入练习':'Go to practice'};
function go(label,on){const b=document.getElementById('go');b.textContent=LANG==='en'&&GO_LABELS[label]?GO_LABELS[label]:label;b.disabled=!on}
function hint(s){const node=document.getElementById('hint');node.textContent=s||'';typesetMath(node)}
function lead(p){
  const art=p.illustration;
  const image=art?`<img class="lesson-illustration${art.wide?' lesson-illustration--wide':''}" src="${art.src}" alt="${art.alt}" width="${art.width||2164}" height="${art.height||726}">`:'';
  // leadArt puts a figure above a question (show pages use p.art for their main figure instead).
  const figure=p.leadArt&&ART[p.leadArt]?`<div class="lead-art">${ART[p.leadArt](p)}</div>`:'';
  return (p.circuit?entLessonCircuit(p.circuit):image)+figure+(p.carry?`<p class="carry">${fill(p.carry)}</p>`:'');
}
const VERDICT_ICON={
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  wrong:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  retry:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>'
};
function answerVerdict(s,kind,text){
  s.querySelector('.answer-verdict')?.remove();
  const anchor=s.querySelector('.opts')||s.lastElementChild;
  anchor.insertAdjacentHTML('afterend',`<p class="answer-verdict is-${kind}" role="status">${VERDICT_ICON[kind]}<span>${text}</span></p>`);
}
function chooseOption(p,s,b,restoring=false){
  if(S.picked!==null)return;
  const pickedIndex=+b.dataset.j;
  // 三个及以上选项时，第一次答错只标出这一项并给一次重选机会；两个选项重选等于直接给答案，不提供。
  if(!restoring&&pickedIndex!==p.a&&p.o.length>2&&!s.dataset.retried){
    s.dataset.retried='1';
    b.disabled=true;b.classList.add('tried');
    b.insertAdjacentHTML('afterbegin','<span class="mark no" aria-hidden="true">✕</span>');
    if(Array.isArray(p.f)&&p.f[pickedIndex])b.insertAdjacentHTML('afterend',`<div class="opt-note wrong">${fill(p.f[pickedIndex])}</div>`);
    answerVerdict(s,'retry',L('不对，再想一想。你还有一次机会。','Not quite. Think again—you have one more try.'));
    typesetMath(s);
    return;
  }
  S.picked=pickedIndex;
  S.answers[S.i]=S.picked;
  s.querySelectorAll('.opt').forEach((x,j)=>{
    x.disabled=true;
    if(j!==p.a&&j!==S.picked)return;
    const right=j===p.a;
    x.classList.add(right?'right':'wrong');
    x.insertAdjacentHTML('afterbegin',`<span class="mark ${right?'ok':'no'}" aria-hidden="true">${right?'✓':'✕'}</span>`);
    if(Array.isArray(p.f)&&p.f[j]){
      const noteId=`opt-note-${j}`;
      x.insertAdjacentHTML('afterend',`<div class="opt-note ${right?'right':'wrong'}" id="${noteId}">${fill(p.f[j])}</div>`);
      x.setAttribute('aria-describedby',noteId);
    }
  });
  s.querySelectorAll('.opt-item>.opt-note').forEach(note=>{if(!note.id)note.remove()});
  s.querySelectorAll('.opt.tried').forEach(x=>{x.classList.add('wrong');x.querySelectorAll('.mark').forEach((m,k)=>{if(k)m.remove()})});
  const correct=S.picked===p.a;
  answerVerdict(s,correct?'right':'wrong',correct?(s.dataset.retried?L('对了！这次答对了。','Correct! You got it this time.'):L('答对了！','Correct!')):(s.dataset.retried?L('这次也不对，看看下面的解析。','Still not right. See the explanation below.'):L('答错了，看看下面的解析。','Not right. See the explanation below.')));
  if(typeof p.f==='string')s.insertAdjacentHTML('beforeend',`<div class="fb"><b>${L('本题解析','Explanation')}</b>${fill(p.f)}</div>`);
  if(p.review)s.insertAdjacentHTML('beforeend',questionReview(p.review));
  if(p.feedbackCircuit)s.insertAdjacentHTML('beforeend',`<div class="answer-circuit">${entLessonCircuit(p.feedbackCircuit)}</div>`);
  typesetMath(s);
  go('继续',true);hint('');
  rememberStep();
}
function questionReview(items){
  return `<section class="answer-review" aria-label="${L('知识回顾','Review')}"><h3>${L('顺手复习','Quick review')}</h3><dl>${items.map(([label,detail])=>`<div><dt>${fill(label)}</dt><dd>${fill(detail)}</dd></div>`).join('')}</dl></section>`;
}
/* ---------- 猜 ---------- */
function pAsk(p){
  const s=document.getElementById('scr');
  s.innerHTML=lead(p)+`<p class="q">${fill(p.q)}</p><div class="opts">${
    p.o.map((o,j)=>`<div class="opt-item"><button class="opt" data-j="${j}">${o}</button></div>`).join('')}</div>`;
  if(p.multi){setupMulti(p,s);return;}
  go('继续',false);hint('');
  s.querySelectorAll('.opt').forEach(b=>b.onclick=()=>chooseOption(p,s,b));
  restoreAnswer(p,s);
}
function setupMulti(p,s){
  const saved=S.answers[S.i];
  const selected=new Set(Array.isArray(saved?.selected)?saved.selected:[]);
  const options=[...s.querySelectorAll('.opt')];
  const confirm=document.getElementById('go');
  confirm.classList.add('multi-confirm');
  const refresh=()=>{
    options.forEach((b,j)=>{b.classList.toggle('selected',selected.has(j));b.setAttribute('aria-pressed',String(selected.has(j)));});
    confirm.disabled=selected.size===0;
  };
  const submit=()=>{
    if(!selected.size)return;
    S.answers[S.i]={selected:[...selected],submitted:true};
    options.forEach((b,j)=>{
      b.disabled=true;
      b.classList.remove('selected');
      const right=p.a.includes(j);
      if(!right&&!selected.has(j))return;
      b.classList.add(right?'right':'wrong');
      b.insertAdjacentHTML('afterbegin',`<span class="mark ${right?'ok':'no'}" aria-hidden="true">${right?'✓':'✕'}</span>`);
      if(Array.isArray(p.f)&&p.f[j]){
        const noteId=`opt-note-${j}`;
        b.insertAdjacentHTML('afterend',`<div class="opt-note ${right?'right':'wrong'}" id="${noteId}">${fill(p.f[j])}</div>`);
        b.setAttribute('aria-describedby',noteId);
      }
    });
    const allRight=selected.size===p.a.length&&p.a.every(j=>selected.has(j));
    answerVerdict(s,allRight?'right':'wrong',allRight?L('全部答对！','All correct!'):L('有遗漏或多选了，看看下面的解析。','Something is missing or extra. See the explanation below.'));
    if(typeof p.f==='string')s.insertAdjacentHTML('beforeend',`<div class="fb"><b>${L('本题解析','Explanation')}</b>${fill(p.f)}</div>`);
    if(p.feedbackCircuit)s.insertAdjacentHTML('beforeend',`<div class="answer-circuit">${entLessonCircuit(p.feedbackCircuit)}</div>`);
    typesetMath(s);
    confirm.classList.remove('multi-confirm');confirm.onclick=next;go('继续',true);hint('');
    rememberStep();
  };
  options.forEach((b,j)=>b.onclick=()=>{
    selected.has(j)?selected.delete(j):selected.add(j);
    S.answers[S.i]={selected:[...selected],submitted:false};
    refresh();
    rememberStep();
  });
  confirm.onclick=submit;
  go('确认答案',false);hint('');
  refresh();
  if(saved?.submitted)submit();
}
function restoreAnswer(p,s){
  const answer=S.answers[S.i];
  if(answer!==undefined){
    const button=s.querySelectorAll('.opt')[answer];
    if(button)chooseOption(p,s,button,true);
  }
}

/* ---------- 说 / 揭 ---------- */
function pSay(p){
  document.getElementById('scr').innerHTML=lead(p)+p.b.map(t=>`<p class="say${t.startsWith('$$')?' math-line':''}">${fill(t)}</p>`).join('');
  go('继续',true);
}

/* ---------- 看 ---------- */
function pShow(p){
  document.getElementById('scr').innerHTML=lead(p)+`<div>${ART[p.art](p)}</div><p class="cap">${fill(p.cap)}</p>`;
  if(p.art==='hardwareOverview')bindHardwareOverview(document.getElementById('scr'));
  if(p.art==='timeline'){
    const events=[...document.querySelectorAll('#scr .history-event')],step=S.i,answers=S.answers;
    const saved=answers[step]?.historyIndex;
    if(Number.isInteger(saved)){
      events.forEach(event=>event.open=false);
      if(events[saved])events[saved].open=true;
    }
    events.forEach(event=>event.addEventListener('toggle',()=>{
      if(event.isConnected){answers[step]={historyIndex:events.findIndex(item=>item.open)};rememberStep();}
    }));
  }
  if(['careerDirections','careerNext'].includes(p.art))bindCareerExploration(document.getElementById('scr'),p);
  go('继续',true);
}

/* ---------- 找错 ---------- */
function pFlaw(p){
  const s=document.getElementById('scr');
  s.innerHTML=lead(p)+`<div class="flawbox"><p>${fill(p.claim)}</p></div>
    <p class="flawq">${p.q||L('这段推理错在哪一步？','Which step of this reasoning is wrong?')}</p>
    <div class="opts">${p.o.map((o,j)=>`<div class="opt-item"><button class="opt" data-j="${j}">${o}</button></div>`).join('')}</div>`;
  go('继续',false);hint('');
  s.querySelectorAll('.opt').forEach(b=>b.onclick=()=>chooseOption(p,s,b));
  restoreAnswer(p,s);
}

/* ---------- 玩 ---------- */
function pPlay(p){
  const s=document.getElementById('scr');
  const intro=p.intro?`<div class="play-intro">${p.intro.map(text=>`<p class="say">${fill(text)}</p>`).join('')}</div>`:'';
  s.innerHTML=lead(p)+intro+`<p class="task">${fill(p.task)}</p><div id="slot"></div>`;
  go('继续',false);hint(p.gh||'');
  COMP[p.c](document.getElementById('slot'),p);
}
function pass(msg){
  if(S.gateOK)return;S.gateOK=true;S.passed[S.i]=true;go('继续',true);hint(msg||'');
}

/* ---------- 收 ---------- */
function pEnd(p){
  const paragraphs=fill(p.line).split(/<br\s*\/?\s*>/i).map(line=>`<p>${line}</p>`).join('');
  document.getElementById('scr').innerHTML=p.recap?`<section class="lesson-recap" aria-label="${L('本节小结','Lesson summary')}">
    <h2>${fill(p.line)}</h2>
    <dl class="recap-cases">${p.recap.map(item=>`<div><dt>${item.name}</dt><dd><p>${fill(item.detail)}</p><strong>${item.note}</strong></dd></div>`).join('')}</dl>
    <div class="recap-bridge"><h3>${p.bridge}</h3><p>${p.next}</p></div>
  </section>`:`<div class="done">
    <div class="seal">✓</div><div class="able${p.steps?' able-checklist':''}">${paragraphs}${p.steps?`<ol>${p.steps.map(step=>`<li>${fill(step)}</li>`).join('')}</ol>`:''}</div></div>`;
  const nx=nextId(S.lesson.id);
  const finishesCourse=!courseIsComplete()&&allIds().every(id=>id===S.lesson.id||S.done[id]);
  go(finishesCourse?'完成学习，查看旅程':nx?(nx.split('-')[0]===S.lesson.id.split('-')[0]?'下一节':'进入下一章'):'完成本节，返回地图',true);
}
;
/* js/island.js */
/* Production island navigation. Learning state remains in app.js/progress.js.
   All illustration colors are CSS tokens in island-theme.css. */
function journeyMilestoneIcon(isSign){
  if(isSign)return `<g class="journey-icon">
    <ellipse cy="17" rx="18" ry="4.5" fill="var(--map-leaf-pale)"/>
    <ellipse cy="17" rx="8" ry="2" fill="var(--map-land-shade)" opacity=".35"/>
    <g class="journey-sign">
      <path d="M-3 -8Q0 -10 3 -8L4 15Q0 18 -4 15Z" fill="var(--map-wood-shade)"/>
      <path d="M-1 -5L0 13" stroke="var(--map-wood-light)"/>
      <path d="M-18 -12Q-19 -16 -14 -16L10 -15Q13 -15 15 -12L19 -6Q20 -4 17 -2L12 3Q10 5 6 5L-14 4Q-18 4 -18 0Z" fill="var(--map-wood-shade)"/>
      <path d="M-18 -14Q-19 -18 -14 -18L10 -17Q13 -17 15 -14L19 -8Q20 -6 17 -4L12 1Q10 3 6 3L-14 2Q-18 2 -18 -2Z" fill="url(#journey-soft-wood)"/>
      <path d="M-14 -15Q-5 -16 7 -15" stroke="var(--map-sand-light)" opacity=".8"/>
      <path d="M-14 -1Q-10 -2 -6 -1M8 0L11 -1" stroke="var(--map-wood-shade)" opacity=".55"/>
      <path d="M-4 -7H10M6 -11L11 -7L6 -3" stroke="var(--map-cream)" class="journey-sign-arrow"/>
      <path d="M-13 -10Q-7 -13 -7 -7Q-12 -4 -13 -10Z" fill="var(--map-leaf)"/>
      <path d="M-12 -6L-9 -9" stroke="var(--map-sand-light)"/>
    </g>
    <path d="M-13 18Q-18 13 -16 11Q-12 12 -12 17Q-11 11 -8 11Q-7 15 -10 18M10 18Q9 13 11 12L14 17L17 13L16 18" fill="var(--map-land-shade)"/>
  </g>`;
  return `<g class="journey-icon">
    <ellipse cx="1" cy="17" rx="24" ry="5" fill="var(--map-leaf-pale)"/>
    <ellipse cx="1" cy="17" rx="17" ry="2.5" fill="var(--map-land-shade)" opacity=".35"/>
    <path class="journey-chest-glow" d="M-13 0L-25 -33Q0 -47 25 -33L13 0Z"/>
    <g class="journey-chest-inside">
      <path d="M-16 2Q-18 -3 -12 -5H14Q19 -4 17 1L13 5Z" fill="var(--map-wood-dark)"/>
      <ellipse cx="-7" cy="-1" rx="4.5" ry="2.5" fill="var(--map-sand)"/>
      <ellipse cx="1" cy="-2" rx="4.5" ry="2.5" fill="var(--map-gold)"/>
      <ellipse cx="8" cy="0" rx="4.5" ry="2.5" fill="var(--map-sand)"/>
      <path d="M0 -2L4 -7Q5 -8 6 -6L9 -2L5 2Z" fill="var(--map-jade)"/>
      <path d="M4 -6L5 -1L1 -2Z" fill="var(--map-river-light)"/>
    </g>
    <g class="journey-chest-lid">
      <path d="M10 -15Q20 -16 20 -6V-2Q20 1 14 3L9 -1Z" fill="var(--map-wood-shade)"/>
      <path d="M-17 0V-5Q-17 -16 -8 -16H6Q15 -16 15 -5V0Q15 2 12 2H-14Q-17 2 -17 0Z" fill="url(#journey-soft-wood)"/>
      <path d="M-14 -10Q-12 -14 -7 -14H5" stroke="var(--map-sand-light)" opacity=".8"/>
      <path d="M-10 1V-5Q-10 -11 -7 -15M8 1V-5Q8 -11 5 -15" stroke="var(--map-land-shade)" class="journey-chest-band"/>
      <path d="M-14 -3H12" stroke="var(--map-wood-shade)" opacity=".45"/>
      <rect x="-3.5" y="-2" width="7" height="6" rx="2.5" fill="var(--map-sand)"/>
    </g>
    <path d="M13 2L20 -2V9Q20 12 15 15L11 14Z" fill="var(--map-wood-shade)"/>
    <path d="M-17 2H15V11Q15 16 10 16H-12Q-17 16 -17 11Z" fill="var(--map-wood)"/>
    <path d="M-14 4H12M-13 10Q-4 9 3 11" stroke="var(--map-wood-shade)" opacity=".45"/>
    <path d="M-10 3V12Q-10 14 -8 14M8 3V12Q8 14 6 14" stroke="var(--map-land-shade)" class="journey-chest-band"/>
    <rect x="-3.5" y="2" width="7" height="7" rx="2.5" fill="var(--map-sand)"/>
    <path d="M-1 4Q3 3 2 6Q-1 8 -1 4Z" fill="var(--map-leaf)"/>
    <path d="M-21 18Q-24 13 -21 12L-18 17L-16 13L-15 18M17 18Q18 11 21 12L20 17L24 15L23 18" fill="var(--map-land-shade)"/>
  </g>`;
}

function courseIsland(got,total){
 const milestones=[Math.ceil(total/3),Math.ceil(total*2/3)];
 return `<div class="island-map journey-progress"><span class="sr-only" role="progressbar" aria-label="${L('课程完成进度','Course progress')}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${got}" aria-valuetext="${L(`已完成 ${got} / ${total} 节`,`${got} of ${total} lessons done`)}"></span><svg class="journey-scene island-scene" viewBox="0 0 600 402" fill="none" aria-hidden="true">
<defs>
<linearGradient id="journey-soft-wood" x2="0" y2="1"><stop stop-color="var(--map-wood-light)"/><stop offset="1" stop-color="var(--map-wood)"/></linearGradient>
 <pattern id="water" width="38" height="31" patternUnits="userSpaceOnUse"><path d="M4 18Q9 21 14 18" stroke="var(--map-water-line)" style="stroke-width:1.4px" stroke-linecap="round"/></pattern>
 <pattern id="grass" width="33" height="29" patternUnits="userSpaceOnUse"><path d="M11 18l2 -3l3 3" stroke="var(--map-land-shade)" style="stroke-width:1px" opacity=".5"/></pattern>
 <g id="tree"><ellipse cy="22" rx="22" ry="7" fill="var(--map-leaf)" opacity=".3"/><path d="M-5 -4L-6 22Q0 26 6 22L4 -5Z" fill="var(--map-wood-shade)"/><path d="M-1 2V20" stroke="var(--map-wood)" style="stroke-width:2px"/><path d="M-23 -10C-31 -22 -20 -34 -12 -35C-12 -50 12 -51 15 -36C32 -34 33 -13 23 -9C18 6 -17 6 -23 -10Z" fill="var(--map-leaf)"/><path d="M-22 -21C-20 -30 -12 -28 -9 -36C-3 -45 12 -43 14 -33C21 -29 24 -19 19 -15C10 -7 -17 -8 -22 -21Z" fill="var(--map-leaf-light)"/><ellipse cx="-7" cy="-30" rx="5" ry="3" fill="var(--map-leaf-pale)" opacity=".7"/></g>
 <g id="flower"><path d="M0 3V-4M0 1L-4 -1" stroke="var(--map-leaf)" style="stroke-width:1.5px" stroke-linecap="round"/><g fill="var(--map-cream)"><circle cx="-2" cy="-5" r="2.5"/><circle cx="2" cy="-5" r="2.5"/><circle cy="-8" r="2.5"/><circle cy="-3" r="2.5"/></g><circle cy="-5" r="1.7" fill="var(--map-travel)"/></g>
 <g id="bush"><ellipse cy="5" rx="15" ry="4" fill="var(--map-land-shade)" opacity=".4"/><path d="M-15 0Q-16 -9 -7 -9Q-2 -19 6 -10Q17 -12 16 -1Q10 9 -15 0Z" fill="var(--map-land-shade)"/><path d="M-9 -5l3 2M5 -6l3 2" stroke="var(--map-land)" style="stroke-width:2px" stroke-linecap="round"/></g>
</defs>
<ellipse cx="305" cy="229" rx="282" ry="160" fill="var(--map-water)"/><ellipse cx="305" cy="229" rx="282" ry="160" fill="url(#water)"/>
<path d="M63 173C36 117 82 74 145 71C190 39 254 61 297 54C345 24 424 50 445 80C506 72 552 111 540 159C584 199 569 266 527 287C511 340 422 351 376 337C311 379 251 349 217 348C140 372 79 327 80 289C28 268 25 206 63 173Z" fill="var(--map-land-shade)" transform="translate(0 10)"/>
<path d="M63 173C36 117 82 74 145 71C190 39 254 61 297 54C345 24 424 50 445 80C506 72 552 111 540 159C584 199 569 266 527 287C511 340 422 351 376 337C311 379 251 349 217 348C140 372 79 327 80 289C28 268 25 206 63 173Z" fill="var(--map-bank)"/>
<path d="M76 174C52 120 91 88 151 85C197 55 255 76 300 68C346 42 414 63 440 94C493 85 538 118 526 165C570 199 550 255 515 276C496 326 424 338 377 322C311 362 258 334 216 335C146 354 94 315 94 278C45 257 42 208 76 174Z" fill="var(--map-land)"/>
<path d="M76 174C52 120 91 88 151 85C197 55 255 76 300 68C346 42 414 63 440 94C493 85 538 118 526 165C570 199 550 255 515 276C496 326 424 338 377 322C311 362 258 334 216 335C146 354 94 315 94 278C45 257 42 208 76 174Z" fill="url(#grass)"/>
<path d="M110 282C150 330 210 335 240 290S355 235 392 278S520 275 487 200S425 130 371 155S285 190 248 145S195 75 150 104" stroke="var(--map-land-shade)" style="stroke-width:28px" stroke-linecap="round"/>
<path class="journey-road" d="M110 279C150 327 210 332 240 287S355 232 392 275S520 272 487 197S425 127 371 152S285 187 248 142S195 72 150 101" stroke="var(--map-sand)" style="stroke-width:24px" stroke-linecap="round"/>
<path d="M110 277C150 325 210 330 240 285S355 230 392 273S520 270 487 195S425 125 371 150S285 185 248 140S195 70 150 99" stroke="var(--map-sand-light)" style="stroke-width:15px" stroke-linecap="round"/>
<path class="journey-travelled" d="M110 279C150 327 210 332 240 287S355 232 392 275S520 272 487 197S425 127 371 152S285 187 248 142S195 72 150 101" pathLength="100" stroke-dasharray="${got/total*100} 100" ${got?'':'visibility="hidden"'}/>
<path d="M355 77C359 104 320 99 320 126C320 151 347 154 341 190C334 218 308 225 320 251C329 271 308 284 310 305" stroke="var(--map-leaf-light)" style="stroke-width:24px" stroke-linecap="round"/>
<path d="M355 77C359 104 320 99 320 126C320 151 347 154 341 190C334 218 308 225 320 251C329 271 308 284 310 305" stroke="var(--map-river)" style="stroke-width:19px" stroke-linecap="round"/>
<path d="M349 91l-7 6M327 123l1 7M337 180l-3 9M315 290l1 6" stroke="var(--map-river-light)" style="stroke-width:2px" stroke-linecap="round"/>
<g transform="translate(331 164) rotate(9)"><rect x="-20" y="-13" width="40" height="26" rx="3" fill="var(--map-wood-shade)"/><path d="M-18 -10H18M-18 -4H18M-18 2H18M-18 8H18" stroke="var(--map-wood-light)" style="stroke-width:4px"/><path d="M-21 -14V14M21 -14V14" stroke="var(--map-wood-dark)" style="stroke-width:4px" stroke-linecap="round"/></g>
<g transform="translate(320 254) rotate(-8)"><rect x="-17" y="-12" width="34" height="24" rx="3" fill="var(--map-wood-shade)"/><path d="M-15 -9H15M-15 -3H15M-15 3H15M-15 9H15" stroke="var(--map-wood-light)" style="stroke-width:4px"/><path d="M-18 -13V13M18 -13V13" stroke="var(--map-wood-dark)" style="stroke-width:3px" stroke-linecap="round"/></g>
<use href="#tree" transform="translate(93 159) scale(.95)"/><use href="#tree" transform="translate(187 225) scale(.82)"/><use href="#tree" transform="translate(449 111) scale(.9)"/><use href="#tree" transform="translate(465 323) scale(.75)"/>
<use href="#bush" transform="translate(145 177)"/><use href="#bush" transform="translate(386 100)"/><use href="#bush" transform="translate(263 333)"/><use href="#bush" transform="translate(521 238) scale(.8)"/>
<use href="#flower" transform="translate(113 205)"/><use href="#flower" transform="translate(125 212) scale(.8)"/><use href="#flower" transform="translate(276 97)"/><use href="#flower" transform="translate(291 105) scale(.8)"/><use href="#flower" transform="translate(411 221)"/><use href="#flower" transform="translate(424 229) scale(.8)"/><use href="#flower" transform="translate(190 291)"/>



<g stroke="var(--map-water-line)" style="stroke-width:1.5px" stroke-linecap="round"><path d="M70 342q5 4 10 0M497 355q5 4 10 0M38 200q5 4 10 0M541 104q5 4 10 0"/></g>

<circle class="journey-endpoint${got===total?' is-reached':''}" cx="150" cy="101" r="5"/>
${milestones.map((n,i)=>`<g class="journey-milestone${got>=n?' is-reached':''}" data-progress="${n/total}" data-count="${n}"><g transform="translate(0 32)">${journeyMilestoneIcon(i===0)}<g class="journey-sparkles"><path d="M-25 -22v8m-4 -4h8M25 -28v8m-4 -4h8M2 -39v6m-3 -3h6"/></g></g></g>`).join('')}
</svg>${Object.entries(LEVELS).map(([key,level],i)=>`<button class="island-pin" data-chapter="${key}" aria-label="${L(`第 ${i+1} 章 ${level.name}，已完成 ${level.list.filter(id=>S.done[id]).length} / ${level.list.length} 节`,`Chapter ${i+1}: ${level.name}, ${level.list.filter(id=>S.done[id]).length} of ${level.list.length} lessons done`)}" aria-pressed="false"><span>${level.list.every(id=>S.done[id])?'✓':String(i+1).padStart(2,'0')}</span></button>`).join('')}<svg class="journey-scene island-scene journey-cat-layer" viewBox="0 0 600 402" fill="none" aria-hidden="true">
      <g class="journey-runner" transform="translate(24 75)">
        <ellipse class="journey-cat-shadow" cy="1" rx="17" ry="4"/>
        <g class="journey-cat">
          <path class="journey-tail" d="M-10 -12Q-28 -13 -22 -26"/>
          <path class="journey-leg journey-leg-back" d="M-8 -10L-12 0M5 -10L9 0"/>
          <path class="journey-cat-body" d="M-13 -15Q-10 -24 2 -20L11 -15L9 -6H-10Z"/>
          <path class="journey-leg journey-leg-front" d="M-7 -10L-3 0M8 -10L13 0"/>
          <path class="journey-cat-head" d="M-5 -24L-8 -39L3 -33Q8 -35 13 -32L22 -41L21 -23Q19 -14 8 -15Q-3 -15 -5 -24Z"/>
          <g class="journey-eyes">
            <path class="journey-cat-eye" d="M-1 -27H7A4 4 0 0 1-1 -27Z"/>
            <ellipse class="journey-cat-eye" cx="15" cy="-26" rx="4" ry="5"/>
            <path class="journey-pupils" d="M4 -28V-25M16 -29V-23"/>
          </g>
        </g>
        <path class="journey-heart" d="M5 -54C-9 -62 -5 -72 2 -67L5 -64L8 -67C15 -72 19 -62 5 -54Z"/>
      </g>
</svg></div>`;
}
let islandCatProgress=null;
function bindIslandJourney(got,total){
 const scene=document.querySelector('.island-scene'),road=scene.querySelector('.journey-road');
 const length=road.getTotalLength(),point=p=>road.getPointAtLength(length*p);
 const place=(el,p)=>{const q=point(p);el.setAttribute('transform',`translate(${q.x} ${q.y})`)};
 const runner=scene.parentElement.querySelector('.journey-runner');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,arrival=null,target=islandCatProgress??got/total,lastTime=null;
 islandCatProgress=target;
 // The cat stands beside the road. Pick the side that keeps it clear of every chapter pin,
 // and glide toward that side while walking so it never jumps.
 const pinPoints=[];{let n=0;for(const level of Object.values(LEVELS)){pinPoints.push(point(n/total));n+=level.list.length}}
 const SIDES=[[-40,-32],[40,-32],[-40,34],[40,34]];
 const sideFor=p=>{const q=point(p);let best=SIDES[0],score=-1;
  for(const o of SIDES){const cx=q.x+o[0],cy=q.y+o[1]-20;if(cx<30||cx>570||cy<30||cy>375)continue;
   const d=Math.min(...pinPoints.map(t=>Math.hypot(t.x-cx,t.y-cy)));if(d>score+4){score=d;best=o}}
  return best};
 let side=sideFor(target).slice(),goal=side;
 const paint=()=>{
  const cat=point(islandCatProgress);
  runner.setAttribute('transform',`translate(${cat.x+side[0]} ${cat.y+side[1]})`);
 };
 const stop=()=>{cancelAnimationFrame(frame);frame=0;lastTime=null;runner.classList.remove('is-running')};
 const finish=()=>{stop();const callback=arrival;arrival=null;callback?.()};
 const tick=time=>{
  if(!scene.isConnected){stop();return}
  if(lastTime===null)lastTime=time;
  // Arc length, rather than curve parameters, keeps speed constant through bends.
  const step=260*(time-lastTime)/1000/length;
  const ease=Math.min(1,(time-lastTime)/1000*5);side=side.map((v,i)=>v+(goal[i]-v)*ease);
  lastTime=time;
  const distance=target-islandCatProgress;
  islandCatProgress+=Math.sign(distance)*Math.min(Math.abs(distance),step);
  paint();
  if(islandCatProgress===target&&Math.hypot(goal[0]-side[0],goal[1]-side[1])<.5){side=goal.slice();paint();finish()}else frame=requestAnimationFrame(tick);
 };
 const move=(id,onArrival)=>{
  target=Math.max(0,allIds().indexOf(id))/total;goal=sideFor(target);
  arrival=onArrival;
  if(motion.matches){islandCatProgress=target;side=goal.slice();paint();finish();return}
  if(target===islandCatProgress&&goal===side){finish();return}
  runner.classList.add('is-running');
  if(!frame){lastTime=null;frame=requestAnimationFrame(tick)}
 };
 const reduceMotion=()=>{if(motion.matches&&frame){islandCatProgress=target;side=goal.slice();paint();finish()}};
 motion.addEventListener('change',reduceMotion);
 paint();
 const markers=[...scene.querySelectorAll('.journey-milestone')];
 markers.forEach(m=>place(m,+m.dataset.progress));
 let before=0;
 document.querySelectorAll('.island-pin').forEach(button=>{
  const p=point(before/total);button.style.left=`${p.x/6}%`;button.style.top=`${p.y/4.02}%`;
  before+=LEVELS[button.dataset.chapter].list.length;
 });
 const seenKey=STORE+'.journey-seen.v1';
 try{journeySeen=Number(localStorage.getItem(seenKey))||0}catch(e){}
 journeySeen=Math.min(Math.max(0,journeySeen),got);
 try{localStorage.setItem(seenKey,String(journeySeen))}catch(e){}
 const pending=markers.filter(m=>+m.dataset.count>journeySeen&&got>=+m.dataset.count);
 pending.forEach(m=>m.classList.add('is-pending'));
 let welcome=null;
 const reobserve=()=>{visibility.unobserve(scene);visibility.observe(scene)};
 const visibility=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5)||!scene.isConnected)return;
  welcome=document.querySelector('.welcome-dialog[open]');
  if(welcome){welcome.addEventListener('close',reobserve,{once:true});return}
  pending.forEach((m,i)=>{m.style.setProperty('--milestone-delay',`${i*240}ms`);m.classList.remove('is-pending');m.classList.add('is-celebrating')});
  journeySeen=got;try{localStorage.setItem(seenKey,String(got))}catch(e){}
  visibility.disconnect();
 },{threshold:.5});
 visibility.observe(scene);
 disposeJourney=()=>{stop();arrival=null;motion.removeEventListener('change',reduceMotion);visibility.disconnect();welcome?.removeEventListener('close',reobserve)};
 return move;
}
function courseAchievementBadge(done){
 return `<svg class="achievement-badge${done?' is-complete':''}" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle class="achievement-rim" cx="14" cy="14" r="10.5"/>${done?'<path class="achievement-check" d="m9 14 3.3 3.3 6.7-6.6"/>':''}</svg>`;
}
function renderIslandHome(preferredChapter){
 const ids=allIds(),total=ids.length,got=ids.filter(id=>S.done[id]).length;
 const next=ids.find(id=>!S.done[id])||ids[0],chapters=Object.entries(LEVELS);
 let selected=LEVELS[preferredChapter]?preferredChapter:next.split('-')[0];
 app.innerHTML=progressHeader('',courseProgressPercent())+`<main id="main-content" class="island-home shell">
  <div class="island-intro"><h1>${L('量子计算入门课程','Introduction to Quantum Computing')}</h1></div>
  ${progressNotice?`<p class="curriculum-note" role="status">${progressNotice}</p>`:''}
  ${courseIsComplete()?`<section class="completion-entry" aria-label="${L('结课纪念','Course completion')}"><div><strong>${L(`你已完成全部 ${chapters.length} 章 ${total} 节`,`You have finished all ${chapters.length} chapters and ${total} lessons`)}</strong><p>${L('查看你的学习旅程，保存一张结课纪念卡。','See your learning journey and save a keepsake card.')}</p></div><button id="view-completion" class="primary">${L('查看我的学习旅程','See my learning journey')}</button></section>`:''}
  <div class="island-layout"><section class="island-panel" aria-labelledby="map-heading">${courseIsland(got,total)}<div class="island-progress"><span>${L(`<strong>${got}</strong> / ${total} 节已完成`,`<strong>${got}</strong> / ${total} lessons done`)}</span><div class="island-progress-track" aria-hidden="true"><span style="width:${got/total*100}%"></span></div></div></section>
  <nav class="island-directory" aria-labelledby="syllabus-heading"><div class="syllabus-heading"><h2 id="syllabus-heading">${L('课程目录','Course outline')}</h2><button id="reset" type="button" class="reset-progress"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13a8 8 0 1 0 8-8"/><path d="M15 2l-3 3 3 3"/></svg>${L('清除进度','Reset progress')}</button></div><div class="course-map">${chapters.map(([key,level],i)=>{
   return `<details class="level" id="chapter-${key}" data-level="${key}" name="course-chapters"><summary class="level-head" data-chapter="${key}"><span class="level-title"><span class="level-index">${L(`第 ${i+1} 章`,`Chapter ${i+1}`)}</span>${level.name}</span><span class="level-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></span></summary><div class="level-rows">${level.list.map(id=>`<button class="map-row${S.done[id]?' done':''}${id===next?' current':''}" data-id="${id}" ${id===next?'aria-current="step"':''} aria-label="${LESSONS[id].title}${L('，',', ')}${S.done[id]?L('已完成','done'):S.resume[id]?L('学习中','in progress'):L('未完成','not done')}"><span class="map-no" aria-hidden="true">${courseAchievementBadge(!!S.done[id])}</span><span class="map-title">${LESSONS[id].title}</span></button>`).join('')}</div></details>`;
  }).join('')}</div><button class="primary start" id="start"></button></nav></div></main>`+siteFooter();
 document.getElementById('view-completion')?.addEventListener('click',showCourseCompletion);
 const directory=app.querySelector('.island-directory'),levels=[...directory.querySelectorAll('.level')];
 const pins=[...app.querySelectorAll('.island-pin')],start=directory.querySelector('#start');
 const moveCat=bindIslandJourney(got,total);
 // Wait until a newly completed badge is actually visible, including folded chapters.
 const stampObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   const row=entry.target,id=row.dataset.id;
   if(S.done[id]&&pendingAchievementStamps.delete(id)){
    const badge=row.querySelector('.achievement-badge');
    badge.classList.add('is-stamping');
    badge.addEventListener('animationend',()=>badge.classList.remove('is-stamping'),{once:true});
   }
   stampObserver.unobserve(row);
  });
 },{threshold:.5});
 directory.querySelectorAll('.map-row.done').forEach(row=>{
  if(pendingAchievementStamps.has(row.dataset.id))stampObserver.observe(row);
 });
 const disposeMap=disposeJourney;
 disposeJourney=()=>{stampObserver.disconnect();disposeMap()};
 // Lesson navigation is immediate; decorative travel only accompanies chapter selection.
 const enterLesson=id=>open(id);
 const syncChapter=()=>{
  if(!directory.isConnected)return;
  const expanded=levels.find(level=>level.open);
  if(expanded&&selected!==expanded.dataset.level){selected=expanded.dataset.level;moveCat(LEVELS[selected].list[0])}
  pins.forEach(pin=>pin.setAttribute('aria-pressed',pin.dataset.chapter===expanded?.dataset.level));
  const level=LEVELS[selected],target=level.list.find(id=>!S.done[id])||level.list[0];
  start.textContent=level.list.every(id=>S.done[id])?L(`复习第 ${Object.keys(LEVELS).indexOf(selected)+1} 章`,`Review chapter ${Object.keys(LEVELS).indexOf(selected)+1}`):S.resume[target]||level.list.some(id=>S.done[id])?L('继续学习','Continue learning'):selected==='C1'?L('开始第一节','Start the first lesson'):L('开始本章','Start chapter');
  start.onclick=()=>enterLesson(target);
 };
 // Native details supplies keyboard navigation and expanded semantics; the map opens the same directory.
 levels.forEach(level=>level.addEventListener('toggle',syncChapter));
 pins.forEach(pin=>pin.onclick=()=>{
  levels.forEach(level=>level.open=level.dataset.level===pin.dataset.chapter);
  moveCat(LEVELS[pin.dataset.chapter].list[0]);
  syncChapter();
 });
 directory.querySelectorAll('.map-row').forEach(button=>button.onclick=()=>enterLesson(button.dataset.id));
 syncChapter();
 document.getElementById('reset').onclick=()=>confirmResetProgress(()=>{S.done={};S.resume={};pendingAchievementStamps.clear();islandCatProgress=0;save();saveResume();STUDIO.sessions={};QUBIT.sessions={};ENT.sessions={};LAB.sessions={};LAB.latest={};LAB.report=null;home()});
 typesetMath(app);
}

// In-page confirmation: the browser's confirm() is blocked in embedded previews, where it silently answers "no".
function confirmResetProgress(onConfirm){
 const dialog=document.createElement('dialog');
 dialog.className='welcome-dialog reset-dialog';
 dialog.setAttribute('aria-labelledby','reset-title');
 dialog.innerHTML=`<section class="welcome-card">
  <h2 id="reset-title">${L('清除学习进度？','Reset your progress?')}</h2>
  <p>${L('清除后无法恢复。','This can’t be undone.')}</p>
  <div class="reset-actions"><button type="button" class="secondary reset-cancel">${L('取消','Cancel')}</button><button type="button" class="primary reset-confirm">${L('清除进度','Reset progress')}</button></div>
 </section>`;
 let confirmed=false;
 dialog.querySelector('.reset-cancel').onclick=()=>dialog.close();
 dialog.querySelector('.reset-confirm').onclick=()=>{confirmed=true;dialog.close()};
 dialog.addEventListener('close',()=>{dialog.remove();if(confirmed)onConfirm();else document.getElementById('reset')?.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);dialog.showModal();dialog.querySelector('.reset-cancel').focus();
}
;
/* js/bloch.js */
/* Fixed orthographic view shared by the state and gate experiments.
   Camera depth affects drawing only; the state and measurement model stay separate. */
const BLOCH_VIEW={az:-.62,el:.36};
let blochSceneId=0;
function blochProject(b,cx=150,cy=139,r=96){
 const {az,el}=BLOCH_VIEW,x=b[0]*Math.cos(az)-b[1]*Math.sin(az),y=b[0]*Math.sin(az)+b[1]*Math.cos(az);
 return [cx+r*x,cy-r*(b[2]*Math.cos(el)-y*Math.sin(el)),y*Math.cos(el)+b[2]*Math.sin(el)];
}
function blochScene(b,{cx=150,cy=139,r=96,axis=null,trace=null,coordinates=true,overlay='',kets=false}={}){
 const project=v=>blochProject(v,cx,cy,r),point=v=>project(v).slice(0,2).map(n=>n.toFixed(2)).join(' ');
 const id=`bloch-shade-${++blochSceneId}`;
 // Split paths at the silhouette, so back arcs can be dashed without
 // confusing a complete great circle with the front surface of the sphere.
 function splitPath(points,cls){
  const paths=['',''];let previousSide=-1;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],z=points[i],da=project(a)[2],dz=project(z)[2];
   const side=da+dz>=0?1:0;
   if(da*dz<0){
    const f=da/(da-dz),cross=a.map((n,j)=>n+(z[j]-n)*f),first=da>=0?1:0;
    paths[first]+=`${previousSide===first?'':'M'+point(a)}L${point(cross)}`;
    paths[1-first]+=`M${point(cross)}L${point(z)}`;previousSide=1-first;
   }else{
    paths[side]+=`${previousSide===side?'':'M'+point(a)}L${point(z)}`;previousSide=side;
   }
  }
  return paths.map((d,i)=>d?`<path class="${cls} ${i?'bs-front':'bs-back'}" d="${d}"/>`:'').join('');
 }
 const ring=fn=>Array.from({length:97},(_,i)=>fn(i*Math.PI/48));
 const equator=ring(t=>[Math.cos(t),Math.sin(t),0]);
 const meridians=[ring(t=>[Math.cos(t),0,Math.sin(t)]),ring(t=>[0,Math.cos(t),Math.sin(t)])];
 const line=(v,cls)=>`<path class="${cls}" d="M${point(v.map(n=>-n))}L${point(v)}"/>`;
 const label=(v,text,cls='')=>{const p=project(v);return `<text class="bs-label ${cls}" x="${p[0]}" y="${p[1]}" text-anchor="middle">${text}</text>`;};
 const tip=project(b),dx=tip[0]-cx,dy=tip[1]-cy,len=Math.hypot(dx,dy),ux=dx/(len||1),uy=dy/(len||1);
 const head=Math.min(11,len*.45),base=[tip[0]-ux*head,tip[1]-uy*head];
 const arrowhead=len>2?`<path class="bs-arrowhead" d="M${tip[0]} ${tip[1]}L${base[0]-uy*4.5} ${base[1]+ux*4.5}L${base[0]+uy*4.5} ${base[1]-ux*4.5}Z"/>`:'';
 return `<defs><radialGradient id="${id}" cx="32%" cy="24%" r="80%"><stop class="bs-light" offset="0"/><stop class="bs-mid" offset=".65"/><stop class="bs-shade" offset="1"/></radialGradient></defs>
 <circle class="bs-shell" cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
 ${coordinates?[[1.08,0,0],[0,1.08,0]].map(v=>line(v,'bs-coordinate')).join(''):''}${line([0,0,1.08],'bs-coordinate')}
 ${meridians.map(v=>splitPath(v,'bs-grid')).join('')}${splitPath(equator,'bs-equator')}
 ${axis?line(axis.map(n=>n*1.12),'bs-axis'):''}
 ${trace&&trace.length>1?splitPath(trace,'bs-trace'):''}
 ${overlay}
 ${label([0,0,coordinates?1.22:1.25],'|0⟩','bs-pole-label')}
 ${label([0,0,coordinates?-1.29:-1.3],'|1⟩','bs-pole-label')}
 ${coordinates?label([1.27,0,0],'+x')+label([0,1.27,0],'+y'):''}
 ${coordinates&&kets?label([1.12,0,.24],'|+⟩','bs-pole-label')+label([-1.3,0,.06],'|−⟩','bs-pole-label'):''}
 ${coordinates&&kets?[1,-1].map(x=>{const p=project([x,0,0]);return `<circle class="bs-ket-point" cx="${p[0]}" cy="${p[1]}" r="2.6"/>`;}).join(''):''}
 ${[1,-1].map(z=>{const p=project([0,0,z]);return `<circle class="bs-pole" cx="${p[0]}" cy="${p[1]}" r="3.2"/>`;}).join('')}
 <path class="bs-vector-outline" d="M${cx} ${cy}L${tip[0]} ${tip[1]}"/>
 <path class="bs-vector" d="M${cx} ${cy}L${tip[0]} ${tip[1]}"/>${arrowhead}
 <circle class="bs-origin" cx="${cx}" cy="${cy}" r="3"/>
 <circle class="bs-state${tip[2]<0?' bs-state-back':''}" cx="${tip[0]}" cy="${tip[1]}" r="3.5"/>`;
}
;
/* js/interactive.js */
/* =========================================================
   组件库：每个组件向壳上报状态，过关判据写在课程数据里
   全课配色统一：pine = |0⟩ / 上路径，ochre = |1⟩ / 下路径
   ========================================================= */
const COMP={};
const put=(k,v)=>{S.carry[k]=v;};
function check(p,st){ if(p.ok&&p.ok(st)) pass(p.pm); }

/* ---------- 复数与单比特 ---------- */
const SQ=Math.SQRT1_2;
const cm=(a,b)=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const cadd=(a,b)=>({re:a.re+b.re,im:a.im+b.im});
const G1={
  H:[[{re:SQ,im:0},{re:SQ,im:0}],[{re:SQ,im:0},{re:-SQ,im:0}]],
  X:[[{re:0,im:0},{re:1,im:0}],[{re:1,im:0},{re:0,im:0}]],
  Y:[[{re:0,im:0},{re:0,im:-1}],[{re:0,im:1},{re:0,im:0}]],
  Z:[[{re:1,im:0},{re:0,im:0}],[{re:0,im:0},{re:-1,im:0}]],
  S:[[{re:1,im:0},{re:0,im:0}],[{re:0,im:0},{re:0,im:1}]],
  T:[[{re:1,im:0},{re:0,im:0}],[{re:0,im:0},{re:SQ,im:SQ}]]
};
function rot(axis,th){
  const c={re:Math.cos(th/2),im:0}, s=Math.sin(th/2);
  if(axis==='x')return [[c,{re:0,im:-s}],[{re:0,im:-s},c]];
  if(axis==='y')return [[c,{re:-s,im:0}],[{re:s,im:0},c]];
  return [[{re:Math.cos(-th/2),im:Math.sin(-th/2)},{re:0,im:0}],[{re:0,im:0},{re:Math.cos(th/2),im:Math.sin(th/2)}]];
}
function ap1(M,a){return [cadd(cm(M[0][0],a[0]),cm(M[0][1],a[1])),cadd(cm(M[1][0],a[0]),cm(M[1][1],a[1]))];}
function blochOf(a){
  const x=2*(a[0].re*a[1].re+a[0].im*a[1].im);
  const y=2*(a[0].re*a[1].im-a[0].im*a[1].re);
  const z=(a[0].re**2+a[0].im**2)-(a[1].re**2+a[1].im**2);
  return [x,y,z];
}

/* ---------- C-02 数字爆炸 ---------- */
COMP.c2=(slot,p)=>{
  slot.innerHTML=`<div class="slab"><span>${p.unit||L('量子比特数','Number of qubits')}</span><span class="num" id="nb">1</span></div>
    <input type="range" id="r" min="1" max="${p.max||300}" value="1" aria-label="${p.unit||L('量子比特数','Number of qubits')}">
    <div class="combination-result"><p class="cap">${p.stateCount?L('直接列表所需的记录项数','Entries needed to list them all'):L('开/关组合数','On/off combinations')}</p><div class="bigno" id="big"></div><div class="anchor" id="anc"></div>${p.stateCount?'<p class="cap" id="combinations"></p>':''}</div>${p.note?`<p class="studio-note">${p.note}</p>`:''}`;
  const A=[[7,L('上海的常住人口','the population of Shanghai')],
    [18,L('地球上所有沙粒的数量','all the grains of sand on Earth')],[19,L('全球人口乘以一个人一生的秒数','the world population times the seconds in a lifetime')],
    [25,L('一杯水里的水分子数','the water molecules in a glass of water')],[80,L('可观测宇宙里的全部原子','all the atoms in the observable universe')]];
  const r=slot.querySelector('#r');
  const upd=()=>{
    const n=+r.value,lg=n*Math.log10(2);
    slot.querySelector('#nb').textContent=n;
    const big=slot.querySelector('#big');
    big.innerHTML=lg<6?Math.round(2**n).toLocaleString(L('zh-CN','en-US'))
      :String.raw`$${(10**(lg-Math.floor(lg))).toFixed(1)}\times10^{${Math.floor(lg)}}$`;
    const anchor=slot.querySelector('#anc');
    // Start comparisons at the Shanghai population tier, excluding its 1/10 tier.
    anchor.hidden=!p.stateCount&&lg<6.5;
    if(p.stateCount){
      anchor.innerHTML=L(`${n} 个比特 → $2^{${n}}$ 种组合 → $2^{${n}}$ 项记录`,`${n} ${n===1?'bit':'bits'} → $2^{${n}}$ combinations → $2^{${n}}$ entries`);
      slot.querySelector('#combinations').textContent=n<=3
        ?L('组合：','Combinations: ')+Array.from({length:2**n},(_,i)=>i.toString(2).padStart(n,'0')).join(L('、',', '))+L('。每种组合对应一项记录。','. Each combination needs one entry.')
        :L('每多 1 个比特，原有的每种组合后面都可以再接 0 或 1，因此记录项数翻倍。','Each extra bit lets every existing combination end in either 0 or 1, so the number of entries doubles.');
    }else if(anchor.hidden){
      anchor.textContent='';
    }else{
      const a=A.reduce((best,x)=>Math.abs(lg-x[0])<Math.abs(lg-best[0])?x:best,A[0]);
      const gap=Math.round(lg-a[0]);
      anchor.innerHTML=gap===0?'≈ '+a[1]
        :gap>0?L(`≈ ${a[1]}的 $10^{${gap}}$ 倍`,`≈ $10^{${gap}}$ times ${a[1]}`)
        :L(`≈ ${a[1]}的 $10^{${-gap}}$ 分之一`,`≈ $1/10^{${-gap}}$ of ${a[1]}`);
    }
    typesetMath(big);typesetMath(anchor);
    put('n',n);put('lg',Math.round(lg));
    check(p,{n:n,lg:lg});
  };
  r.addEventListener('input',upd);upd();
};

/* ---------- C-05 布洛赫球 ---------- */
COMP.c5=(slot,p)=>{
  let amp=p.init?p.init.slice():[{re:1,im:0},{re:0,im:0}],hist=[],dragged=false;
  let firstEquatorAngle=null,equatorCompared=false;
  const seen=new Set();
  const list=p.gates||['H','X','Z','S','T'];
  const hasAngle=p.angle;
  slot.innerHTML=`<div class="bloch-experiment"><svg class="fig bloch-scene" id="bs" aria-label="${L('Bloch 球：拖动改变状态方向','Bloch sphere: drag to change the state direction')}" viewBox="0 0 240 236"></svg>
    <div class="bloch-panel">
    <p class="bloch-probability-title">${L('$Z$ 基测量概率','$Z$-basis measurement probabilities')}</p>
    <div class="readout">
      <div><span>${L('得到 0 的概率','Probability of 0')}</span><span class="num" id="p0">100%</span></div>
      <div><span>${L('得到 1 的概率','Probability of 1')}</span><span class="num" id="p1">0%</span></div>
      ${p.showX?`<div><span>${L('X 基下测得 +','+ in the X basis')}</span><span class="num" id="px">50%</span></div>`:''}
    </div>
    <div class="gates">${list.map(g=>`<button class="gate" data-g="${g}">${g}</button>`).join('')}
      <button class="gate" data-g="R" aria-label="${L('恢复初态','Reset to initial state')}">${list.length?'↺':L('恢复初态','Reset to initial state')}</button></div>
    ${hasAngle?`<div class="slab bloch-angle-label"><span>${L('旋转角度','Rotation angle')}</span><span class="num" id="an">90°</span></div>
      <input type="range" id="ra" min="0" max="360" value="90">`:''}
    <div class="seq" id="sq"${list.length?'':' hidden'}></div>
    </div></div>`;
  const {az:AZ,el:EL}=BLOCH_VIEW,CX=120,CY=116,R=84;
  const pr=(x,y,z)=>blochProject([x,y,z],CX,CY,R).slice(0,2);
  function draw(){
    const b=blochOf(amp);
    slot.querySelector('#bs').innerHTML=blochScene(b,{cx:CX,cy:CY,r:R,coordinates:false});
    const p0=amp[0].re**2+amp[0].im**2;
    const pxp=(1+b[0])/2;
    slot.querySelector('#p0').textContent=(p0*100).toFixed(1)+'%';
    slot.querySelector('#p1').textContent=((1-p0)*100).toFixed(1)+'%';
    if(p.showX)slot.querySelector('#px').textContent=(pxp*100).toFixed(1)+'%';
    slot.querySelector('#sq').innerHTML=L('线路：','Circuit: ')+'<b>'+(hist.length?hist.join(' → '):L('（空）','(empty)'))+'</b>';
    typesetMath(slot);
    put('seq',hist.join(' → ')||L('（空）','(empty)'));put('p0',(p0*100).toFixed(0));
    check(p,{p0:p0,px:pxp,b:b,hist:hist,n:hist.length,dragged:dragged,seen:[...seen],equatorCompared:equatorCompared});
  }
  slot.querySelectorAll('.gate').forEach(btn=>btn.onclick=()=>{
    const g=btn.dataset.g;
    if(g==='R'){amp=p.init?p.init.slice():[{re:1,im:0},{re:0,im:0}];hist=[];}
    else if(hasAngle&&(g==='Rx'||g==='Ry'||g==='Rz')){
      const th=(+slot.querySelector('#ra').value)*Math.PI/180;
      amp=ap1(rot(g[1],th),amp);hist.push(g+'('+slot.querySelector('#ra').value+'°)');seen.add(g);
    } else {amp=ap1(G1[g],amp);hist.push(g);seen.add(g);}
    if(hist.length>9)hist.shift();draw();
  });
  if(hasAngle)slot.querySelector('#ra').addEventListener('input',e=>{slot.querySelector('#an').textContent=e.target.value+'°';});
  const svg=slot.querySelector('#bs');let drag=false,pointerId=null;
  function stateAtPointer(e){
    const box=svg.getBoundingClientRect(),scale=box.width/240;
    const sx=(e.clientX-box.left)/scale,sy=(e.clientY-box.top)/scale;
    // Hit-test the same projected geometry that is drawn above. A small
    // screen-space tolerance makes the equator and poles reachable by touch.
    const tolerance=5/scale;
    for(const z of [1,-1]){
      const [px,py]=pr(0,0,z);
      // The labels sit beyond the projected poles. Treat the short axis
      // corridor out through each label as the same endpoint, including
      // overshoot, instead of clamping it to a different sphere state.
      const poleTolerance=10/scale;
      if(Math.abs(sx-px)<=poleTolerance&&z*(py-sy)>=-poleTolerance)return [0,0,z];
    }
    const azimuth=Math.atan2((sy-CY)/Math.sin(EL),sx-CX);
    const phi=azimuth-AZ,eq=[Math.cos(phi),Math.sin(phi),0];
    const [ex,ey]=pr(...eq);
    if(Math.hypot(sx-ex,sy-ey)<=tolerance)return eq;
    // Invert the orthographic projection. Each interior point has two
    // sphere intersections; retain the side closest to the previous state.
    let u=(sx-CX)/R,v=(CY-sy)/R;
    const radius=Math.hypot(u,v);
    if(radius>1){u/=radius;v/=radius;}
    const depth=Math.sqrt(Math.max(0,1-u*u-v*v));
    const candidates=[depth,-depth].map(w=>{
      const yr=-v*Math.sin(EL)+w*Math.cos(EL);
      return [u*Math.cos(AZ)+yr*Math.sin(AZ),-u*Math.sin(AZ)+yr*Math.cos(AZ),v*Math.cos(EL)+w*Math.sin(EL)];
    });
    const previous=blochOf(amp),score=b=>b.reduce((sum,n,i)=>sum+n*previous[i],0);
    return score(candidates[0])>=score(candidates[1])?candidates[0]:candidates[1];
  }
  if(p.drag!==false){
    svg.addEventListener('pointerdown',e=>{if(drag||e.button!==0)return;drag=true;pointerId=e.pointerId;svg.setPointerCapture(e.pointerId);});
    svg.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pointerId)return;
      const b=stateAtPointer(e),z=Math.max(-1,Math.min(1,b[2])),ph=Math.atan2(b[1],b[0]);
      const a=Math.sqrt((1+z)/2),r=Math.sqrt((1-z)/2);
      amp=[{re:a,im:0},{re:r*Math.cos(ph),im:r*Math.sin(ph)}];
      if(Math.abs(z)<0.08){
        if(firstEquatorAngle===null)firstEquatorAngle=ph;
        else if(Math.abs(Math.atan2(Math.sin(ph-firstEquatorAngle),Math.cos(ph-firstEquatorAngle)))>0.25)equatorCompared=true;
      }
      hist=[];dragged=true;draw();});
    ['pointerup','pointercancel','lostpointercapture'].forEach(k=>svg.addEventListener(k,e=>{if(e.pointerId===pointerId){drag=false;pointerId=null;}}));
  }
  draw();
};

/* ---------- 双比特模拟内核 ---------- */
function st2(){return [{re:1,im:0},{re:0,im:0},{re:0,im:0},{re:0,im:0}];}
function ap2(st,g){
  const n=st.map(c=>({re:c.re,im:c.im}));
  const one=(q,M)=>{
    const o=n.map(c=>({re:c.re,im:c.im}));
    const bit=q===0?2:1;
    for(let k=0;k<4;k++){
      if(k&bit)continue;
      const k0=k,k1=k|bit;
      o[k0]=cadd(cm(M[0][0],n[k0]),cm(M[0][1],n[k1]));
      o[k1]=cadd(cm(M[1][0],n[k0]),cm(M[1][1],n[k1]));
    }
    return o;};
  if(g==='CNOT'){const o=n.slice();const t=o[2];o[2]=o[3];o[3]=t;return o;}
  if(g==='CZ'){const o=n.slice();o[3]={re:-o[3].re,im:-o[3].im};return o;}
  const q=+g.slice(-1),name=g.slice(0,-1);
  return one(q,G1[name]);
}

/* ---------- 主流硬件路线：实物照片与实验成像 ---------- */
const hardwarePhoto=(file,alt,width,height,caption,kind='')=>`<figure class="hardware-photo ${kind}">
  <img src="assets/illustrations/${file}" alt="${alt}" width="${width}" height="${height}">
  <figcaption>${caption}</figcaption>
</figure>`;
const ROUTE_ART={
  fridgePhoto:()=>`<figure class="hardware-photo">
    <img src="assets/illustrations/ibm-quantum-hardware.jpg" alt="${L('超导量子计算机中的金色多层装置，层间连接着许多线缆。','The gold, multi-tiered assembly inside a superconducting quantum computer, with many cables running between the tiers.')}" width="670" height="1023">
    <figcaption><a href="https://www.flickr.com/photos/ibm_research_zurich/26774599148/" target="_blank" rel="noopener noreferrer">IBM Quantum Dilution Refrigerator (interior)</a>${L('。摄影：Graham Carlow for IBM，发布：IBM Research。','. Photo: Graham Carlow for IBM; published by IBM Research. ')}<a href="https://creativecommons.org/licenses/by-nd/2.0/" target="_blank" rel="noopener noreferrer">CC BY-ND 2.0</a>${L('；原图等比例展示。','; shown at original proportions.')}</figcaption>
  </figure>`,
  ion:()=>hardwarePhoto('nist-ion-trap.webp',L('NIST 离子阱实物：金色电极和连接线汇聚到中央囚禁区域。','A real NIST ion trap: gold electrodes and wires converge on the central trapping region.'),960,666,
    L('<a href="https://www.nist.gov/image/ion-trap-1" target="_blank" rel="noopener noreferrer">Ion Trap</a>。图片：Blakestad/NIST。依据 <a href="https://www.nist.gov/copyrights-disclaimers" target="_blank" rel="noopener noreferrer">NIST 公开信息使用政策</a>使用。',
      '<a href="https://www.nist.gov/image/ion-trap-1" target="_blank" rel="noopener noreferrer">Ion Trap</a>. Image: Blakestad/NIST. Used under the <a href="https://www.nist.gov/copyrights-disclaimers" target="_blank" rel="noopener noreferrer">NIST public information policy</a>.')),
  atom:()=>hardwarePhoto('cesium-optical-tweezer-array.png',L('铯原子阵列的真实荧光成像：亮点呈规则网格排列，显示激光光阱中原子的分布；图像经过多次平均和伪彩色处理。','A real fluorescence image of a cesium atom array: bright dots in a regular grid show where atoms sit in the laser traps. The image is averaged over many shots and false-colored.'),643,644,
    L('<a href="https://commons.wikimedia.org/wiki/File:1225_site_cold_cesium_atom_array.png" target="_blank" rel="noopener noreferrer">1225 site cold cesium atom array</a>。作者：Preston Huft。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；原图等比例展示，平均与伪彩色处理来自原作者。',
      '<a href="https://commons.wikimedia.org/wiki/File:1225_site_cold_cesium_atom_array.png" target="_blank" rel="noopener noreferrer">1225 site cold cesium atom array</a>. Author: Preston Huft. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>; shown at original proportions. Averaging and false color by the original author.'),'hardware-atom-photo'),
  silicon:()=>hardwarePhoto('silicon-six-qubit-device.jpg',L('硅基量子点器件的伪彩色扫描电镜图：一排金属栅极在硅中形成 6 个量子点（标号 1–6），两端是用于读出的传感点 SD1、SD2，上方覆盖微磁体。','False-color electron micrograph of a silicon quantum-dot device: a row of metal gates forms 6 quantum dots in the silicon (labeled 1–6), with readout sensor dots SD1 and SD2 at the ends and a micromagnet on top.'),1140,566,
    L('硅量子点六比特处理器（与实验所用器件同款）的伪彩色电镜图。© 2022 <span data-no-math>S. G. J. Philips</span> et al.，<a href="https://doi.org/10.1038/s41586-022-05117-x" target="_blank" rel="noopener noreferrer">Universal control of a six-qubit quantum processor in silicon</a>，Nature 609, 919–924 (2022)，图 1。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；局部视图取自图 1(a)，保留原图标注。',
      'False-color electron micrograph of a six-qubit silicon quantum-dot processor (same design as the one used in the experiment). © 2022 <span data-no-math>S. G. J. Philips</span> et al., <a href="https://doi.org/10.1038/s41586-022-05117-x" target="_blank" rel="noopener noreferrer">Universal control of a six-qubit quantum processor in silicon</a>, Nature 609, 919–924 (2022), Fig. 1. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>; detail from Fig. 1(a), original labels kept.')),
  photon:()=>`<figure class="hardware-photo">
    <div class="hardware-photon-detail">
      <img src="assets/illustrations/quix-photonic-processor-figure.jpg" alt="${L('QuiX 光子处理器实物近照：光纤阵列连接中央光子芯片，周围是控制电路与温控组件。原图标有光纤阵列、印刷电路板、驱动器和温控元件。','Close-up of the QuiX photonic processor: a fiber array connects to the central photonic chip, surrounded by control electronics and temperature-control parts. The original figure labels the fiber array, printed circuit board, drivers and temperature-control elements.')}" width="1166" height="773">
    </div>
    <figcaption>${L('QuiX 光子处理器。© 2021 C. Taballione et al.，','QuiX photonic processor. © 2021 C. Taballione et al., ')}<a href="https://doi.org/10.1088/2633-4356/ac168c" target="_blank" rel="noopener noreferrer">A universal fully reconfigurable 12-mode quantum photonic processor</a>${L('，Materials for Quantum Technology 1, 035002 (2021)，图 1。',', Materials for Quantum Technology 1, 035002 (2021), Fig. 1. ')}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>${L('；局部视图取自图 1(c)，保留原图标注。','; detail from Fig. 1(c), original labels kept.')}</figcaption>
  </figure>`
};
;
/* js/qubit.js */
/* L02 guided experiments. Pure-state Bloch vectors; all samples are browser simulations.
   Sessions are per lesson and experiment, so moving between prompts never resamples. */
// Outside the browser (model checks) i18n.js may not be loaded; fall back to the Chinese source text.
if(typeof globalThis.L!=='function')globalThis.L=zh=>zh;
const QUBIT={sessions:{},epoch:0};
const QB_STATES={
 zero:{ket:'|0⟩',b:[0,0,1],name:'|0⟩，确定态',formula:String.raw`|0\rangle`},
 one:{ket:'|1⟩',b:[0,0,-1],name:'|1⟩，确定态',formula:String.raw`|1\rangle`},
 plus:{ket:'|+⟩',b:[1,0,0],name:'+x，叠加态',formula:String.raw`\frac{|0\rangle+|1\rangle}{\sqrt2}`},
 minus:{ket:'|−⟩',b:[-1,0,0],name:'−x，叠加态',formula:String.raw`\frac{|0\rangle-|1\rangle}{\sqrt2}`},
 yplus:{ket:'|+i⟩',b:[0,1,0],name:'+y，叠加态',formula:String.raw`\frac{|0\rangle+i|1\rangle}{\sqrt2}`},
 weighted:{b:[.96,0,-.28],name:'偏向 1，36% / 64%',formula:String.raw`\frac35|0\rangle+\frac45|1\rangle`},
 tilted:{b:[Math.sqrt(3)/2,0,.5],name:'北半球，75% / 25%',formula:String.raw`\frac{\sqrt3}{2}|0\rangle+\frac12|1\rangle`}
};
const QB_AXES={X:[1,0,0],Y:[0,1,0],Z:[0,0,1],H:[Math.SQRT1_2,0,Math.SQRT1_2]};
function qbRotate(b,axis,angle=Math.PI){
 const c=Math.cos(angle),s=Math.sin(angle),d=b.reduce((v,x,i)=>v+x*axis[i],0);
 const cross=[axis[1]*b[2]-axis[2]*b[1],axis[2]*b[0]-axis[0]*b[2],axis[0]*b[1]-axis[1]*b[0]];
 return b.map((v,i)=>v*c+cross[i]*s+axis[i]*d*(1-c)).map(v=>Math.abs(v)<1e-12?0:v);
}
function qbProbability(b){return Math.max(0,Math.min(1,(1+b[2])/2));}
function qbMeasure(b,random=Math.random){const value=random()<qbProbability(b)?0:1;return {value,b:[0,0,value===0?1:-1]};}
function qbSample(b,n=32,random=Math.random){const counts=[0,0];for(let i=0;i<n;i++)counts[qbMeasure(b,random).value]++;return counts;}
function qbMeasureSeries(initial,reprepare,n=12,random=Math.random){
 let b=initial.slice();const values=[];
 for(let i=0;i<n;i++){const r=qbMeasure(reprepare?initial:b,random);values.push(r.value);b=r.b;}
 return {values,b};
}
function qbNewModel(p){
 const b=QB_STATES[p.init||'zero'].b.slice();
 return {b,prepared:p.init||'zero',seq:[],counts:null,first:null,values:[],runs:0,axis:p.axis||null,trace:null,
  pair:p.phasePreparation?[[1,0,0],[1,0,0]]:p.pair==='phase'?[[1,0,0],[-1,0,0]]:[[0,0,1],[0,0,1]],pairCounts:null,stage:0,shots:p.shots||32};
}
function qbUndoGate(m,p){
 if(!m.seq.length)return false;
 m.seq.pop();m.b=QB_STATES[m.prepared].b.slice();m.axis=p.axis||null;m.trace=null;
 for(const gate of m.seq){
  const initial=m.b,axis=QB_AXES[gate];
  m.b=qbRotate(initial,axis);m.axis=gate;
  m.trace=Array.from({length:49},(_,i)=>qbRotate(initial,axis,i*Math.PI/48));
 }
 m.counts=null;m.first=null;m.runs=Math.max(0,m.runs-1);
 return true;
}
function qbProject(b){return blochProject(b).slice(0,2);}
function qbPath(points){return points.map((b,i)=>`${i?'L':'M'}${qbProject(b).map(v=>v.toFixed(2)).join(' ')}`).join(' ');}
function qbSphere(b,axisName=null,trace=null,angles=false,showMeasurement=true){
 return `<svg class="qb-sphere bloch-scene" viewBox="0 0 300 286" role="img" aria-label="${L(`Bloch 球${showMeasurement?'，当前 Z 基测得 0 的概率 '+(qbProbability(b)*100).toFixed(1)+'%':'，箭头表示当前量子态'}${axisName?'，高亮 '+axisName+' 门旋转轴':''}`,`Bloch sphere${showMeasurement?', current Z-basis probability of 0: '+(qbProbability(b)*100).toFixed(1)+'%':', the arrow shows the current quantum state'}${axisName?', highlighting the '+axisName+' gate rotation axis':''}`)}">
 ${blochScene(b,{axis:QB_AXES[axisName],trace,overlay:angles?qbAngleArcs(b):'',kets:qbKetsIntroduced()})}</svg>`;
}
function qbAngleArcs(b){
 const theta=Math.acos(Math.max(-1,Math.min(1,b[2]))),phi=Math.atan2(b[1],b[0]);
 if(Math.abs(Math.sin(theta))<1e-8)return '';
 const polar=Array.from({length:33},(_,i)=>{const t=theta*i/32;return [.62*Math.sin(t)*Math.cos(phi),.62*Math.sin(t)*Math.sin(phi),.62*Math.cos(t)];});
 const azimuth=Array.from({length:33},(_,i)=>{const t=phi*i/32;return [.72*Math.cos(t),.72*Math.sin(t),0];});
 const tag=(point,label)=>{const [x,y]=qbProject(point);return `<text class="qb-angle-label" x="${x+7}" y="${y-7}">${label}</text>`;};
 return `<path class="qb-angle-polar" d="${qbPath(polar)}"/>${tag(polar[16],'θ')}<path class="qb-angle-azimuth" d="${qbPath(azimuth)}"/>${Math.abs(phi)>.01?tag(azimuth[16],'φ'):''}`;
}
function qbStateFormula(b){
 const match=Object.values(QB_STATES).find(s=>s.b.every((v,i)=>Math.abs(v-b[i])<1e-9));
 if(match)return match.formula;
 const p=qbProbability(b),phi=Math.atan2(b[1],b[0]);
 return String.raw`${Math.sqrt(p).toFixed(3)}|0\rangle+e^{i(${phi.toFixed(3)})}${Math.sqrt(1-p).toFixed(3)}|1\rangle`;
}
function qbReadout(b,counts,basis=L("直接测量 0/1（Z 基测量）","direct 0/1 measurement (Z basis)"),showSamples=true,first=null,shots=32){
 const p=qbProbability(b),pct=v=>(100*v).toFixed(v===0||v===1?0:1)+'%';
 return `<div class="qb-probabilities"><p class="qb-label">${L(`${basis}的理论概率`,`Theoretical probabilities for ${basis}`)}</p>${[p,1-p].map((v,i)=>`<div class="qb-prob"><span>${L(`结果 ${i}`,`Outcome ${i}`)}</span><strong>${pct(v)}</strong><span class="qb-meter"><span style="--probability:${v*100}%"></span></span></div>`).join('')}</div>
 ${showSamples?`<div class="qb-counts"><span>${L('模拟测量结果','Simulated outcomes')}</span><strong>${counts?L(`0：${counts[0]} 次　1：${counts[1]} 次`,`0: ${counts[0]} times　1: ${counts[1]} times`):L('尚未抽样','Not sampled yet')}</strong>${first!==null?`<small>${L(`本批第 1 次结果：${first}`,`First outcome in this batch: ${first}`)}</small>`:''}${counts?`<small>${L(`每次恢复图中初态后测量，共 ${shots} 次`,`Each shot resets to the initial state shown, then measures; ${shots} shots in total`)}</small>`:''}</div>`:''}`;
}
function qbMath(m,details){
 const b=m.b,theta=Math.acos(Math.max(-1,Math.min(1,b[2])))*180/Math.PI;
 const pole=Math.abs(b[2])>1-1e-10,phi=(Math.atan2(b[1],b[0])*180/Math.PI+360)%360;
 return (details?L(String.raw`<div class="qb-formula-map"><p><strong>同一个物理状态，两种写法</strong></p><div>$$|\psi\rangle=a|0\rangle+b|1\rangle$$</div><div>$$|\psi\rangle=\cos\frac{\theta}{2}|0\rangle+e^{i\phi}\sin\frac{\theta}{2}|1\rangle$$</div><p>$|a|=\cos(\theta/2)$，$|b|=\sin(\theta/2)$。两式都满足 $|a|^2+|b|^2=1$。</p><p>θ 从北极量起，决定南北位置与直接测量概率；φ 绕南北轴量起，表示两个非零概率幅的相对相位。</p><p>当前 θ = ${theta.toFixed(1)}°；${pole?'位于极点，一个概率幅为零，φ 不再区分状态。':'φ = '+phi.toFixed(1)+'°。'}</p><p>$P(0)=\cos^2(\theta/2)$，$P(1)=\sin^2(\theta/2)$。</p><p>$e^{i\phi}$ 的模为 1，只改变相位，不改变概率幅的大小。$i$ 是虚数单位，满足 $i^2=-1$。</p><p class="qb-caption">这里省略了不影响测量结果的整体相位。</p></div>`,String.raw`<div class="qb-formula-map"><p><strong>One physical state, two ways to write it</strong></p><div>$$|\psi\rangle=a|0\rangle+b|1\rangle$$</div><div>$$|\psi\rangle=\cos\frac{\theta}{2}|0\rangle+e^{i\phi}\sin\frac{\theta}{2}|1\rangle$$</div><p>$|a|=\cos(\theta/2)$, $|b|=\sin(\theta/2)$. Both forms satisfy $|a|^2+|b|^2=1$.</p><p>θ is measured from the north pole and sets the north–south position and the direct-measurement probabilities. φ is measured around the north–south axis and gives the relative phase between the two nonzero amplitudes.</p><p>Now θ = ${theta.toFixed(1)}°; ${pole?'at a pole, one amplitude is zero, so φ no longer tells states apart.':'φ = '+phi.toFixed(1)+'°.'}</p><p>$P(0)=\cos^2(\theta/2)$, $P(1)=\sin^2(\theta/2)$.</p><p>$e^{i\phi}$ has magnitude 1: it changes only the phase, not the size of the amplitude. $i$ is the imaginary unit, with $i^2=-1$.</p><p class="qb-caption">The global phase, which does not affect measurement outcomes, is omitted here.</p></div>`):'');
}
// One live line for the interactive page; the two notations themselves are explained on the page before it.
function qbAngleReadout(m){
 const b=m.b,theta=Math.acos(Math.max(-1,Math.min(1,b[2])))*180/Math.PI;
 const pole=Math.abs(b[2])>1-1e-10,phi=(Math.atan2(b[1],b[0])*180/Math.PI+360)%360;
 return `<p class="qb-angle-readout">θ = ${theta.toFixed(0)}°${L('，',', ')}${pole?L('在极点上，φ 不影响状态','at a pole, φ makes no difference'):'φ = '+phi.toFixed(0)+'°'}</p>`;
}
// Reusable experiment component inside the same R.add/play shell as other chapters.
COMP.qubit=(slot,p)=>{
 const lesson=S.lesson,step=S.i,epoch=++QUBIT.epoch;
 const showMeasurement=p.showMeasurement!==false;
 const showSamples=showMeasurement&&p.sample!==false&&p.kind!=='formula';
 const session=QUBIT.sessions[lesson.id]||(QUBIT.sessions[lesson.id]={models:{},performed:{}});
 let m=session.models[p.key]||(session.models[p.key]=qbNewModel(p)),busy=false,busyTarget='';
 slot.innerHTML='<section class="qb-experiment"><div id="qb-workspace" aria-label="'+L('实验区','Experiment area')+'"></div><div id="qb-feedback" aria-live="polite"></div></section>';
 const work=slot.querySelector('#qb-workspace'),feedback=slot.querySelector('#qb-feedback');
 const valid=()=>epoch===QUBIT.epoch&&slot.isConnected&&S.lesson===lesson&&S.i===step;
 const oneShot=()=>p.phasePreparation||(p.kind==='compare'&&!showSamples);
 const update=()=>{
  const performed=!!session.performed[step]&&(!p.minGates||m.seq.length>=p.minGates)&&(!p.requiredSequence||p.requiredSequence.every((g,i)=>m.seq[i]===g));
  const ready=!p.required||performed;
  work.querySelectorAll('button,select').forEach(b=>b.disabled=busy);
  if(busy&&busyTarget){
   const button=work.querySelector(busyTarget);
   if(button)CourseUI.beginButtonBusy(button,L('正在施加量子门','Applying the gate'),{iconOnly:true});
  }
  const undo=work.querySelector('[data-undo]');if(undo)undo.disabled=busy||!m.seq.length;
  // A one-shot comparison (no sampling) is finished once the gate is applied; clicking again would
  // look like a second H. "恢复初态" remains available to run it again from the start.
  const run=work.querySelector('[data-run]');if(run&&!busy&&oneShot()&&m.stage>0)run.disabled=true;
  document.getElementById('back').disabled=busy;
  go(L('继续','Continue'),ready&&!busy);
  S.gateOK=ready&&!busy;
  if(S.gateOK)S.passed[step]=true;else delete S.passed[step];
  const pending=p.phasePreparation?'':p.requiredSequence?L('从初态按 '+p.requiredSequence.join(' → ')+' 操作；顺序不符时可恢复初态。','From the initial state, apply '+p.requiredSequence.join(' → ')+' in order. If the order goes wrong, reset to the initial state.'):p.minGates?L('连续操作 '+p.minGates+' 次，再观察结果。','Apply '+p.minGates+' gates in a row, then look at the result.'):'';// the task line already says what to do
  hint(busy?L('正在施加量子门…','Applying the gate…'):ready?'':pending);
  feedback.innerHTML=p.explain&&ready?`<p>${p.explain}</p>`:'';
  typesetMath(feedback);
 };
 function performed(){session.performed[step]=true;m.runs++;}
 function liveReadout(panel,b){
  const p0=qbProbability(b);
  panel.querySelectorAll('.qb-prob').forEach((row,i)=>{const v=i?1-p0:p0;row.querySelector('strong').textContent=(100*v).toFixed(v===0||v===1?0:1)+'%';row.querySelector('.qb-meter>span').style.setProperty('--probability',(100*v)+'%');});
 }
 function drawFigures(vectors,axis,trace){
  if(p.probabilityOnly)work.querySelectorAll('.qb-pair').forEach((panel,i)=>liveReadout(panel,vectors[i]));
  const panels=work.querySelectorAll('[data-figure]');
  panels.forEach((node,i)=>{const b=vectors[i]||vectors[0];node.innerHTML=qbSphere(b,axis,Array.isArray(trace?.[0]?.[0])?trace[i]:trace,false,showMeasurement);typesetMath(node);liveReadout(node.closest('.qb-pair')||work,b);});
 }
 async function animate(vectors,gate){
  work.querySelectorAll('.qb-formula').forEach(node=>node.hidden=true);
  const axis=QB_AXES[gate],reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const final=vectors.map(v=>qbRotate(v,axis)),paths=vectors.map(v=>Array.from({length:49},(_,j)=>qbRotate(v,axis,j*Math.PI/48)));
  if(reduced){drawFigures(final,gate,paths);return valid();}
  return new Promise(resolve=>{let start=null;function frame(now){
   if(!valid()){resolve(false);return;}
   if(start===null)start=now;
   const fraction=Math.min(1,(now-start)/750),angle=Math.PI*(.5-.5*Math.cos(Math.PI*fraction));
   const samples=Math.max(2,Math.ceil(48*angle/Math.PI)+1);
   const trails=vectors.map(v=>Array.from({length:samples},(_,j)=>qbRotate(v,axis,angle*j/(samples-1))));
   drawFigures(vectors.map(v=>qbRotate(v,axis,angle)),gate,trails);
   if(fraction<1)requestAnimationFrame(frame);else resolve(true);
  }requestAnimationFrame(frame);});
 }
 function paint(){
  const openDetails=[...work.querySelectorAll('.qb-details')].map(d=>d.open);
  const sphere=['sphere','gates','formula'].includes(p.kind),compare=p.kind==='compare';
  const presetLabels={zero:'|0⟩',one:'|1⟩',plus:'$|+\\rangle$',minus:'$|-\\rangle$',yplus:'φ = 90°',weighted:L('3/5 与 4/5','3/5 and 4/5'),tilted:L('北半球','Northern hemisphere')};
  const presets=p.presets?`<div class="qb-presets" role="group" aria-label="${L('准备预设态','Prepare a preset state')}">${p.presets.map(s=>`<button data-preset="${s}" aria-pressed="${s===m.prepared}">${presetLabels[s]}</button>`).join('')}</div>`:'';
  const inlineReset=!!p.gates?.length&&!showSamples;
  const reset=`<button class="qb-action qb-secondary qb-reset" data-reset${inlineReset?L(' title="恢复初态" aria-label="重置：恢复初态"',' title="Reset to initial state" aria-label="Reset: back to the initial state"'):''}>${inlineReset?L('重置','Reset'):p.kind==='formula'?L('恢复默认状态','Restore default state'):showSamples?L('重新开始本实验','Restart this experiment'):L('恢复初态','Reset to initial state')}</button>`;
  const undo=inlineReset?L('<button class="qb-action qb-secondary qb-reset" data-undo title="撤销上一步" aria-label="撤销上一步">撤销</button>','<button class="qb-action qb-secondary qb-reset" data-undo title="Undo last step" aria-label="Undo last step">Undo</button>'):'';
  const gates=p.gates?.length?`<div class="qb-gates${inlineReset&&p.gates.length===1?' qb-gates-single':''}">${p.gates.map(g=>`<button class="qb-action" data-gate="${g}">${L(`${g} 门`,`${g} gate`)}</button>`).join('')}${undo}${inlineReset?reset:''}</div>`:'';
  let body='';
  if(compare){
   const labels=p.phasePreparation?[L('A 当前：$|+\\rangle$','A now: $|+\\rangle$'),m.stage?L('B 当前：$|-\\rangle$','B now: $|-\\rangle$'):L('B 当前：$|+\\rangle$','B now: $|+\\rangle$')]:p.probabilityOnly?[L('A 初态：$|+\\rangle$','A initial: $|+\\rangle$'),L('B 初态：$|-\\rangle$','B initial: $|-\\rangle$')]:p.pair==='phase'?[L('A：$|+\\rangle$（+x）','A: $|+\\rangle$ (+x)'),L('B：$|-\\rangle$（−x）','B: $|-\\rangle$ (−x)')]:[L('A：H → H','A: H → H'),L('B：H → Z → H','B: H → Z → H')];
   const progress=p.phasePreparation?(m.stage?L('B 已施加 Z；A 保持原态','Z applied to B; A unchanged'):L('两组都处于同相叠加态','Both are in the in-phase superposition')):p.pair==='phase'?'':[L('尚未加门','No gates yet'),L('两组都完成第一个 H','Both have had the first H'),L('A 保持原态，B 完成 Z','A unchanged; B has had Z'),L('两组都完成最后一个 H','Both have had the last H')][m.stage];
   body=`<div class="qb-comparison">${m.pair.map((b,i)=>`<div class="qb-pair"><h2>${labels[i]}</h2>${p.probabilityOnly?'':`<div data-figure="${i}">${qbSphere(b,p.pair==='circuit'&&m.stage===2&&i===0?null:m.axis)}</div>`}${p.phasePreparation?`<p class="qb-phase-signs">${L('|0⟩ 分量：＋<br>|1⟩ 分量：','|0⟩ component: +<br>|1⟩ component: ')}${b[0]<0?'−':L('＋','+')}</p>`:''}${qbMath({b},false)}${qbReadout(b,m.pairCounts?.[i],p.pair==='phase'?L('直接测量','direct measurement'):L('直接测量 0/1（Z 基测量）','direct 0/1 measurement (Z basis)'),showSamples)}</div>`).join('')}</div>${progress?`<p class="qb-sequence">${progress}</p>`:''}`;
  }else if(p.kind==='formula'){
   body=qbSphere(m.b,m.axis,m.trace,p.mathDetails,showMeasurement);
  }else if(p.kind==='measurement'){
   const same=p.mode==='consecutive';
   body=`<p class="qb-experiment-name">${same?L('只准备一次 → 连续测量 12 次','Prepare once → measure 12 times in a row'):L('每次准备 → 测量，重复 12 次','Prepare → measure, repeated 12 times')}</p><div class="qb-state-flow"><span>${L('初态','Initial state')}<br><strong>${L('叠加态','Superposition')}</strong></span><span aria-hidden="true">→</span><span>${L('最后一次测量后','After the last measurement')}<br><strong>${m.values.length?'|'+m.values.at(-1)+'⟩':L('尚未测量','Not measured yet')}</strong></span></div><div class="qb-state-grid"><div>${qbSphere(m.b)}</div><div>${qbMath(m,false)}${qbReadout(m.b,null,L('下一次直接测量','the next direct measurement'),false)}</div></div><ol class="qb-outcomes" aria-label="${L('按时间排列的 12 次测量结果','12 measurement outcomes in time order')}">${m.values.length?m.values.map((v,i)=>`<li aria-label="${L(`第 ${i+1} 次：${v}`,`Measurement ${i+1}: ${v}`)}">${v}</li>`).join(''):L('<li class="qb-empty">等待实验</li>','<li class="qb-empty">Waiting for the experiment</li>')}</ol><p class="qb-caption">${same?L('首次结果随机；此后不加操作，沿用测后的状态。','The first outcome is random. After that, with no operations in between, the post-measurement state carries over.'):L('每次都恢复相同叠加态，然后独立抽样。','Each time, the same superposition is prepared again and sampled independently.')}</p>`;
  }else{
   const simple=QB_STATES[m.prepared].name.split('，');
   const details=(p.showFormula?qbMath(m,false):'')+(showMeasurement?qbReadout(m.b,m.counts,L('直接测量 0/1','direct 0/1 measurement'),showSamples,m.first,m.shots):'');
   body=`<div class="qb-state-grid${details?'':' qb-state-grid-solo'}"><div${p.kind==='gates'?' class="qb-gate-visual"':''}>${sphere?`<div data-figure="0">${qbSphere(m.b,m.axis,m.trace,p.mathDetails,showMeasurement)}</div>`:`<div class="qb-state-name"><strong>${simple[1]==='叠加态'?L('叠加态','Superposition'):simple[0]}</strong><span>${simple[1]==='叠加态'?L('0/1 测量各半','Measuring 0/1: 50/50'):L('0/1 测量结果确定','Measuring 0/1: certain outcome')}</span></div>`}${p.kind==='gates'?gates:''}</div>${details?`<div>${details}</div>`:''}</div>`;
  }
  const runLabel=oneShot()&&m.stage>0?(p.phasePreparation?L('已给 B 施加 Z','Z applied to B'):L('已给两组施加 H','H applied to both')):p.phasePreparation?L('只给 B 施加 Z','Apply Z to B only'):compare?(showSamples?L('运行两组实验','Run both experiments'):L('给两组状态施加 H','Apply H to both states')):p.kind==='measurement'?L('运行 12 次测量','Run 12 measurements'):L(`恢复初态并测量 ${m.shots} 次`,`Reset and measure ${m.shots} times`);
  const shots=showSamples&&p.shotOptions?`<label class="qb-shots">${L('重复次数 ','Shots ')}<select data-shots>${p.shotOptions.map(n=>`<option value="${n}"${m.shots===n?' selected':''}>${L(`${n} 次`,`${n} shots`)}</option>`).join('')}</select></label>`:'';
  const circuit=p.kind==='gates'?labCircuit({n:1,seq:m.seq,static:true,initialLabel:QB_STATES[m.prepared].ket||L('初态','Initial')}):'';
  work.innerHTML=body+presets+shots+(p.kind==='gates'?'':gates)+(compare||showSamples||!inlineReset?`<div class="qb-controls">${compare||showSamples?`<button class="qb-action${p.kind==='gates'?' qb-secondary':''}" data-run>${runLabel}</button>`:''}${inlineReset?'':reset}</div>`:'')+circuit+(p.kind==='formula'?(p.formulaNotes===false?qbAngleReadout(m):qbMath(m,p.mathDetails)):'');
  typesetMath(work);
  work.querySelectorAll('.qb-details').forEach((d,i)=>d.open=!!openDetails[i]);
  const shotSelect=work.querySelector('[data-shots]');if(shotSelect)shotSelect.onchange=()=>{m.shots=Number(shotSelect.value);m.counts=null;m.first=null;paint();work.querySelector('[data-shots]').focus();};
  work.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
   m.prepared=b.dataset.preset;m.b=QB_STATES[m.prepared].b.slice();m.counts=null;m.first=null;m.trace=null;m.seq=[];paint();
  });
  work.querySelector('[data-reset]').onclick=()=>{
   m=session.models[p.key]=qbNewModel(p);
   lesson.pages.forEach((step,i)=>{if(step.key===p.key){delete session.performed[i];delete S.passed[i];}});
   COMP.qubit(slot,p);
  };
  const undoButton=work.querySelector('[data-undo]');
  if(undoButton)undoButton.onclick=()=>{
   if(busy||!qbUndoGate(m,p))return;
   lesson.pages.forEach((page,i)=>{if(page.key===p.key){delete S.passed[i];if(!m.seq.length)delete session.performed[i];}});
   paint();
   work.querySelector(m.seq.length?'[data-undo]':'[data-gate]').focus();
  };
  work.querySelectorAll('[data-gate]').forEach(b=>b.onclick=async()=>{
   if(busy)return;
   busyTarget=`[data-gate="${b.dataset.gate}"]`;
   busy=true;update();const gate=b.dataset.gate,initial=m.b.slice();m.counts=null;m.first=null;m.axis=gate;paint();
   if(!await animate([initial],gate))return;
   m.b=qbRotate(initial,QB_AXES[gate]);m.axis=gate;m.trace=Array.from({length:49},(_,i)=>qbRotate(initial,QB_AXES[gate],i*Math.PI/48));
   m.seq.push(gate);m.counts=null;performed();busy=false;paint();
  });
  const run=work.querySelector('[data-run]');
  if(run)run.onclick=async()=>{
   if(busy)return;
   busyTarget='[data-run]';
   busy=true;update();
   if(p.phasePreparation){
    m.pair=[[1,0,0],qbRotate([1,0,0],QB_AXES.Z)];m.stage=1;m.axis='Z';
   }else if(compare){
    m.pair=p.pair==='phase'?[[1,0,0],[-1,0,0]]:[[0,0,1],[0,0,1]];m.pairCounts=null;m.stage=0;m.axis=null;paint();
    if(!await animate(m.pair,'H'))return;
    m.pair=m.pair.map(b=>qbRotate(b,QB_AXES.H));m.stage=1;m.axis='H';paint();
    if(p.pair==='circuit'){
     // Only B receives Z. Keep A fixed while B follows its physical rotation.
     const initial=m.pair[1].slice(),axis=QB_AXES.Z;
     const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     if(!reduced){const start=performance.now();await new Promise(resolve=>{function frame(now){
      if(!valid()){resolve();return;}
      const t=Math.min(1,(now-start)/750);
      work.querySelector('[data-figure="1"]').innerHTML=qbSphere(qbRotate(initial,axis,Math.PI*t),'Z',Array.from({length:49},(_,i)=>qbRotate(initial,axis,i*Math.PI*t/48)));
      typesetMath(work.querySelector('[data-figure="1"]'));
      liveReadout(work.querySelectorAll('.qb-pair')[1],qbRotate(initial,axis,Math.PI*t));
      if(t<1)requestAnimationFrame(frame);else resolve();
     }requestAnimationFrame(frame);});}
     if(!valid())return;
     m.pair[1]=qbRotate(initial,axis);m.stage=2;m.axis='Z';paint();
     if(!await animate(m.pair,'H'))return;
     m.pair=m.pair.map(b=>qbRotate(b,QB_AXES.H));m.stage=3;m.axis='H';
    }
    if(showSamples)m.pairCounts=m.pair.map(b=>qbSample(b));
   }else if(p.kind==='measurement'){
    const result=qbMeasureSeries(QB_STATES[p.init].b,p.mode==='reprepare');m.b=result.b;m.values=result.values;
   }else {m.first=qbMeasure(m.b).value;m.counts=qbSample(m.b,m.shots-1);m.counts[m.first]++;}
   if(p.kind!=='gates')performed();busy=false;paint();
  };
  update();
 }
 paint();
};



// Mark |+⟩ and |−⟩ on the sphere once the lesson has introduced them (checked against the Chinese source pages).
function qbKetsIntroduced(){
 if(typeof S==='undefined'||!S.lesson||typeof allIds!=='function')return true;
 const ids=allIds(),here=ids.indexOf(S.lesson.id);
 const mentions=pages=>/\|\+\\{1,2}rangle|\|\+⟩/.test(JSON.stringify(pages));
 return ids.slice(0,here).some(id=>mentions(LESSONS[id].revisionPages||LESSONS[id].pages))||mentions((S.lesson.revisionPages||S.lesson.pages).slice(0,S.i+1));
}
;
/* js/lab.js */
/* 编程与实践：线路、代码和采样共用实验状态；不执行 Python 或提交硬件任务。 */
const LAB={sessions:{},latest:{}};
const labEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function labProbabilities(n,seq){
  let state=n===2?st2():[{re:1,im:0},{re:0,im:0}];
  for(const gate of seq)state=n===2?ap2(state,gate):ap1(G1[gate],state);
  const values=state.map(z=>z.re*z.re+z.im*z.im).map(v=>v<1e-14?0:v);
  const total=values.reduce((a,b)=>a+b,0);
  return values.map(v=>v/total);
}
function labDistribution(n,seq,noisy=false){
  const ideal=labProbabilities(n,seq);
  // A deliberately narrow readout model: flip each recorded bit independently with p=0.05.
  if(!noisy)return ideal;
  return ideal.map((_,out)=>ideal.reduce((sum,prob,input)=>{
    let weight=1;
    for(let bit=0;bit<n;bit++)weight*=((input^out)&(1<<bit))?0.05:0.95;
    return sum+prob*weight;
  },0));
}
function labSample(distribution,shots,random=Math.random){
  const counts=distribution.map(()=>0);
  for(let k=0;k<shots;k++){
    const u=random();let sum=0,index=distribution.length-1;
    for(let j=0;j<distribution.length;j++){sum+=distribution[j];if(u<sum){index=j;break;}}
    counts[index]++;
  }
  return counts;
}
function labLabels(n){return Array.from({length:2**n},(_,i)=>i.toString(2).padStart(n,'0'));}
function labCounts(n,counts){return '{'+labLabels(n).flatMap((label,i)=>counts[i]?[`'${label}': ${counts[i]}`]:[]).join(', ')+'}';}
function labCodeRows(model){
  const rows=[['prepare','import fatqat as fq'],['prepare','import fatqat.operations as ops'],['prepare',''],['prepare',`program = fq.Program(${model.n}, ${model.n})`]];
  model.seq.forEach(g=>{
    const command=g==='CNOT'?'ops.CX, (0, 1)':g==='CZ'?'ops.CZ, (0, 1)':`ops.${model.n===2?g.slice(0,-1):g}, ${model.n===2?g.slice(-1):0}`;
    rows.push(['gates',`program.add(${command})`]);
  });
  if(model.measured){
    rows.push(['measure','program.measure_all()'],['execute',''],['execute','backend = fq.simulator.Simulator()'],['execute',`job = backend.run(program, shots=${model.shots})`],['result','result = job.result()'],['result','counts = result.get_counts()'],['result','print(counts)']);
  }
  return rows;
}
function labCode(model){return labCodeRows(model).map(row=>row[1]).join('\n');}
function labLinkedCode(model,active){
  const lines=labCodeRows(model).map(([part,line])=>`<span data-code-part="${part}" class="${line&&part===active?'is-selected':''}">${labEscape(line)}</span>`).join('\n');
  return codeBlock(labCode(model)).replace(/<code>[\s\S]*?<\/code>/,`<code class="lab-linked-code">${lines}</code>`);
}
function labCircuit(model,active=''){
  const step=48,start=98,row=58,top=28;
  const end=start+step*model.seq.length+(model.measured?step:0)+12;
  const width=end+(model.measured?42:8),height=top*2+(model.n-1)*row;
  const line=(x1,y1,x2,y2,cls='')=>`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const symbol=content=>`<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">${content}</svg>`;
  const control=symbol('<circle cx="18" cy="18" r="4" fill="currentColor"/>');
  const target=symbol('<circle cx="18" cy="18" r="11" fill="var(--circuit-gate)" stroke="currentColor" stroke-width="1.4"/><path d="M18 7v22M7 18h22" stroke="currentColor" stroke-width="1.4"/>');
  const meter=symbol('<rect x="2" y="2" width="32" height="32" rx="7" fill="var(--circuit-measure)" stroke="currentColor" stroke-width="1.2"/><path d="M8 26a10 10 0 0 1 20 0M18 26l4.9-11.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M25 10 20.5 13.75 25.3 15.85Z" fill="currentColor"/>');
  const node=(part,content,label,x,y,kind='gate')=>{
    const tag=model.static?'span':'button';
    return `<${tag}${model.static?'':' type="button"'} class="lab-node lab-symbol lab-symbol-${kind}${part==='prepare'?' lab-initial':''}${kind==='meter'?' lab-meter':''}${active===part?' is-selected':''}"${model.static?'':` data-part="${part}"`} aria-label="${labEscape(label)}" style="--node-x:${x-20}px;--node-y:${y-20}px">${content}</${tag}>`;
  };
  let wires='',nodes='';
  for(let q=0;q<model.n;q++){
    const y=top+q*row,mx=start+step*model.seq.length;
    wires+=line(76,y,model.measured?mx:end,y);
    if(model.measured)wires+=line(mx,y-2,end,y-2,'lab-classical-wire')+line(mx,y+2,end,y+2,'lab-classical-wire');
    nodes+=`<span class="lab-qubit-label" style="--label-y:${y-12}px">q<sub>${q}</sub></span>`;
    if(!model.abstract)nodes+=node('prepare',labEscape(model.initialLabel||'|0⟩'),L(`初态：q${q}，${model.initialLabel||'|0⟩'}`,`Initial state: q${q}, ${model.initialLabel||'|0⟩'}`),55,y,'initial');
    model.seq.forEach((g,i)=>{
      const pair=g==='CNOT'||g==='CZ',x=start+i*step;
      if(pair){
        if(q===0)wires+=line(x,y,x,top+row,'lab-control-wire');
        nodes+=node('gates',q===0||g==='CZ'?control:target,L(`${g} 门，q${q} ${q===0?'控制位':g==='CNOT'?'目标位':'相位作用位'}`,`${g} gate, q${q} ${q===0?'control':g==='CNOT'?'target':'phase target'}`),x,y,'control');
      }else if(model.n===1||+g.slice(-1)===q){
        nodes+=node('gates',labEscape(model.n===1?g:g.slice(0,-1)),L(`${g} 门，q${q}`,`${g} gate, q${q}`),x,y);
      }
    });
    if(model.measured){
      nodes+=node('measure',meter,L(`测量 q${q}，保存到 c${q}`,`Measure q${q}, store in c${q}`),mx,y,'meter');
      nodes+=`<span class="lab-classical-label" style="--label-x:${end+5}px;--label-y:${y-12}px">c<sub>${q}</sub></span>`;
    }
  }
  return `<div class="lab-circuit" role="group" aria-label="${L('线路图，按时间从左到右执行','Circuit diagram, runs left to right in time')}"><div class="lab-canvas" style="--circuit-width:${width}px;--circuit-height:${height}px"><svg class="lab-connections" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${wires}</svg>${nodes}</div></div>`;
}
const LAB_PARTS=[['prepare',L('准备','Prepare')],['gates',L('加门','Add gates')],['measure',L('测量','Measure')],['execute',L('执行','Run')],['result',L('读计数','Read counts')]];
function labExplanation(part,model){
  return {
    prepare:L(`import 把工具导入，as 给它一个简写。Program(${model.n}, ${model.n}) 建立 ${model.n} 个量子比特和 ${model.n} 个经典位；经典位保存测量得到的 0 或 1。编号从 0 开始。`,`import brings in the tools, and as gives them a short name. Program(${model.n}, ${model.n}) creates ${model.n} ${model.n===1?'qubit':'qubits'} and ${model.n} classical ${model.n===1?'bit':'bits'}; the classical bits store the 0 or 1 from measurement. Numbering starts at 0.`),
    gates:L('program.add 把一个门加入线路。逗号后面指定它作用在哪个比特；代码从上往下，线路从左往右。','program.add adds a gate to the circuit. The part after the comma says which qubit it acts on. Code reads top to bottom; the circuit reads left to right.')+(model.n===2?L('CNOT 在 FatQat 中写作 CX，(0, 1) 表示 q0 控制、q1 为目标。',' In FatQat, CNOT is written CX; (0, 1) means q0 is the control and q1 is the target.'):''),
    measure:L('measure_all() 测量全部量子比特，并把结果保存到经典位。','measure_all() measures every qubit and stores the results in the classical bits.'),
    execute:L('backend 选择理想模拟器。run 执行线路，shots 是重复次数；每次都重新从初态准备，再加门、测量。job 是这次执行返回的任务对象。','backend picks the ideal simulator. run executes the circuit, and shots is the number of repetitions; each one starts again from the initial state, then applies the gates and measures. job is the task object returned by this run.'),
    result:L('job.result() 取回结果，get_counts() 读取计数字典，print 显示它。例如「\'0\': 49」表示测到 0 共 49 次。所有计数之和等于 shots；未出现的结果可以省略。','job.result() fetches the result, get_counts() reads the dictionary of counts, and print shows it. For example, “\'0\': 49” means 0 was measured 49 times. All the counts add up to shots; outcomes that never appeared may be left out.')
  }[part];
}
function labResults(model,showCounts=false){
  const ideal=labDistribution(model.n,model.seq),noisy=labDistribution(model.n,model.seq,true),labels=labLabels(model.n);
  const runs=model.runs;
  const column=(run,i)=>run?`${run.counts[i]} <small>(${(100*run.counts[i]/run.shots).toFixed(1)}%)</small>`:'—';
  return `<div class="lab-result-wrap"><table class="lab-results"><caption>${L('理论概率与演示计数','Theoretical probabilities and demo counts')}${model.compare?L('，同一线路、相同次数',', same circuit, same number of shots'):''}</caption><thead><tr><th scope="col">${L('结果','Outcome')}</th><th scope="col">${L('理想概率','Ideal probability')}</th>${model.compare?`<th scope="col">${L('含噪概率','Noisy probability')}</th>`:''}<th scope="col">${L('理想采样','Ideal samples')}</th>${model.compare?`<th scope="col">${L('含噪采样','Noisy samples')}</th>`:''}</tr></thead><tbody>${labels.map((l,i)=>`<tr><th scope="row">${l}</th><td>${(ideal[i]*100).toFixed(ideal[i]===0||ideal[i]===1?0:1)}%</td>${model.compare?`<td>${(noisy[i]*100).toFixed(2)}%</td>`:''}<td>${column(runs.ideal,i)}</td>${model.compare?`<td>${column(runs.noisy,i)}</td>`:''}</tr>`).join('')}</tbody></table></div>${runs.ideal?`<p class="lab-run-caption">${L(`本次理想采样：${runs.ideal.shots} 次。`,`Ideal samples this run: ${runs.ideal.shots}.`)}${model.compare?L(`含噪采样：${runs.noisy.shots} 次。`,` Noisy samples: ${runs.noisy.shots}.`):''}</p>${showCounts?`<div class="lab-output"><span>${L('模拟结果：每种测量结果出现的次数','Simulated result: how many times each outcome appeared')}</span><code>${labCounts(model.n,runs.ideal.counts)}</code></div>`:''}`:`<p class="cap">${L('采样后显示计数。','Counts appear after you sample.')}</p>`}`;
}
function labCompactOutput(model,empty=L('尚未采样。','Not sampled yet.')){
  const run=model.runs.ideal;
  return run?`<div class="lab-output" aria-live="polite"><span>${L(`本次 ${run.shots} 次采样`,`${run.shots} shots this run`)}</span><code>${labCounts(model.n,run.counts)}</code></div><div class="lab-count-bars" aria-label="${L('采样计数','Sample counts')}">${labLabels(model.n).map((label,i)=>`<div class="lab-count-row"><span>${label}</span><span class="lab-count-track" aria-hidden="true"><span style="--frequency:${100*run.counts[i]/run.shots}%"></span></span><span>${L(`${run.counts[i]} 次`,`${run.counts[i]}`)}</span></div>`).join('')}</div>`:`<p class="lab-empty" role="status">${labEscape(empty)}</p>`;
}
// One teaching page per stage; previous circuit elements remain as context.
function labCodeStage(model,p){
  const part=p.codeStage;
  const code=labCodeRows(model).filter(([id,line])=>(id===part||(part==='execute'&&id==='result'))&&line).map(([,line])=>line).join('\n');
  const sampling=part==='execute'?`<div class="lab-sampling"><label>${L('重复次数','Shots')} <select aria-label="${L('重复次数','Shots')}">${[8,100,1000].map(n=>`<option value="${n}"${model.shots===n?' selected':''}>${L(`${n} 次`,`${n}`)}</option>`).join('')}</select></label><button class="primary" type="button" data-action="run">${L('采样当前线路','Sample this circuit')}</button></div>`:'';
  const output=part==='execute'?`<div class="lab-stage-output">${labCompactOutput(model,L('尚未采样。','Not sampled yet.'))}</div>`:'';
  const explanation=part==='execute'?'':labExplanation(part,model);
  return `<section class="lab lab-guided lab-stage" data-stage="${part}" aria-label="${L('FatQat 分步实验','FatQat step-by-step experiment')}"><div class="lab-stage-circuit">${labCircuit(model,part)}</div><section class="lab-code-step is-selected" data-step="${part}" data-code-copy-scope><div class="lab-step-pair"><div class="lab-code-container">${codeToolbar(L('复制本段代码','Copy this code'))}<button type="button" class="lab-code-fragment" data-part="${part}" data-code-part="${part}" aria-label="${L('查看本页代码对应关系','Show how this code maps to the circuit')}" aria-pressed="true"><code>${labEscape(code)}</code></button></div><div class="lab-step-demo"><p class="lab-step-explanation">${explanation}</p></div></div></section>${sampling}${output}${part==='execute'?`<details class="lab-full-code"><summary>${L('查看与复制完整 Python 代码','View and copy the full Python code')}</summary>${codeBlock(labCode(model))}</details><details class="lab-probability-details"><summary>${L('查看理论概率与采样对照','Compare theoretical probabilities with samples')}</summary>${labResults(model)}</details>`:''}</section>`;
}
// Pair short code fragments with their explanations and live experiment controls.
function labGuidedExperiment(model,p){
  if(p.codeStage)return labCodeStage(model,p);
  const explanations={
    prepare:L(`导入工具，创建 ${model.n} 个量子比特和 ${model.n} 个经典位。量子比特从 |0⟩ 开始；经典位保存测量结果。`,`Import the tools and create ${model.n} ${model.n===1?'qubit':'qubits'} and ${model.n} classical ${model.n===1?'bit':'bits'}. Qubits start in |0⟩; classical bits store the measurement results.`),
    gates:L('add 添加量子门，逗号后是比特编号。代码从上往下，线路从左往右。','add adds a quantum gate; after the comma comes the qubit number. Code reads top to bottom; the circuit reads left to right.'),
    measure:L('测量全部量子比特，把得到的 0 或 1 保存到经典位。','Measure every qubit and store each 0 or 1 in a classical bit.'),
    execute:L('选择模拟器，再重复执行线路。shots 是重复次数；每次都重新准备初态。','Pick a simulator, then run the circuit many times. shots is the number of repetitions; each one starts again from the initial state.'),
    result:L('取回结果，读取并显示计数。例如「\'0\': 49」表示测到 0 共 49 次。','Fetch the result, then read and print the counts. For example, “\'0\': 49” means 0 was measured 49 times.')
  };
  const controls=p.edit?`<div class="lab-controls" role="group" aria-label="${L('编辑线路','Edit circuit')}">${p.gates.map(g=>`<button class="chip" type="button" data-gate="${g}"${model.seq.length>=6?' disabled':''}>${g}</button>`).join('')}<button class="chip" type="button" data-action="undo"${!model.seq.length?' disabled':''}>${L('撤销上一步','Undo')}</button><button class="chip" type="button" data-action="clear">${L('清空线路','Clear circuit')}</button></div>`:'';
  const run=model.runs.ideal;
  const output=labCompactOutput(model);
  const visuals={
    prepare:labCircuit({...model,seq:[],measured:false},model.part),
    gates:labCircuit({...model,measured:false},model.part)+controls,
    measure:labCircuit(model,model.part),
    execute:`<div class="lab-sampling"><label>${L('重复次数','Shots')} <select aria-label="${L('重复次数','Shots')}">${[8,100,1000].map(n=>`<option value="${n}"${model.shots===n?' selected':''}>${L(`${n} 次`,`${n}`)}</option>`).join('')}</select></label><button class="primary" type="button" data-action="run"${!model.measured?' disabled':''}>${L('采样当前线路','Sample this circuit')}</button></div><p class="lab-run-status" role="status">${run?L('采样完成，计数见下一段。','Sampling done. The counts are in the next section.'):L('尚未采样。','Not sampled yet.')}</p>`,
    result:output
  };
  const titles={prepare:L('准备比特','Prepare qubits'),gates:L('添加量子门','Add quantum gates'),measure:L('测量','Measure'),execute:L('重复采样','Repeat and sample'),result:L('读取计数','Read the counts')};
  const rows=labCodeRows(model);
  const steps=LAB_PARTS.map(([part],i)=>{
    const code=rows.filter(([id,line])=>id===part&&line).map(([,line])=>line).join('\n');
    return `<section class="lab-code-step${model.part===part?' is-selected':''}" data-step="${part}" data-code-copy-scope><div class="lab-step-heading"><h2><span>${i+1}</span>${titles[part]}</h2></div><div class="lab-step-pair"><div class="lab-code-container">${codeToolbar(L('复制本段代码','Copy this code')).replace('class="code-copy"','class="code-copy"'+(code?'':' disabled'))}<button type="button" class="lab-code-fragment" data-part="${part}" data-code-part="${part}" aria-label="${L(`查看${titles[part]}对应关系`,`Show how “${titles[part]}” maps to the circuit`)}" aria-pressed="${model.part===part}"><code>${labEscape(code||L('# 尚未添加量子门','# No gates added yet'))}</code></button></div><div class="lab-step-demo"><p class="lab-step-explanation">${explanations[part]}</p>${visuals[part]}</div></div></section>`;
  });
  return `<section class="lab lab-guided" aria-label="${L('FatQat 代码与实验对照','FatQat code alongside the experiment')}"><div class="lab-build-group"><div class="lab-shared-circuit">${labCircuit(model,model.part)}</div>${steps.slice(0,3).join('')}</div>${steps.slice(3).join('')}<details class="lab-probability-details"><summary>${L('查看理论概率与采样对照','Compare theoretical probabilities with samples')}</summary>${labResults(model)}</details><details class="lab-full-code"><summary>${L('查看与复制完整 Python 代码','View and copy the full Python code')}</summary>${codeBlock(labCode(model))}<p class="cap">${L('在已安装 FatQat 的 Python 环境运行。网页中的采样不执行这段 Python。','Run it in a Python environment with FatQat installed. Sampling on this page does not run this Python code.')}</p></details></section>`;
}
COMP.lab=(slot,p)=>{
  const base=(S.lesson?.id||'extension')+':'+p.labKey;
  const step=S.lesson?S.i:0,key=base+':'+step;
  let preceding=null;
  if(S.lesson)for(let i=step-1;i>=0;i--){
    if(S.lesson.pages[i].labKey===p.labKey){preceding=LAB.sessions[base+':'+i];break;}
  }
  const candidate=LAB.latest[p.from];
  const source=candidate?.n===(p.n||1)&&candidate.seq.join(',')===(p.seed||[]).join(',')?candidate:null;
  const fresh={n:p.n||1,seq:[...(source?.seq||p.seed||[])],measured:!!(source?.measured||p.measured),shots:p.shots||8,runs:{},seen:[],part:'prepare',visited:[],compare:!!p.compare};
  const model=LAB.sessions[key]||JSON.parse(JSON.stringify(preceding||fresh));
  if(p.codeStage){
    // A stage adds its authored operations, while sampling/result pages retain
    // the same run. Earlier page snapshots stay independent when revisited.
    if(model.seq.join(',')!==(p.seed||[]).join(',')||model.measured!==!!p.measured){
      model.runs={};model.seen=[];
    }
    model.seq=[...(p.seed||[])];model.measured=!!p.measured;model.part=p.codeStage;
  }
  const persist=()=>{LAB.sessions[key]=model;LAB.latest[base]=model;};
  // Earlier steps retain their own circuit and counts. Editing or resampling them
  // invalidates later work, which will be derived again from the updated experiment.
  const invalidateFollowing=()=>{
    if(!S.lesson)return;
    for(let i=step+1;i<S.lesson.pages.length;i++){
      const later=S.lesson.pages[i];
      if(later.labKey)delete LAB.sessions[S.lesson.id+':'+later.labKey+':'+i];
      delete S.answers[i];delete S.passed[i];delete S.carrySnapshots[i];
    }
  };
  const evaluate=()=>{
    if(!p.ok)return;
    const valid=p.ok({...model,result:model.runs.ideal,seq:model.seq});
    S.gateOK=!!valid;S.passed[S.i]=!!valid;go('继续',!!valid);hint(valid?(p.pm||''):p.gh);
  };
  const invalidate=()=>{invalidateFollowing();model.runs={};model.seen=[];persist();};
  function draw(){
    const focused=slot.contains(document.activeElement)?document.activeElement:null;
    const focusKey=focused?.dataset.gate?['data-gate',focused.dataset.gate]:focused?.dataset.action?['data-action',focused.dataset.action]:focused?.dataset.codePart?['data-code-part',focused.dataset.codePart]:focused?.dataset.part?['data-part',focused.dataset.part]:focused?.tagName==='SELECT'?['select','']:null;
    const openDetails=[...slot.querySelectorAll('details[open]')].map(el=>el.className);
    const guided=p.codeFirst&&p.explain;
    slot.innerHTML=guided?labGuidedExperiment(model,p):`<section class="lab" aria-label="${L('网页量子实验','In-browser quantum experiment')}">${p.codeFirst?labLinkedCode(model,p.explain?model.part:''):''}${labCircuit(model,p.explain?model.part:'')}
    ${p.edit?`<div class="lab-controls" role="group" aria-label="${L('编辑线路','Edit circuit')}">${p.gates.map(g=>`<button class="chip" type="button" data-gate="${g}"${model.seq.length>=6?' disabled':''}>${g}</button>`).join('')}<button class="chip" type="button" data-action="undo"${!model.seq.length?' disabled':''}>${L('撤销上一步','Undo')}</button><button class="chip" type="button" data-action="clear">${L('清空线路','Clear circuit')}</button></div>`:''}
    ${p.addMeasure?`<button class="secondary lab-measure" type="button" data-action="measure"${model.measured?' disabled':''}>${model.measured?L('已添加测量','Measurement added'):L('添加测量','Add measurement')}</button>`:''}
    <p class="lab-circuit-note">${model.n===2?L('结果按 q0、q1 从左到右读；CNOT 的 ● 是控制位，⊕ 是目标位。','Read results as q0, q1 from left to right. In CNOT, ● is the control and ⊕ is the target.'):L('初态为 |0⟩。','The initial state is |0⟩.')}${p.edit?L('修改的是测量之前的门。',' Your edits change the gates before measurement.'):''}</p>
    ${p.explain?(p.codeFirst?`<div class="lab-parts" role="group" aria-label="${L('查看代码说明','Show code explanations')}">${LAB_PARTS.map(([id,label])=>`<button type="button" class="chip" data-part="${id}" aria-pressed="${model.part===id}">${label}</button>`).join('')}</div><p class="lab-explanation" aria-live="polite">${labExplanation(model.part,model)}</p>`:`<div class="lab-code-guide" aria-label="${L('线路与代码对应关系','How the circuit maps to the code')}">${LAB_PARTS.map(([id,label])=>`<section class="${model.part===id?'is-selected':''}"><h3>${label}</h3><pre class="lab-code-lines">${labCodeRows(model).filter(([part,line])=>part===id&&line).map(([,line])=>labEscape(line)).join('\n')}</pre><p>${labExplanation(id,model)}</p></section>`).join('')}</div>`):''}
    <div class="lab-sampling"><label>${L('重复次数','Shots')} <select aria-label="${L('重复次数','Shots')}">${[8,100,1000].map(n=>`<option value="${n}"${model.shots===n?' selected':''}>${L(`${n} 次`,`${n}`)}</option>`).join('')}</select></label><button class="primary" type="button" data-action="run"${!model.measured?' disabled':''}>${model.compare?L('同时采样两组','Sample both together'):L('采样当前线路','Sample this circuit')}</button></div>
    <p class="lab-run-status" role="status">${model.runs.ideal?L('采样完成','Sampling done'):model.measured?L('每次重复都会重新准备初态，再执行门与测量。','Each repetition prepares the initial state again, then applies the gates and measures.'):L('先添加测量，再进行采样。','Add a measurement first, then sample.')}</p>
    ${model.compare?`<p class="lab-noise-note">${L('含噪演示：只模拟读出错误，每个经典位独立有 5% 的概率被记反；不代表真实设备的全部噪声，也不是硬件实测。','Noisy demo: only readout errors are simulated. Each classical bit is independently recorded wrong with 5% probability. This is not all the noise in a real device, and it is not measured on hardware.')}</p>`:''}
    ${labResults(model,p.showCode)}
    ${p.showCode&&!p.codeFirst?`<details class="lab-full-code"><summary>${L('完整 Python 代码','Full Python code')}</summary>${codeBlock(labCode(model))}<p class="cap">${L('含导入语句。在已安装 FatQat 的 Python 环境运行；网页中的采样不执行这段 Python。','Includes the import lines. Run it in a Python environment with FatQat installed; sampling on this page does not run this Python code.')}</p></details>`:''}</section>`;
    slot.querySelectorAll('[data-gate]').forEach(b=>b.onclick=()=>{if(model.seq.length<6)model.seq.push(b.dataset.gate);if(guided)model.part='gates';invalidate();draw();});
    slot.querySelector('[data-action="undo"]')?.addEventListener('click',()=>{model.seq.pop();if(guided)model.part='gates';invalidate();draw();});
    slot.querySelector('[data-action="clear"]')?.addEventListener('click',()=>{model.seq=[];if(guided)model.part='gates';invalidate();draw();});
    slot.querySelector('[data-action="measure"]')?.addEventListener('click',()=>{model.measured=true;invalidate();draw();});
    slot.querySelector('select')?.addEventListener('change',e=>{invalidateFollowing();model.shots=+e.target.value;model.runs={};if(guided)model.part='execute';persist();draw();});
    slot.querySelector('[data-action="run"]')?.addEventListener('click',()=>{
      if(!model.measured)return;
      invalidateFollowing();
      const drawRun=noisy=>({shots:model.shots,counts:labSample(labDistribution(model.n,model.seq,noisy),model.shots)});
      model.runs={ideal:drawRun(false)};
      if(model.compare)model.runs.noisy=drawRun(true);
      if(!model.seen.includes(model.shots))model.seen.push(model.shots);
      if(guided)model.part=p.codeStage||'result';
      persist();draw();
      if(p.codeStage==='execute')slot.querySelector('.lab-stage-output').scrollIntoView({block:'nearest'});
      else if(guided&&!p.codeStage)slot.querySelector('[data-step="result"]').scrollIntoView({block:'nearest'});
    });
    slot.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{
      if(!p.explain)return;
      model.part=b.dataset.part;if(!model.visited.includes(model.part))model.visited.push(model.part);persist();
      if(guided){
        slot.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('is-selected',el.dataset.step===model.part));
        slot.querySelectorAll('[data-part]').forEach(el=>{
          el.classList.toggle('is-selected',el.dataset.part===model.part);
          if(el.hasAttribute('aria-pressed'))el.setAttribute('aria-pressed',String(el.dataset.part===model.part));
        });
        if(b.closest('.lab-shared-circuit'))slot.querySelector(`[data-step="${model.part}"]`).scrollIntoView({block:'nearest'});
      }else draw();
    });
    slot.querySelectorAll('[data-part]').forEach(b=>{if(!p.explain||(p.codeStage&&b.dataset.part!==p.codeStage))b.disabled=true;});
    typesetMath(slot);
    slot.querySelectorAll('details').forEach(el=>{el.open=openDetails.includes(el.className);});
    persist();evaluate();
    if(focusKey){const target=focusKey[0]==='select'?slot.querySelector('select'):slot.querySelector(`[${focusKey[0]}="${focusKey[1]}"]`);if(target&&!target.disabled)target.focus({preventScroll:true});}
  }
  draw();
};
;
/* js/figures.js */
/* =========================================================
   静态图示
   ========================================================= */
// Outside the browser (model checks) i18n.js may not be loaded; fall back to the Chinese source text.
if(typeof globalThis.L!=='function')globalThis.L=zh=>zh;
const ART={};
// Perspective slabs show the software-to-hardware hierarchy as one illustration.
ART.quantumStack=(p={})=>{
 const layers=[
  {name:L('应用与算法','Applications'),x:114,y:53,w:260,tone:'software',icon:'<circle cx="0" cy="0" r="5"/><circle cx="22" cy="-9" r="4"/><circle cx="23" cy="12" r="4"/><path d="M5-2l13-5M5 3l14 7"/>'},
  {name:L('量子线路','Quantum circuits'),x:92,y:136,w:304,tone:'software',icon:'<path d="M-4-9h36M-4 10h36M22-9v19"/><rect x="2" y="-16" width="12" height="14"/><circle cx="22" cy="-9" r="2"/><circle cx="22" cy="10" r="5"/>'},
  {name:L('编译','Compilation'),x:70,y:219,w:348,tone:'compiler',icon:'<path d="M-4-12h11l10 12-10 12H-4M17 0h16m-5-5 5 5-5 5"/>'},
  {name:L('控制与读出','Control & readout'),x:48,y:302,w:392,tone:'control',icon:'<path d="M-5 9h7V-9h9V9h9V-9h9V9h6"/>'},
  {name:L('物理硬件','Physical hardware'),x:26,y:385,w:436,tone:'hardware',icon:'<path d="M0-11h24M0 11h24M0-11v22M12-11v22M24-11v22"/><circle cx="0" cy="-11" r="3"/><circle cx="12" cy="-11" r="3"/><circle cx="24" cy="-11" r="3"/><circle cx="0" cy="11" r="3"/><circle cx="12" cy="11" r="3"/><circle cx="24" cy="11" r="3"/>'}
 ];
 return `<figure class="quantum-stack">
  <svg class="quantum-stack-art" viewBox="0 0 520 462" role="img" aria-labelledby="quantum-stack-title quantum-stack-description">
   <title id="quantum-stack-title">${L('量子计算机的五层立体堆叠图','A quantum computer as a five-layer stack')}</title>
   <desc id="quantum-stack-description">${L('自上而下：应用与算法、量子线路、编译、控制与读出、物理硬件。各层逐渐加宽，编译层与硬件层突出显示，是本章关注的内容。','From top to bottom: applications and algorithms, quantum circuits, compilation, control and readout, physical hardware. Each layer is wider than the one above. The compilation and hardware layers are highlighted as the focus of this chapter.')}</desc>
   <ellipse class="quantum-stack-shadow" cx="258" cy="447" rx="221" ry="9"/>
   ${layers.map(({name,x,y,w,tone,icon})=>`<g class="quantum-stack-slab quantum-stack-slab--${tone}">
    <path class="quantum-stack-top" d="M${x} ${y}l28-24h${w}l-28 24Z"/>
    <path class="quantum-stack-side" d="M${x+w} ${y}l28-24v52l-28 24Z"/>
    <path class="quantum-stack-front" d="M${x} ${y}h${w}v52H${x}Z"/>
    <g class="quantum-stack-icon" transform="translate(${x+27} ${y+26})">${icon}</g>
    <text class="quantum-stack-label" x="${x+w/2+21}" y="${y+34}" text-anchor="middle">${name}</text>
   </g>`).join('')}
  </svg>
  <figcaption class="quantum-stack-focus">${p.recap?L('线路 → 编译安排 → 控制信号 → 硬件执行','Circuit → compiled schedule → control signals → hardware execution'):L('本章重点：物理硬件，以及连接线路与硬件的编译','This chapter’s focus: physical hardware, and the compilation that connects circuits to it')}</figcaption>
 </figure>`;
};
ART.interferenceSums=()=>`<section aria-label="${L('H 门后的概率幅合成','Adding amplitudes after the H gate')}">
 ${[
  [L('$|+\\rangle$经过 H','$|+\\rangle$ through H'),[['0','+1/2 + 1/2 = 1','100%'],['1','+1/2 − 1/2 = 0','0%']]],
  [L('$|-\\rangle$经过 H','$|-\\rangle$ through H'),[['0','+1/2 − 1/2 = 0','0%'],['1','+1/2 + 1/2 = 1','100%']]]
 ].map(([title,rows])=>`<table class="compile-probabilities"><caption>${title}</caption><thead><tr><th scope="col">${L('最终结果','Final outcome')}</th><th scope="col">${L('概率幅合成','Amplitudes added')}</th><th scope="col">${L('概率','Probability')}</th></tr></thead><tbody>${rows.map(([out,sum,prob])=>`<tr><th scope="row">${out}</th><td>${sum}</td><td>${prob}</td></tr>`).join('')}</tbody></table>`).join('')}
 </section>`;
ART.shorPeriod=()=>`<table class="compile-probabilities"><caption>${L('2 的幂除以 15 的余数','Remainders of powers of 2 divided by 15')}</caption><thead><tr><th scope="col">${L('指数 x','Exponent x')}</th><th scope="col">${L('2 的 x 次方','2 to the power x')}</th><th scope="col">${L('除以 15 的余数','Remainder after dividing by 15')}</th></tr></thead><tbody>${Array.from({length:8},(_,x)=>`<tr class="${x%4===0?'has-probability':''}"><th scope="row">${x}</th><td>${2**x}</td><td>${2**x%15}</td></tr>`).join('')}</tbody></table>`;
ART.timeline=(p={})=>{
  const milestones=p.milestones||[
    ['1981',L('费曼：用量子系统模拟自然','Feynman: simulate nature with quantum systems'),L('经典计算机难以高效模拟许多复杂的量子系统。费曼在 1981 年的演讲中提出：能否用可控的量子系统来模拟量子物理？相关论文于 1982 年发表。','Classical computers struggle to simulate many complex quantum systems efficiently. In a 1981 talk, Feynman asked: could we use controllable quantum systems to simulate quantum physics? The related paper appeared in 1982.')],
    ['1985',L('从模拟自然，到通用计算','From simulating nature to general-purpose computing'),L('Deutsch 提出通用量子计算模型，让量子计算有了更一般的理论框架。','Deutsch proposed a universal model of quantum computation, giving quantum computing a more general theoretical framework.')],
    ['1994',L('算法展示加速的可能','An algorithm shows a possible speedup'),L('Shor 提出量子因数分解算法，展示解决特定问题的加速潜力。','Shor proposed a quantum factoring algorithm, showing the potential to speed up specific problems.')],
    ['1995',L('量子信息也能受到保护','Quantum information can be protected, too'),L('Shor 提出量子纠错方案：用多个量子比特共同保护信息，为应对计算中的错误提供方法。','Shor proposed a quantum error-correction scheme: several qubits protect information together, offering a way to deal with errors during computation.')],
    ['2019',L('在特定任务上检验优势','Testing an advantage on a specific task'),L('Google 团队用超导处理器完成随机线路采样，并与当时采用的经典模拟方法比较计算用时。这是检验计算能力的专门任务，不能据此推断日常应用也已获得加速；比较结果还取决于经典算法和计算资源。','A Google team ran random circuit sampling on a superconducting processor and compared the run time with the classical simulation methods used at the time. This is a special task for testing computing power; it does not show that everyday applications are already faster. The comparison also depends on the classical algorithms and computing resources.')],
    ['2024',L('纠错让量子信息存得更可靠','Error correction makes stored quantum information more reliable'),L('Google 团队在超导处理器上实现了低于纠错阈值的量子存储：当底层错误率足够低时，在实验测试的编码规模内，用更多量子比特共同保护信息，能降低存储信息的错误率。这是迈向可靠计算的一步，还不等于实现完整的大规模容错计算。','A Google team demonstrated below-threshold quantum memory on a superconducting processor: when the underlying error rate is low enough, using more qubits to protect the information lowered the error rate of the stored information, within the code sizes tested. This is a step toward reliable computing, not yet full large-scale fault-tolerant computing.'),'present'],
    [L('未来目标','Future goal'),L('走向大规模容错量子计算','Toward large-scale fault-tolerant quantum computing'),L('在纠错保护下完成长时间的计算，解决有实际价值的问题。','Run long computations under error-correction protection and solve problems of real value.'),'future']
  ];
  const sources=p.sources||{
  "1981": {
    "url": "https://authors.library.caltech.edu/records/a1kgk-xyk45",
    "label": L("Feynman | 模拟物理的设想（1981 年演讲，1982 年论文）","Feynman | The idea of simulating physics (1981 talk, 1982 paper)")
  },
  "1985": {
    "url": "https://www.cs.princeton.edu/courses/archive/fall06/cos576/papers/deutsch85.pdf",
    "label": L("Deutsch | 通用量子计算模型（1985）","Deutsch | A universal model of quantum computation (1985)")
  },
  "1994": {
    "url": "https://math.mit.edu/~shor/elecpubs.html",
    "label": L("Shor | 因数分解算法（1994）","Shor | Factoring algorithm (1994)")
  },
  "1995": {
    "url": "https://doi.org/10.1103/PhysRevA.52.R2493",
    "label": L("Shor | 量子纠错（1995）","Shor | Quantum error correction (1995)")
  },
  "2019": {
    "url": "https://www.nature.com/articles/s41586-019-1666-5",
    "label": L("Google | 随机线路采样实验（2019）","Google | Random circuit sampling experiment (2019)")
  },
  "2024": {
    "url": "https://www.nature.com/articles/s41586-024-08449-y",
    "label": L("Google | 低于阈值的量子纠错实验（2024 年在线发表）","Google | Below-threshold quantum error correction experiment (published online 2024)")
  }
};
  return `<figure class="quantum-history" aria-label="${p.timelineLabel||L('量子计算发展的代表性节点','Key milestones in quantum computing')}">
    <figcaption class="history-intro">${p.timelineIntro||L('从“怎样模拟量子世界”出发，沿着几个代表性节点，看看量子计算怎样发展。','Starting from the question “how can we simulate the quantum world?”, follow a few key milestones to see how quantum computing developed.')}</figcaption>
    <ol class="history-list">${milestones.map(([year,title,description,state=''],i)=>`
      <li class="history-stop${state?' history-stop--'+state:''}">
        ${i<milestones.length-1?`<svg class="history-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M ${i%2?85:15} 0 C ${i%2?85:15} 50, ${i%2?15:85} 50, ${i%2?15:85} 100" vector-effect="non-scaling-stroke"/></svg>`:''}
        <details class="history-event" name="quantum-history"${i===0?' open':''}>
          <summary><span class="history-node" aria-hidden="true"></span><span class="history-year">${year}</span><span class="history-title">${title}</span><span class="history-expand" aria-hidden="true">+</span></summary>
          <p>${description}</p>
          ${(sources[title]||sources[year])?`<p class="history-reference"><a href="${(sources[title]||sources[year]).url}" target="_blank" rel="noopener noreferrer">${(sources[title]||sources[year]).label}</a></p>`:''}
        </details>
      </li>`).join('')}
    </ol>
  </figure>`;
};
ART.algorithmOverview=()=>`<table class="compile-probabilities algorithm-overview"><caption>${L('从任务认识代表性量子算法','Representative quantum algorithms, by task')}</caption><thead><tr><th scope="col">${L('想做什么','Goal')}</th><th scope="col">${L('代表方法','Representative method')}</th><th scope="col">${L('能帮助做什么','How it helps')}</th></tr></thead><tbody>
 ${[
  [L('寻找目标','Find a target'),'Grover',L('在没有排序等线索时，减少寻找目标所需的检查次数。','When there is no sorting or other clue, it reduces the number of checks needed to find a target.')],
  [L('分解整数','Factor integers'),'Shor',L('利用周期信息，找到整数的因数。','It uses period information to find the factors of an integer.')],
  [L('研究分子与材料','Study molecules and materials'),L('量子模拟<br>VQE','Quantum simulation<br>VQE'),L('模拟量子系统的演化，或寻找低能量状态。','It simulates how quantum systems evolve, or searches for low-energy states.')],
  [L('寻找较好的方案','Find good solutions'),'QAOA',L('针对组合优化问题，结合量子线路与经典调参寻找候选方案；不保证得到最优解。','For combinatorial optimization problems, it combines quantum circuits with classical parameter tuning to find candidate solutions; the best solution is not guaranteed.')]
 ].map(([task,name,description])=>`<tr><th scope="row">${task}</th><td>${name}</td><td>${description}</td></tr>`).join('')}
 </tbody></table>`;

// Career exploration is an interest choice, never a scored question.
const CAREER_PATHS=[
 {id:'hardware',title:L('硬件与实验','Hardware and experiments'),work:L('制备、控制和读出量子比特，校准设备并分析误差。','Prepare, control, and read out qubits; calibrate devices and analyze errors.'),basis:L('物理、电子或光学，以及实验与数据分析。不同硬件路线需要的具体知识不同。','Physics, electronics, or optics, plus experiments and data analysis. Each hardware platform calls for its own specific knowledge.'),task:L('选择一种硬件路线，画出准备、控制、读出的过程。','Pick a hardware platform and sketch how it prepares, controls, and reads out qubits.'),steps:[L('从本课介绍的硬件路线中选一种。','Choose one of the hardware platforms from this course.'),L('标出量子比特由什么承载，以及怎样准备、控制和读出。','Label what physically carries the qubit, and how it is prepared, controlled, and read out.'),L('圈出一个你还想进一步了解的实验环节。','Circle one experimental step you want to learn more about.')],result:L('一张流程图，以及一个想继续研究的问题。','A flowchart, plus one question you want to keep exploring.')},
 {id:'software',title:L('软件与系统','Software and systems'),work:L('开发编程工具、编译器与运行系统，让量子程序能够表达、转换和执行。','Build programming tools, compilers, and runtime systems so quantum programs can be written, transformed, and run.'),basis:L('编程、数据结构、软件工程，以及量子线路与硬件约束的基础知识。','Programming, data structures, and software engineering, plus the basics of quantum circuits and hardware constraints.'),task:L('修改刚才的 FatQat 代码，对照线路解释变化。','Modify the FatQat code you just saw, and use the circuit to explain what changed.'),steps:[L('从刚才的单比特实验开始，在准备 |0⟩ 后连续施加两个 H 门。','Start from the single-qubit experiment: after preparing |0⟩, apply two H gates in a row.'),L('先预测测量结果，再在配置好的 FatQat 环境中运行。','Predict the measurement outcome first, then run it in a configured FatQat environment.'),L('对照线路，解释两个 H 的整体作用，并与只施加一个 H 时比较。','Using the circuit, explain the combined effect of the two H gates, and compare it with applying just one H.')],result:L('一段修改后的代码，以及对预测和计数结果的解释。','Your modified code, plus an explanation of your prediction and the counts.')},
 {id:'theory',title:L('算法与理论','Algorithms and theory'),work:L('研究量子算法、纠错方法，以及量子计算能解决哪些问题、需要多少资源。','Study quantum algorithms and error-correction methods, which problems quantum computers can solve, and how many resources they need.'),basis:L('线性代数、概率、算法与量子信息，随具体问题逐步深入。','Linear algebra, probability, algorithms, and quantum information, going deeper as specific problems require.'),task:L('改变 Grover 的迭代次数，记录目标概率怎样变化。','Change the number of Grover iterations and record how the target probability changes.'),steps:[L('回到 Grover 实验，保持搜索目标不变。','Go back to the Grover experiment and keep the search target the same.'),L('比较不同迭代次数下的目标概率。','Compare the target probability for different numbers of iterations.'),L('记录概率是否一直增加，解释为什么不能只靠增加迭代次数。','Note whether the probability keeps rising, and explain why more iterations alone are not the answer.')],result:L('一份迭代次数与目标概率的记录，以及你的解释。','A record of iterations vs. target probability, with your explanation.')},
 {id:'application',title:L('应用与交叉研究','Applications and interdisciplinary research'),work:L('把领域问题转成计算任务，比较量子与经典方法的效果和成本。','Turn problems from other fields into computing tasks, and compare quantum and classical methods on results and cost.'),basis:L('领域知识、数学建模、计算与验证，以及对量子算法适用条件的理解。','Domain knowledge, mathematical modeling, computation and validation, plus an understanding of when quantum algorithms apply.'),task:L('选一个熟悉的问题，写清输入、希望得到的结果，以及现有解决方法。','Pick a problem you know well, and write down its inputs, the result you want, and how it is solved today.'),steps:[L('选一个你能具体描述的问题，例如一项排班任务。','Choose a problem you can describe concretely, such as a scheduling task.'),L('列出输入、限制条件，以及怎样判断结果好不好。','List the inputs, the constraints, and how to judge whether a result is good.'),L('写出一种现有解决方法，再列出判断量子方法是否适用还缺少的信息。','Write down one existing solution, then list what information is still missing to judge whether a quantum method fits.')],result:L('一张问题说明卡。无需预设量子方法一定更好。','A problem card. No need to assume a quantum method must be better.')}
];
ART.careerFlow=()=>`<div class="career-flow"><h2 class="career-heading">${L('有哪些人在做？','Who does this work?')}</h2><p class="say">${L('刚才，你完成了编写与运行程序的入门练习。从问题到真实设备上的结果，还需要这些工作：','You just finished an intro exercise in writing and running a program. Getting from a problem to results on a real device also takes this work:')}</p><ol class="career-workflow">${[
 [L('应用与算法','Applications and algorithms'),L('把问题转成计算任务，设计求解方法与量子线路。','Turn a problem into a computing task; design a method and quantum circuits to solve it.')],
 [L('软件与编译','Software and compilation'),L('用工具表达线路，把它转换成设备支持的操作。','Express circuits with tools and convert them into operations the device supports.')],
 [L('控制与硬件','Control and hardware'),L('准备量子比特，用控制信号执行操作，再读出结果。','Prepare qubits, run operations with control signals, then read out the results.')],
 [L('分析与反馈','Analysis and feedback'),L('解释结果和误差，把发现反馈给算法、软件与实验团队。','Interpret results and errors, and feed findings back to the algorithm, software, and experiment teams.')]
].map(([title,body])=>`<li><strong>${title}</strong><p>${body}</p></li>`).join('')}</ol><p class="say">${L('你刚才看到的 FatQat 代码，是进入软件与量子实验的一扇窗口。','The FatQat code you just saw is a window into quantum software and experiments.')}</p></div>`;
ART.careerDirections=()=>`<h2 class="career-heading">${L('这些工作需要什么基础？','What background does this work need?')}</h2><div class="career-directions">
 <div class="hw-route-buttons" role="group" aria-label="${L('选择职业方向','Choose a career direction')}">${CAREER_PATHS.map((path,i)=>`<button type="button" class="hw-route-button" data-career-direction="${path.id}" aria-pressed="${i===0}" aria-controls="career-direction-${path.id}">${path.title}</button>`).join('')}</div>
 ${CAREER_PATHS.map((path,i)=>`<section class="hw-route-panel career-direction-body" id="career-direction-${path.id}" aria-label="${path.title}" ${i===0?'':'hidden'}><h3>${L('具体做什么','What you do')}</h3><p>${path.work}</p><h3>${L('相关基础','Useful background')}</h3><p>${path.basis}</p></section>`).join('')}
 </div>`;
ART.careerNext=()=>`<h2 class="career-heading">${L('下一步可以尝试什么？','What could you try next?')}</h2><fieldset class="career-picker"><legend>${L('我想先探索的方向','The direction I want to explore first')}</legend><p>${L('选一个方向，看看可以从什么小任务开始。','Pick a direction to see a small task you could start with.')}</p><div class="career-options">${CAREER_PATHS.map(path=>`<label><input type="radio" name="career-interest" value="${path.id}" aria-controls="career-task"><span>${path.title}</span></label>`).join('')}</div></fieldset><div id="career-task" class="career-task" aria-live="polite"><p>${L('不必现在决定职业。先从好奇的问题开始，也可以稍后再作选择。','You don’t need to choose a career now. Start with a question you’re curious about; you can decide later.')}</p></div>`;
function bindCareerExploration(root,p){
 const step=S.i,answers=S.answers;
 if(p.art==='careerDirections'){
  const buttons=[...root.querySelectorAll('[data-career-direction]')];
  const panels=[...root.querySelectorAll('.career-direction-body')];
  const select=(id,save=false)=>{
   buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.careerDirection===id)));
   panels.forEach(panel=>panel.hidden=panel.id!=='career-direction-'+id);
   if(save){answers[step]={careerDirection:id};rememberStep();}
  };
  const saved=answers[step]?.careerDirection||answers[step]?.careerOpen?.[0];
  select(CAREER_PATHS.some(path=>path.id===saved)?saved:CAREER_PATHS[0].id);
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.careerDirection,true)));
 }
 if(p.art==='careerNext'){
  const render=id=>{
   const path=CAREER_PATHS.find(item=>item.id===id);if(!path)return;
   root.querySelector('#career-task').innerHTML=`<h3>${path.task}</h3><ol>${path.steps.map(text=>`<li>${text}</li>`).join('')}</ol><p><strong>${L('留下一个小成果：','Your small result: ')}</strong>${path.result}</p>`;
  };
  const saved=answers[step]?.careerInterest;
  root.querySelectorAll('[name="career-interest"]').forEach(input=>{
   input.checked=input.value===saved;
   input.addEventListener('change',()=>{
    answers[step]={careerInterest:input.value};render(input.value);rememberStep();
    root.querySelector('#career-task').scrollIntoView({block:'nearest'});
   });
  });
  render(saved);
 }
}
;
/* js/mzi.js */
/* 6.1 马赫-曾德尔干涉仪：单个光子经过两个分束器，上方路径带可调相位 φ。
   分束器按 H 门处理：通向探测器 0 的概率幅为 (1 + e^{iφ})/2，通向探测器 1 的为 (1 − e^{iφ})/2。 */
const MZI={
 amplitudes(phi){
  const c=Math.cos(phi),s=Math.sin(phi);
  return [{re:(1+c)/2,im:s/2},{re:(1-c)/2,im:-s/2}];
 },
 probabilities(phi){return MZI.amplitudes(phi).map(a=>a.re*a.re+a.im*a.im)}
};

function mziPhasor(phi,sign){
 // Two contributions of length 1/2: the lower path (0°) and the upper path (φ, flipped for detector 1).
 const L=44,x0=8,y0=48,a2=phi+(sign<0?Math.PI:0);
 const x1=x0+L,y1=y0,x2=x1+L*Math.cos(a2),y2=y1-L*Math.sin(a2);
 const head=(xa,ya,xb,yb)=>{const ang=Math.atan2(yb-ya,xb-xa),h=7;
  return `M${xb} ${yb}L${(xb-h*Math.cos(ang-.45)).toFixed(1)} ${(yb-h*Math.sin(ang-.45)).toFixed(1)}M${xb} ${yb}L${(xb-h*Math.cos(ang+.45)).toFixed(1)} ${(yb-h*Math.sin(ang+.45)).toFixed(1)}`};
 const long=Math.hypot(x2-x0,y2-y0)>3;
 return `<svg class="mzi-phasor" viewBox="0 0 104 96" aria-hidden="true">
  <circle class="mzi-phasor-origin" cx="${x0}" cy="${y0}" r="2.5"/>
  ${long?`<path class="mzi-phasor-sum" d="M${x0} ${y0}L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`:''}
  <path class="mzi-phasor-a" d="M${x0} ${y0}L${x1} ${y1}${head(x0,y0,x1,y1)}"/>
  <path class="mzi-phasor-b" d="M${x1} ${y1}L${x2.toFixed(1)} ${y2.toFixed(1)}${head(x1,y1,x2,y2)}"/>
 </svg>`;
}

function mziScene(p0,p1,deg){
 // English detector labels are wider than the Chinese ones; on phones (24px labels) shrink them slightly to stay inside the 112-unit boxes.
 const detectorFit=L('',' style="font-size:max(14px,min(21px,(560px - 100vw)*1000))"');
 const beam=(d,o,cls='')=>`<path class="mzi-beam ${cls}" d="${d}" style="opacity:${o.toFixed(3)}"/>`;
 return `<svg class="mzi-scene" viewBox="0 -8 640 312" role="img" aria-label="${L('马赫-曾德尔干涉仪：光子源、两个分束器、两面反射镜、上方路径的相位片和两个探测器','Mach–Zehnder interferometer: a photon source, two beam splitters, two mirrors, a phase shifter on the upper path and two detectors')}">
  ${beam('M94 236H170',1)}
  ${beam('M170 236V96H450',.62,'mzi-arm')}
  ${beam('M170 236H450V96',.62,'mzi-arm')}
  ${beam('M450 96H526',Math.max(.08,p0),'mzi-out')}
  ${beam('M450 96V48',Math.max(.08,p1),'mzi-out')}
  <g class="mzi-source"><rect x="4" y="212" width="90" height="48" rx="8"/><text x="49" y="244" text-anchor="middle">${L('光子源','Source')}</text></g>
  <g class="mzi-splitter"><rect x="154" y="220" width="32" height="32" rx="2" transform="rotate(45 170 236)"/><text x="170" y="280" text-anchor="middle">${L('分束器 1','Beam splitter 1')}</text></g>
  <g class="mzi-mirror"><path d="M154 112L186 80"/><text x="170" y="70" text-anchor="middle">${L('反射镜','Mirror')}</text></g>
  <g class="mzi-mirror"><path d="M434 252L466 220"/><text x="450" y="280" text-anchor="middle">${L('反射镜','Mirror')}</text></g>
  <g class="mzi-splitter"><rect x="434" y="80" width="32" height="32" rx="2" transform="rotate(45 450 96)"/><text x="402" y="136" text-anchor="end">${L('分束器 2','Beam splitter 2')}</text></g>
  <g class="mzi-phase"><rect x="282" y="78" width="36" height="36" rx="6"/><text x="300" y="101" text-anchor="middle">φ</text><text class="mzi-phase-value" x="300" y="66" text-anchor="middle">${deg===null?L('相位片','Phase shifter'):L(`相位片 ${deg}°`,`Phase shifter ${deg}°`)}</text></g>
  <text class="mzi-path-label" x="232" y="84" text-anchor="middle">${L('上方路径','Upper path')}</text>
  <text class="mzi-path-label" x="310" y="226" text-anchor="middle">${L('下方路径','Lower path')}</text>
  <g class="mzi-detector" style="--glow:${p0.toFixed(3)}"><rect x="526" y="72" width="112" height="48" rx="8"/><text x="582" y="104" text-anchor="middle"${detectorFit}>${L('探测器 0','Detector 0')}</text></g>
  <g class="mzi-detector" style="--glow:${p1.toFixed(3)}"><rect x="394" y="0" width="112" height="48" rx="8"/><text x="450" y="32" text-anchor="middle"${detectorFit}>${L('探测器 1','Detector 1')}</text></g>
 </svg>`;
}

COMP.mzi=(slot,p)=>{
 const key='mzi-phi';
 let deg=Number.isInteger(S.carry[key])?S.carry[key]:0,counts=null;
 const seen=new Set(S.carry['mzi-seen']||[]);
 slot.innerHTML=`<section class="mzi" aria-label="${L('马赫-曾德尔干涉仪实验','Mach–Zehnder interferometer experiment')}">
  <div class="mzi-figure"></div>
  <label class="mzi-slider"><span>${L('上方路径的相位 φ','Upper-path phase φ')}</span><input type="range" min="0" max="360" step="1" value="${deg}" aria-label="${L('上方路径的相位 φ，单位度','Upper-path phase φ, in degrees')}"><strong class="mzi-deg"></strong></label>
  <div class="mzi-detectors" aria-live="polite"></div>
  <div class="mzi-actions"><button type="button" class="secondary mzi-fire">${L('发射 100 个光子','Send 100 photons')}</button><span class="mzi-counts"></span></div>
  <p class="mzi-note">${L('分束器的作用和 H 门相同；相位片只改变上方路径的相位，相当于给 $|1\\rangle$ 分量乘上 $e^{i\\varphi}$。每个探测器收到的，是两条路径概率幅之和。','A beam splitter acts like an H gate. The phase shifter changes only the upper path’s phase, which multiplies the $|1\\rangle$ part by $e^{i\\varphi}$. Each detector receives the sum of the two paths’ amplitudes.')}</p>
 </section>`;
 const figure=slot.querySelector('.mzi-figure'),range=slot.querySelector('input'),out=slot.querySelector('.mzi-deg'),dets=slot.querySelector('.mzi-detectors'),countsNode=slot.querySelector('.mzi-counts');
 const pct=v=>(Math.abs(v)<5e-4?0:Math.abs(1-v)<5e-4?100:v*100).toFixed(v<5e-4||1-v<5e-4?0:1)+'%';
 function draw(){
  const phi=deg*Math.PI/180,[p0,p1]=MZI.probabilities(phi);
  figure.innerHTML=mziScene(p0,p1,deg);
  out.textContent=deg+'°';
  dets.innerHTML=[[0,p0,1],[1,p1,-1]].map(([i,v,sign])=>`<div class="mzi-detector-card">
   <p class="mzi-detector-name">${L(`探测器 ${i}`,`Detector ${i}`)}</p>${mziPhasor(phi,sign)}
   <p class="mzi-detector-caption">${i===0?L('两条路径的概率幅首尾相接','The two paths’ amplitudes add head to tail'):L('上方路径的贡献多一个负号（箭头反向）','The upper path picks up a minus sign (arrow reversed)')}</p>
   <p class="mzi-detector-prob"><strong>${pct(v)}</strong><span class="mzi-bar"><span style="width:${(v*100).toFixed(2)}%"></span></span></p>
   ${counts?`<p class="mzi-detector-count">${L(`本次接收 ${counts[i]} 个`,`Received this run: ${counts[i]}`)}</p>`:''}</div>`).join('');
  countsNode.textContent=counts?L(`共 ${counts[0]+counts[1]} 个光子：探测器 0 收到 ${counts[0]} 个，探测器 1 收到 ${counts[1]} 个`,`${counts[0]+counts[1]} photons: detector 0 got ${counts[0]}, detector 1 got ${counts[1]}`):'';
  if(deg<=10||deg>=350)seen.add('bright');
  if(deg>=170&&deg<=190)seen.add('dark');
  S.carry[key]=deg;S.carry['mzi-seen']=[...seen];
  check(p,{seen:[...seen],deg,p0,p1});
 }
 range.addEventListener('input',()=>{deg=Number(range.value);counts=null;draw()});
 slot.querySelector('.mzi-fire').onclick=()=>{
  const p0=MZI.probabilities(deg*Math.PI/180)[0];counts=[0,0];
  for(let i=0;i<100;i++)counts[Math.random()<p0?0:1]++;
  draw();
 };
 draw();
 typesetMath(slot.querySelector('.mzi-note'));
};

// Static set-up figure shown before the prediction: no phase value, both exits drawn alike.
ART.mziSetup=()=>`<div class="mzi mzi-setup">${mziScene(.5,.5,null)}</div>`;
;
/* js/studio.js */
/* Required-course experiments. Pure models below are also checked outside the browser. */
// Outside the browser (model checks) i18n.js may not be loaded; fall back to the Chinese source text.
if(typeof globalThis.L!=='function')globalThis.L=zh=>zh;
const STUDIO={sessions:{}};
const studioPct=x=>(100*x).toFixed(Math.abs(x*100-Math.round(x*100))<1e-8?0:1)+'%';
function studioGrover(target,stage){
 let a=[.5,.5,.5,.5];
 for(let step=0;step<stage;step++){
  if(step%2===0)a[target]*=-1;
  else {const mean=a.reduce((x,y)=>x+y,0)/4;a=a.map(x=>2*mean-x);}
 }
 return {amplitudes:a,probabilities:a.map(x=>x*x)};
}
// The same four passwords stay in place throughout the short lesson.
// Only probabilities come from the model; phase marks are explanatory annotations.
function groverLockCards(stage,revealed){
 const probabilities=studioGrover(2,stage).probabilities;
 return `<div class="grover-passwords" role="group" aria-label="${L('四个候选密码','Four candidate codes')}">${['00','01','10','11'].map((label,i)=>`<div class="grover-password${stage>0&&i===2?' is-target':''}">
  <strong class="grover-code">${label}</strong><span class="grover-mark">${stage===1&&i===2?L('− 相位标记','− phase mark'):stage>0&&i===2?L('正确密码','Correct code'):L('候选密码','Candidate code')}</span>
  <span class="grover-meter" aria-hidden="true"><i style="--probability:${revealed?probabilities[i]*100:0}%"></i></span>
  <span class="grover-probability" aria-label="${L(`密码 ${label} 的测量概率 ${revealed?studioPct(probabilities[i]):'待观察'}`,`Measurement probability for code ${label}: ${revealed?studioPct(probabilities[i]):'not shown yet'}`)}">${revealed?studioPct(probabilities[i]):L('待观察','Not yet seen')}</span>
 </div>`).join('')}</div>`;
}
COMP.groverLock=(slot,p)=>{
 const step=S.i,key='grover-lock-'+step;
 let acted=S.carry[key]===true;
 let prediction=Number.isInteger(S.answers[step])&&S.answers[step]>=0&&S.answers[step]<p.o?.length?S.answers[step]:null;
 // Never restore an action without the prediction that was required to unlock it.
 if(p.o&&prediction===null)acted=false;
 function persist(){
  S.carry={...S.carry,[key]:acted};
  S.carrySnapshots[step]={...S.carry};
  rememberStep();
 }
 function draw(focus){
  const answered=prediction!==null,finished=p.action?acted:answered;
  const stage=acted?p.nextStage:p.stage;
  const revealed=p.phase!=='task'&&(p.phase!=='prepare'||answered);
  const caption=p.phase==='task'?L('四选一教学模型','Teaching model: find 1 code out of 4'):p.phase==='recap'?L('回顾：一轮标记＋放大后的理论概率','Recap: theoretical probabilities after one round of mark + amplify'):!revealed?'':stage===0?L('均匀准备后的理论概率','Theoretical probabilities after an equal superposition'):stage===1?L('标记后的理论概率','Theoretical probabilities after marking'):stage===2?L('一轮标记＋放大后的理论概率','Theoretical probabilities after one round of mark + amplify'):L('两轮标记＋放大后的理论概率','Theoretical probabilities after two rounds of mark + amplify');
  slot.innerHTML=`<section class="grover-lock" aria-label="${L('密码锁实验','Combination lock experiment')}">
   ${p.before&&!finished?`<p class="grover-context">${p.before}</p>`:''}
   ${caption?`<p class="grover-caption">${caption}</p>`:''}
   ${groverLockCards(stage,revealed)}
   ${p.o?`<div class="grover-prediction" role="group" aria-label="${p.phase==='recap'?L('选择你的理解','Choose what you think'):L('选择你的预测','Choose your prediction')}">${p.o.map((option,i)=>`<button type="button" class="ghost" data-grover-predict="${i}" aria-pressed="${prediction===i}"${answered?' disabled':''}>${option}</button>`).join('')}</div>`:''}
   <div class="grover-actions">${p.action?`<button type="button" class="primary" data-grover-action${acted||(p.o&&!answered)?' disabled':''}>${acted?L('已完成'+p.action,'Done: '+p.action):p.action}</button>`:''}${finished&&p.action?`<button type="button" class="ghost" data-grover-reset>${L('重试本步','Retry this step')}</button>`:''}</div>
   <div class="grover-result" role="status" tabindex="-1">${finished?`${p.o?`<strong>${prediction===p.a?L('与你的判断一致。','That matches your prediction.'):L('看看实验告诉了我们什么。','Let’s see what the experiment tells us.')}</strong>`:''}<p>${p.after}</p>`:p.action&&answered?L('<p>预测已记录。点击“再做一轮”查看结果。</p>',`<p>Prediction saved. Click “${p.action}” to see the result.</p>`):''}</div>
   ${p.detail&&(finished||p.phase==='task')?`<p class="grover-detail">${p.detail}</p>`:''}
  </section>`;
  const ready=p.phase==='task'||finished;
  S.gateOK=ready;
  if(ready)S.passed[step]=true;else delete S.passed[step];
  const lastPage=S.i>=S.lesson.pages.length-1,completesCourse=p.phase==='recap'&&lastPage&&!courseIsComplete()&&allIds().every(id=>id===S.lesson.id||S.done[id]);
  go(p.phase==='task'?L('开始实验','Start experiment'):p.phase==='recap'&&lastPage?(completesCourse?L('完成学习，查看旅程','Finish and see your journey'):L('进入下一章','Next chapter')):L('继续','Continue'),ready);
  hint(ready?'':p.o&&!answered?L('先选一个想法，猜错也没关系。','Pick an idea first. It’s fine to guess wrong.'):L(`点击“${p.action}”，观察变化。`,`Click “${p.action}” and watch what changes.`));
  slot.querySelectorAll('[data-grover-predict]').forEach(button=>button.onclick=()=>{
   prediction=Number(button.dataset.groverPredict);S.answers[step]=prediction;
   persist();draw(p.action?'[data-grover-action]':'.grover-result');
  });
  slot.querySelector('[data-grover-action]')?.addEventListener('click',()=>{acted=true;persist();draw('.grover-result');});
  slot.querySelector('[data-grover-reset]')?.addEventListener('click',()=>{
   acted=false;prediction=null;delete S.answers[step];persist();draw(p.o?'[data-grover-predict]':'[data-grover-action]');
  });
  if(focus)slot.querySelector(focus)?.focus({preventScroll:true});
 }
 draw();
};
function studioPair(preparation,basis='Z',alice='Z'){
 const starts=preparation==='mixed'?[[1,0,0,0],[0,0,0,1]]:preparation==='bell'?[[Math.SQRT1_2,0,0,Math.SQRT1_2]]:[[.5,.5,.5,.5]];
 return starts.reduce((out,a)=>{
  let state=a.map(re=>({re,im:0}));
  if(alice==='X'||basis==='X')state=ap2(state,'H0');
  if(basis==='X')state=ap2(state,'H1');
  return out.map((v,i)=>v+(state[i].re**2+state[i].im**2)/starts.length);
 },[0,0,0,0]);
}
function studioSyndrome(mask){
 const bits=[(mask>>2)&1,(mask>>1)&1,mask&1],syndrome=[bits[0]^bits[1],bits[1]^bits[2]];
 const correction={'00':0,'10':4,'11':2,'01':1}[syndrome.join('')];
 return {bits,syndrome,correction,residual:mask^correction};
}
function studioLogicalError(p,n){
 let sum=0;
 for(let k=(n+1)/2;k<=n;k++){
  let choose=1;for(let j=1;j<=k;j++)choose*=((n-j+1)/j);
  sum+=choose*p**k*(1-p)**(n-k);
 }
 return sum;
}
function studioPulse(angle){return Math.sin(angle*Math.PI/360)**2;}
function studioSingle(prep,analysis){
 if(prep==='mixed')return [.5,.5];
 let seq=prep==='one'?['X']:prep==='plus'?['H']:prep==='minus'?['H','Z']:[];
 if(analysis==='H')seq.push('H');
 return labProbabilities(1,seq);
}
function studioBars(labels,values,counts){
 return `<div class="studio-bars" role="group" aria-label="${counts?L('理论概率与模拟计数','Theoretical probabilities and simulated counts'):L('理论概率','Theoretical probabilities')}">${labels.map((l,i)=>`<div class="studio-bar"><span>${l}</span><span class="studio-meter"><i style="--probability:${100*values[i]}%"></i></span><strong>${studioPct(values[i])}</strong>${counts?`<small>${L(`${counts[i]} 次`,`${counts[i]} shots`)}</small>`:''}</div>`).join('')}</div>`;
}
const STUDIO_CONTROLS={
 cnot:[['input',L('输入状态','Input state'),[['00','00'],['01','01'],['10','10'],['11','11']]]],
 single:[['prep',L('准备方式','Preparation'),[['zero',L('准备 0','Prepare 0')],['one',L('准备 1','Prepare 1')],['plus',L('同相叠加','In-phase superposition')],['minus',L('反相叠加','Opposite-phase superposition')],['mixed',L('随机准备 0 或 1','Randomly prepare 0 or 1')]]],['analysis',L('读出之前','Before readout'),[['none',L('直接测量','Measure directly')],['H',L('先 H 再测量','Apply H, then measure')]]],['shots',L('重复次数','Shots'),[[1,L('1 次','1 shot')],[32,L('32 次','32 shots')],[512,L('512 次','512 shots')]]]],
 pair:[['prep',L('准备方式','Preparation'),[['independent',L('两个独立叠加态','Two independent superpositions')],['bell',L('贝尔态','Bell state')],['mixed',L('随机准备 00 或 11','Randomly prepare 00 or 11')]]],['basis',L('双方测量设置','Measurement setting (both sides)'),[['Z',L('Z：直接测量','Z: measure directly')],['X',L('X：各加 H 再测量','X: each applies H, then measures')]]]],
 signal:[['alice',L('A 的测量设置','A’s measurement setting'),[['Z',L('A 直接测量','A measures directly')],['X',L('A 先 H 再测量','A applies H, then measures')]]]],
 pulse:[['angle',L('控制脉冲：理想旋转角度','Control pulse: ideal rotation angle'),[[0,L('不加脉冲','No pulse')],[90,L('半程脉冲','Half pulse')],[180,L('完整翻转','Full flip')],[360,L('双倍脉冲','Double pulse')]]]],
 readout:[['state',L('准备的状态','Prepared state'),[[0,L('状态 0','State 0')],[1,L('状态 1','State 1')]]],['quality',L('读出条件','Readout conditions'),[['clear',L('较易区分','Easy to tell apart')],['overlap',L('较难区分','Hard to tell apart')]]]],
 array:[['layout',L('原子位置','Atom positions'),[['holes',L('有空位','With empty sites')],['filled',L('重排补齐','Rearranged to fill')]]],['internal',L('内部状态','Internal state'),[[0,L('准备 0','Prepare 0')],[1,L('准备 1','Prepare 1')]]]],
 blockade:[['first',L('第一个原子','First atom'),[['ground',L('未激发','Not excited')],['rydberg',L('里德堡激发','Rydberg excited')]]],['distance',L('相互作用条件','Interaction'),[['near',L('强相互作用','Strong interaction')],['far',L('弱相互作用','Weak interaction')]]]],
 loss:[['logical',L('编码状态','Encoded state'),[[0,L('逻辑 0','Logical 0')],[1,L('逻辑 1','Logical 1')]]],['efficiency',L('探测到的概率','Detection probability'),[[1,'100%'],[.8,'80%'],[.4,'40%']]]],
 syndrome:[['mask',L('选择翻转错误的位置','Where to inject a flip error'),[[0,L('无错误','No error')],[4,L('第 1 位','Bit 1')],[2,L('第 2 位','Bit 2')],[1,L('第 3 位','Bit 3')],[3,L('第 2、3 位','Bits 2 and 3')]]]],
 protection:[['p',L('每位独立翻转概率','Flip probability per bit (independent)'),[[.01,'1%'],[.1,'10%'],[.4,'40%'],[.6,'60%']]],['n',L('编码使用的位数','Bits used in the code'),[[1,L('1 位','1 bit')],[3,L('3 位','3 bits')],[5,L('5 位','5 bits')]]]],
 grover:[['target',L('演示中的目标','Target in this demo'),[[0,'00'],[1,'01'],[2,'10'],[3,'11']]],['stage',L('算法步骤','Algorithm step'),[[0,L('均匀准备','Equal superposition')],[1,L('只做标记','Mark only')],[2,L('一次放大','Amplify once')],[4,L('再做一轮','One more round')]]]],
 compile:[['input',L('输入准备','Input preparation'),[['zero','00'],['one','10'],['bell',L('q0 先做 H','H on q0 first')]]]]
};
function studioView(kind,m,p){
 let html='',probs=null,labels=['0','1'],note='',caption=L('理想模型的理论概率','Theoretical probabilities (ideal model)');
 if(kind==='single'){
  probs=studioSingle(m.prep,m.analysis);
  html=`<p class="experiment-context">${m.analysis==='H'?L('准备后施加 H，再测量。','Prepare, apply H, then measure.'):L('准备后直接测量。','Prepare, then measure directly.')}${L('每次采样都重新准备同一个初态。',' Every shot starts from a freshly prepared copy of the same initial state.')}</p>`;
  note=m.prep==='mixed'?L('每次随机准备确定的 0 或 1。即使先做 H，整体统计仍是各半。','Each shot randomly prepares a definite 0 or 1. Even with H first, the overall statistics stay 50/50.'):m.prep==='zero'||m.prep==='one'?L('直接测量可以区分准备好的 0 和 1；加上 H 后，两种结果的概率都变为各半。','Direct measurement tells a prepared 0 from a prepared 1. Add H, and both outcomes become 50/50.'):L('同相与反相叠加直接测量都是各半；先做 H 后，两者可产生不同结果。测量设置同样参与决定结果。','In-phase and opposite-phase superpositions both give 50/50 when measured directly. With H first, they can give different outcomes. The measurement setting also helps decide the outcome.');
 }else if(kind==='cnot'){
  const control=Number(m.input[0]),target=Number(m.input[1]),output=`${control}${target^control}`;
  const preparation=[...(control?['X0']:[]),...(target?['X1']:[])];
  html=`<div class="qb-state-flow" aria-label="${L(`输入 ${m.input}，经过 CNOT，输出 ${output}`,`Input ${m.input}, through CNOT, output ${output}`)}"><span>${L('输入','Input')}<br><strong>|${m.input}⟩</strong></span><span>→ CNOT →</span><span>${L('输出','Output')}<br><strong>|${output}⟩</strong></span></div>${labCircuit({n:2,seq:[...preparation,'CNOT'],static:true})}<p class="cap">${L('从 |00⟩ 出发，用 X 门准备所选输入，再执行 CNOT。','Start from |00⟩, use X gates to prepare the chosen input, then apply CNOT.')}</p>`;
  note=L(`左边是控制位 q0，右边是目标位 q1。控制位为 ${control}，所以目标位${control?'从 '+target+' 翻转为 '+(target^control):'保持 '+target+' 不变'}；控制位本身不变。`,`The left digit is the control qubit q0; the right digit is the target qubit q1. The control is ${control}, so the target ${control?'flips from '+target+' to '+(target^control):'stays '+target}. The control itself does not change.`);
 }else if(kind==='pair'||kind==='signal'){
  probs=studioPair(kind==='signal'?'bell':m.prep,kind==='signal'?'Z':m.basis,kind==='signal'?m.alice:'Z');labels=['00','01','10','11'];
  const b0=probs[0]+probs[2];
  html=`<p class="studio-callout">${L(`B 独自看到：0 为 ${studioPct(b0)}，1 为 ${studioPct(1-b0)}。`,`What B sees alone: 0 is ${studioPct(b0)}, 1 is ${studioPct(1-b0)}.`)}</p>`;
  note=kind==='signal'?L('两人的联合统计会改变，但 B 的本地分布仍然各半。只有交换记录后，才能比较关联；A 不能靠选择测量设置把消息写进 B 的本地统计。','The joint statistics change, but B’s local distribution stays 50/50. The correlation shows up only after the two compare records; A cannot write a message into B’s local statistics by choosing a measurement setting.'):L('随机准备 00 或 11 与贝尔态在 Z 设置下相同；在双方 X 设置下，这两个特定准备会表现不同。这是对已知候选准备的比较，不是任意未知态的通用认证。','Randomly preparing 00 or 11 looks the same as a Bell state under the Z setting. With both sides on the X setting, these two specific preparations behave differently. This compares known candidate preparations; it is not a general test for any unknown state.');
 }else if(kind==='pulse'){
  const v=studioPulse(m.angle);
  const superposed=v>1e-8&&v<1-1e-8;
  const state=superposed?'α|0⟩ + β|1⟩':v>.5?'|1⟩':'|0⟩';
  html=`<svg viewBox="0 0 360 165" class="studio-svg" role="img" aria-label="${L('两个基态的能级示意：下方为基态 0，上方为基态 1；控制脉冲耦合两个基态，不表示脉冲后的量子态','Energy levels of two basis states: basis state 0 below, basis state 1 above. The control pulse couples the two basis states; the picture does not show the state after the pulse.')}"><path d="M70 125H280M70 35H280" stroke="currentColor" stroke-width="0.5"/><path d="M175 110V50m-5 8 5-8 5 8M175 110l-5-8m5 8 5-8" stroke="var(--course-accent-11)" stroke-width="0.5" fill="none"/><text x="12" y="130">|0⟩</text><text x="12" y="40">|1⟩</text><text x="195" y="85">${L('控制脉冲','Control pulse')}</text></svg><p class="cap">${L('两条线表示两个基态的能级，叠加态不是它们之间的第三个能级。','The two lines are the energy levels of the two basis states. A superposition is not a third level between them.')}</p><p class="studio-callout">${L('脉冲后的状态：','State after the pulse: ')}${state}</p><p class="experiment-context">${superposed?L('α、β 是两个基态分量的概率幅。半程脉冲后，两者的大小均为 1/√2；相对相位由控制脉冲决定。','α and β are the amplitudes of the two basis-state components. After a half pulse, both have magnitude 1/√2; the control pulse sets the relative phase.'):L('此时处于 '+(v>.5?'|1⟩':'|0⟩')+'。','The qubit is now in '+(v>.5?'|1⟩':'|0⟩')+'.')}</p>`;
  note=(p.route==='ion'?L('离子内部态可由合适的激光或微波操控。','An ion’s internal states can be driven by suitable laser or microwave signals.'):L('超导电路可由合适的微波信号操控。','A superconducting circuit can be driven by suitable microwave signals.'))+L('这里从 |0⟩ 开始，使用理想两能级旋转模型，状态表示省略整体相位。此模型没有使用真实设备脉冲参数。',' Here we start from |0⟩ and use an ideal two-level rotation model; the state is written without its global phase. This model does not use real device pulse parameters.');
 }else if(kind==='readout'){
  const error=m.quality==='clear'?.04:.25;probs=m.state?[error,1-error]:[1-error,error];
  const ion=p.route==='ion';
  html=`<div class="studio-detector"><span>${ion?L('收集荧光','Collected fluorescence'):L('测量读出信号','Readout signal')}</span><strong>${ion?(m.state?L('较亮','Brighter'):L('较暗','Dimmer')):(m.state?L('信号区域 B','Signal region B'):L('信号区域 A','Signal region A'))}</strong><small>${m.quality==='clear'?L('两类信号较容易区分','The two signals are easy to tell apart'):L('两类信号有更多重叠','The two signals overlap more')}</small></div>`;
  caption=L('模型中的记录概率','Recorded probabilities in the model');note=(ion?L('在此示例中用亮／暗区分两种内部态。','In this example, bright vs. dark tells the two internal states apart.'):L('在此示例中通过与读出装置耦合产生的信号区分两种状态。','In this example, a signal produced by coupling to the readout device tells the two states apart.'))+L('设定的 4%／25% 误判概率仅用于教学，并非设备指标；一次记录仍可能记错。',' The 4% / 25% error rates are set for teaching only and are not device specs; any single record can still be wrong.');
 }else if(kind==='array'){
  html=`<div class="studio-array" aria-label="${L('六个光镊位置','Six optical tweezer sites')}">${[0,1,2,3,4,5].map(i=>`<span class="${m.layout==='holes'&&[1,4].includes(i)?'empty':''}">${m.layout==='holes'&&[1,4].includes(i)?L('空位','Empty'):m.internal}</span>`).join('')}</div>`;
  note=L('重排改变原子占据的位置，内部态准备改变已有原子承载的逻辑状态。这里“补齐”表示从未画出的储备位置移入原子，不是凭空产生原子；数字不是直接成像读出的未知态。','Rearranging changes which sites hold atoms; preparing the internal state changes the logical state each atom carries. Here “fill” means moving in atoms from reserve sites not drawn here; no atoms appear from nothing. The numbers are not an unknown state read out by imaging.');
 }else if(kind==='blockade'){
  const blocked=m.first==='rydberg'&&m.distance==='near';
  html=`<svg viewBox="0 0 420 230" class="studio-svg" role="img" aria-label="${blocked?L('原子 A 激发后，B 的激发能量发生偏移，同一激光难以激发 B','After atom A is excited, B’s excitation energy shifts, so the same laser can hardly excite B'):L('B 的目标能级与激光匹配，未出现本例的阻塞','B’s target level matches the laser; no blockade in this example')}"><circle cx="65" cy="108" r="${m.first==='rydberg'?30:13}" fill="var(--course-accent-9)" stroke="currentColor" stroke-width="0.5"/><text x="65" y="168" text-anchor="middle">${L('原子 A','Atom A')}</text><path d="M220 180H365M220 ${blocked?35:85}H365" stroke="currentColor" stroke-width="0.5"/><path d="M220 85H365" stroke="var(--course-neutral-9)" stroke-dasharray="5 5"/><path d="M290 168V94m0 0-6 10m6-10 6 10" stroke="var(--course-accent-11)" stroke-width="0.5" fill="none"/><text x="290" y="211" text-anchor="middle">${L('原子 B','Atom B')}</text><text x="205" y="78" text-anchor="end">${L('激光匹配位置','Laser-matched level')}</text>${blocked?`<path d="M375 80V40m0 0-5 8m5-8 5 8" stroke="var(--red-11)" stroke-width="0.5"/><text x="290" y="23" text-anchor="middle">${L('能量偏移','Energy shift')}</text>`:''}</svg><p class="experiment-context">${blocked?L('A 的里德堡激发使 B 的激发条件偏离激光，第二次激发受到抑制。','A’s Rydberg excitation pushes B’s excitation condition away from the laser, so the second excitation is suppressed.'):L('B 的激发仍与激光匹配，没有受到本例的阻塞。','B’s excitation still matches the laser, so there is no blockade in this example.')}</p>`;
  note=L('里德堡态之间的强相互作用会改变双激发的能量条件，使同样的激光不再容易激发第二个原子。这是理想化阻塞示意；利用它实现门还需要完整控制序列，相互作用也不是由一个距离开关突然出现。','Strong interaction between Rydberg states changes the energy condition for exciting both atoms, so the same laser no longer easily excites the second one. This is an idealized blockade sketch: building a gate from it needs a full control sequence, and the interaction does not suddenly switch on at one distance.');
 }else if(kind==='loss'){
  probs=m.logical?[0,m.efficiency,1-m.efficiency]:[m.efficiency,0,1-m.efficiency];labels=[L('记录 0','Recorded 0'),L('记录 1','Recorded 1'),L('未探测到','Not detected')];caption=L('探测概率（教学模型）','Detection probabilities (teaching model)');
  html='';
  note=p.route==='atom'?L('本简化模型把“未探测到”独立列出，可能来自丢失或探测失败。具体读出协议还需区分内部态与占据情况；空位不能不加判断就记成逻辑 0。','This simplified model lists “not detected” separately; it can come from atom loss or a failed detection. A real readout protocol must also tell internal state apart from occupancy; an empty site cannot simply be recorded as logical 0.'):L('即使准备的是逻辑 1，探测器也可能没有响应。没有响应并不表示读出了 0；这里合并了传播损失和探测失败，不模拟所有光子噪声。','Even when logical 1 is prepared, the detector may not respond. No response does not mean a 0 was read out. This model lumps together transmission loss and detection failure, and does not simulate every kind of photon noise.');
 }else if(kind==='syndrome'){
  const x=studioSyndrome(m.mask);
  html=`<div class="studio-array three">${x.bits.map((e,i)=>`<span class="${e?'error':''}">${L(`第 ${i+1} 位`,`Bit ${i+1}`)}<br>${e?L('有翻转','Flipped'):L('无翻转','No flip')}</span>`).join('')}</div><p class="experiment-context">${L(`第 1、2 位${x.syndrome[0]?'不同':'相同'}；第 2、3 位${x.syndrome[1]?'不同':'相同'}。`,`Bits 1 and 2 are ${x.syndrome[0]?'different':'the same'}; bits 2 and 3 are ${x.syndrome[1]?'different':'the same'}.`)}<br>${x.correction?L('假设最多一位出错，因此尝试纠正第 '+(x.correction===4?1:x.correction===2?2:3)+' 位。','Assuming at most one bit is wrong, we try to correct bit '+(x.correction===4?1:x.correction===2?2:3)+'.'):L('没有检测到差异，不作纠正。','No difference detected, so no correction.')}</p><p class="studio-callout">${x.residual?L('本次恢复失败：多个错误可伪装成另一个单错。','Recovery failed this time: several errors can look like a different single error.'):L('本例恢复成功。','Recovery succeeded in this example.')}</p>`;
  note=L('图中显示人为注入的错误位置，而不是读出未知的逻辑答案。比较结果是错误信息；在量子版本中通过辅助比特提取这类信息。此模型只处理比特翻转，不能保护任意相位错误；编码也不是复制未知量子态。','The figure shows errors we injected on purpose; it does not read out an unknown logical answer. The comparison results are information about errors; in the quantum version, helper (ancilla) qubits extract this information. This model handles only bit flips and cannot protect against arbitrary phase errors. Encoding is also not copying an unknown quantum state.');
 }else if(kind==='protection'){
  probs=[m.p,studioLogicalError(m.p,m.n)];labels=[L('单个物理位错误','Single physical bit error'),L('编码后逻辑错误','Logical error after encoding')];
  html=`<p class="studio-callout">${L(`用 ${m.n} 个物理位保护 1 个逻辑位。`,`${m.n} physical bits protect 1 logical bit.`)}</p>`;
  note=L('这个演示只考虑各个比特独立发生的翻转错误，并假设编码和纠错过程不会出错。我们按多数表决计算恢复结果：单个比特的翻转概率低于 50% 时，多用几个比特才有帮助。这个 50% 只属于当前模型。真实量子纠错还要应对相位错误、多个比特一起出错，以及纠错操作自身的错误；要实现容错计算，还需要反复纠错，并可靠地执行逻辑门。','This demo considers only flip errors that hit each bit independently, and assumes encoding and correction never go wrong. We recover by majority vote: using more bits helps only when each bit’s flip probability is below 50%. That 50% belongs to this model only. Real quantum error correction must also handle phase errors, errors on several qubits at once, and errors in the correction steps themselves. Fault-tolerant computing further needs repeated correction and reliable logical gates.');
 }else if(kind==='grover'){
  const g=studioGrover(m.target,m.stage);probs=g.probabilities;labels=['00','01','10','11'];
  html=`<div class="studio-amplitudes">${g.amplitudes.map((a,i)=>`<div><span>${labels[i]}${i===m.target?L('（目标）',' (target)'):''}</span><strong>${a>0?'+':''}${a.toFixed(2)}</strong><span class="studio-signed ${a<0?'negative':''}" style="--size:${Math.abs(a)*100}%"></span></div>`).join('')}</div><p class="cap">${L('带方向的概率幅：正负表示相对相位；下方概率是其平方。','Signed amplitudes: the sign shows relative phase; the probabilities below are their squares.')}</p>`;
  note=L('这里用四个候选密码、一个正确密码演示理想 Grover 算法。你选择的密码用于设置标记操作；图中的“目标”标签方便你观察结果。只做标记时，概率不变；再通过干涉，正确密码的概率才可能提高。','Here four candidate codes, one of them correct, demonstrate the ideal Grover algorithm. The code you choose sets up the marking step; the “target” label helps you follow the result. Marking alone leaves the probabilities unchanged; only through interference can the correct code’s probability rise.');
 }else if(kind==='compile'){
   const prefix=m.input==='one'?['X0']:m.input==='bell'?['H0']:[];
   const before=labProbabilities(2,[...prefix,'CNOT']),after=labProbabilities(2,[...prefix,'H1','CZ','H1']);
   const preparation=m.input==='one'?L('从 10 开始','Start from 10'):m.input==='bell'?L('从 00 开始，先对 q0 做 H','Start from 00 and apply H to q0 first'):L('从 00 开始','Start from 00');
   html=`<p class="compile-context">${L(`${preparation}，再分别执行 CNOT 与 H → CZ → H。`,`${preparation}, then run CNOT and, separately, H → CZ → H.`)}</p><table class="compile-probabilities"><caption>${L('理想输出概率（按 q0、q1 排列）','Ideal output probabilities (ordered q0, q1)')}</caption><thead><tr><th scope="col">${L('测量结果','Outcome')}</th><th scope="col">CNOT</th><th scope="col">H → CZ → H</th></tr></thead><tbody>${['00','01','10','11'].map((label,i)=>`<tr${before[i]>1e-12?' class="has-probability"':''}><th scope="row">${label}</th><td>${studioPct(before[i])}</td><td>${studioPct(after[i])}</td></tr>`).join('')}</tbody></table>`;
   note=L('这些输入帮助我们观察结果；所有输入都等价，需要数学推导来保证。','These inputs help us observe the results; showing that the two agree on every input takes a mathematical derivation.');
 }
 if(p.note)note=p.note;
 if(probs)html+=`<p class="studio-label">${caption}</p>${studioBars(labels,probs,m.counts)}`;
 return {html,note,probs};
}
COMP.studio=(slot,p)=>{
 const key=S.lesson.id+':'+(p.key||S.i),controls=p.controls||STUDIO_CONTROLS[p.kind];
 const defaults=Object.fromEntries(controls.map(([id,,options])=>[id,options[0][0]]));
 const m=STUDIO.sessions[key]||(STUDIO.sessions[key]={...defaults,...p.initial,visited:[],observed:[],runs:0,counts:null});
 const remember=()=>{const signature=JSON.stringify(controls.map(([id])=>m[id]));if(!m.visited.includes(signature))m.visited.push(signature);m.observed.push(Object.fromEntries(controls.map(([id])=>[id,m[id]])));};
 function draw(){
  const view=studioView(p.kind,m,p),canSample=view.probs&&p.kind!=='protection'&&p.sample!==false;
  slot.innerHTML=`<section class="studio${p.kind==='compile'?' studio-compile':''}" aria-label="${L('互动实验','Interactive experiment')}"><div class="studio-controls">${controls.map(([id,label,options])=>p.buttons?`<fieldset class="studio-options"><legend>${label}</legend>${options.map(([v,text])=>`<button type="button" data-choice="${id}" data-value="${v}" aria-pressed="${m[id]===v}">${text}</button>`).join('')}</fieldset>`:`<label class="studio-setting"><span>${label}</span><select data-control="${id}" aria-label="${label}">${options.map(([v,text])=>`<option value="${v}"${m[id]===v?' selected':''}>${text}</option>`).join('')}</select></label>`).join('')}</div><div class="studio-output" aria-live="polite">${view.html}<p class="studio-note">${view.note}</p></div>${canSample?`<button type="button" class="secondary" data-studio-run>${L(`重新准备并模拟 ${m.shots||128} 次`,`Re-prepare and simulate ${m.shots||128} shots`)}</button><p class="cap">${m.counts?L('改变条件后需重新采样。','Sample again after changing settings.'):L('计数来自模拟采样。','Counts come from simulated sampling.')}</p>`:''}</section>`;
  slot.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
   const id=button.dataset.choice,options=controls.find(c=>c[0]===id)[2];
   m[id]=options.find(([v])=>String(v)===button.dataset.value)[0];
   m.counts=null;remember();draw();
   slot.querySelector(`[data-choice="${id}"][data-value="${button.dataset.value}"]`)?.focus({preventScroll:true});
  });
  slot.querySelectorAll('[data-control]').forEach(control=>control.onchange=()=>{
   const id=control.dataset.control,options=controls.find(c=>c[0]===id)[2];
   m[id]=options.find(([v])=>String(v)===control.value)[0];
   m.counts=null;remember();draw();
   slot.querySelector(`[data-control="${id}"]`)?.focus({preventScroll:true});
  });
  slot.querySelector('[data-studio-run]')?.addEventListener('click',()=>{m.counts=labSample(view.probs,m.shots||128);m.runs++;remember();draw();slot.querySelector('[data-studio-run]')?.focus({preventScroll:true});});
  typesetMath(slot);
  slot.querySelectorAll('.lab-node').forEach(b=>b.disabled=true);
  const observed=(p.observe||[]).filter(rule=>m.observed.some(state=>Object.entries(rule).every(([k,v])=>state[k]===v))).length;
  const ready=(!p.sample||m.runs>0)&&observed===(p.observe||[]).length&&m.visited.length>=(p.minSettings||0);
  if(!ready){
   const remaining=[];
   if(m.visited.length<(p.minSettings||0))remaining.push(L('请查看至少 '+p.minSettings+' 种设置','Try at least '+p.minSettings+' settings'));
   if(p.observe&&observed<p.observe.length)remaining.push(L(`已查看 ${observed} / ${p.observe.length} 种设置`,`Checked ${observed} / ${p.observe.length} settings`));
   if(p.sample&&!m.runs)remaining.push(L('请运行一次模拟','Run the simulation once'));
   hint(remaining.join(L('；','; '))+L('。','.'));
  }
  if(ready)pass(p.pm||'');
 }
 remember();draw();
};
ART.compileDevices=()=>`<section class="studio-compile compile-devices" aria-label="${L('两种设备实现同一个 CNOT','Two devices carry out the same CNOT')}"><p class="compile-context">${L('我们要完成的操作：用 q0 控制，对 q1 做 CNOT。','The operation we want: a CNOT with q0 as control and q1 as target.')}</p><div class="compile-circuits"><div><h3>${L('设备支持 CNOT','Device supports CNOT')}</h3><div class="lab-circuit compile-fatqat"><img src="assets/circuits/fatqat-cnot.svg" alt="${L('FatQat 线路图：上方 q0 为控制位，下方 q1 为目标位，执行一个 CNOT。','FatQat circuit: q0 on top is the control, q1 below is the target, and one CNOT is applied.')}"></div><p>${L('直接执行 1 个 CNOT。','Run 1 CNOT directly.')}</p></div><div><h3>${L('设备支持 H 和 CZ','Device supports H and CZ')}</h3><div class="lab-circuit compile-fatqat"><img src="assets/circuits/fatqat-h-cz-h.svg" alt="${L('FatQat 线路图：在下方 q1 上执行 H，然后在 q0、q1 之间执行 CZ，最后在 q1 上执行 H。','FatQat circuit: H on q1 (bottom), then CZ between q0 and q1, then H on q1 again.')}"></div><p>${L('在 q1 上先做 H，再做 CZ，最后再在 q1 上做 H。','Apply H on q1, then CZ, then H on q1 again.')}</p></div></div></section>`;
// Existing real-device photos keep their source captions.
ART.hardwareRoute=p=>ROUTE_ART[p.route]();
;
/* js/entanglement-circuits.js */
/* Circuit illustrations share one renderer with the live chapter-3 experiments.
   A measurement changes a single quantum wire into a double classical wire.
   Classical controls are drawn explicitly; an assumed cloning device remains a dashed box. */
function entCircuitSVG({wires,columns,title,caption='',output=[],classicalReceived=false}){
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const top=34,row=64,start=112,ys=wires.map((_,i)=>top+i*row);
 let edge=start;
 const xs=columns.map(column=>{const width=column.width||48;const x=edge+width/2;edge+=width;return x;});
 const width=Math.max(256,edge+88),height=top*2+row*(wires.length-1)+12;
 const meterAt=wires.map((_,q)=>columns.findIndex(c=>c.ops.some(op=>op.type==='measure'&&op.wire===q)));
 const path=(d,cls='')=>`<path class="${cls}" d="${d}"/>`;
 let lines='',nodes='';
 wires.forEach((wire,q)=>{
  const y=ys[q],meter=meterAt[q],end=width-50;
  lines+=path(`M95 ${y}H${meter<0?end:xs[meter]}`,'qc-quantum');
  if(meter>=0)lines+=path(`M${xs[meter]+17} ${y-2}H${end}M${xs[meter]+17} ${y+2}H${end}`,'qc-classical');
  nodes+=`${wire.owner?`<text class="qc-owner" x="6" y="${y-18}">${escape(wire.owner)}</text>`:''}<text class="qc-wire-label" x="6" y="${y+5}">${escape(wire.name||'q'+q)}</text><text class="qc-state" x="57" y="${y+5}" text-anchor="middle">${escape(wire.input||'')}</text>`;
  if(output[q])nodes+=`<text class="qc-output" x="${end+6}" y="${y+5}">${escape(output[q])}</text>`;
 });
 columns.forEach((column,col)=>column.ops.forEach(op=>{
  const x=xs[col],y=ys[op.wire],status=op.active===true?' qc-complete':op.active===false?' qc-pending':'';
  if(op.type==='cx'){
   const sy=ys[op.control];
   lines+=path(`M${x} ${sy}V${y}`,'qc-control'+status);
   nodes+=`<g class="qc-op qc-cx${status}" data-qc-kind="cx" data-qc-control="${op.control}" data-qc-target="${op.wire}"><circle class="qc-dot" cx="${x}" cy="${sy}" r="4"/><circle class="qc-target" cx="${x}" cy="${y}" r="12"/>${path(`M${x-12} ${y}H${x+12}M${x} ${y-12}V${y+12}`)}</g>`;
  }else if(op.type==='span'){
   const low=ys[op.to],h=low-y+36,w=(column.width||100)-12;
   nodes+=`<g class="qc-op qc-assumed" data-qc-kind="assumed"><rect x="${x-w/2}" y="${y-18}" width="${w}" height="${h}" rx="3"/><text x="${x}" y="${(low+y)/2+5}" text-anchor="middle">${escape(op.label)}</text></g>`;
  }else if(op.type==='measure'){
   nodes+=`<g class="qc-op qc-measure${status}" data-qc-kind="measure" data-qc-wire="${op.wire}"><rect x="${x-17}" y="${y-17}" width="34" height="34" rx="3"/>${path(`M${x-11} ${y+9}A11 11 0 0 1 ${x+11} ${y+9}M${x} ${y+9}L${x+8} ${y-10}M${x+8} ${y-10}L${x+3} ${y-7}M${x+8} ${y-10}L${x+9} ${y-4}`)}</g>`;
  }else{
   if(op.source!==undefined){
    const sourceY=ys[op.source];
    lines+=path(`M${x-2} ${sourceY}V${y-18}M${x+2} ${sourceY}V${y-18}`,'qc-classical-control'+(classicalReceived?' qc-complete':''));
    nodes+=`<g data-qc-kind="classical-control" data-qc-source="${op.source}" data-qc-target="${op.wire}"><circle class="qc-dot" cx="${x}" cy="${sourceY}" r="3"/></g>`;
   }
   nodes+=`<g class="qc-op qc-gate${status}" data-qc-kind="gate" data-qc-wire="${op.wire}"><rect x="${x-17}" y="${y-17}" width="34" height="34" rx="2"/><text x="${x}" y="${y+6}" text-anchor="middle">${op.label==='Xr'?'X<tspan dy="-7" font-size="12">r</tspan>':escape(op.label)}</text>${op.skipped?`<text class="qc-small" x="${x}" y="${y+34}" text-anchor="middle">${L('跳过','skipped')}</text>`:''}</g>`;
  }
 }));
 return `<figure class="qc-figure"><div class="qc-scroll" tabindex="0" role="region" aria-label="${escape(title)}${L('，线路从左向右读，可横向滚动','. Read the circuit left to right; scroll sideways to see it all')}"><svg class="qc-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}">${lines}${nodes}</svg></div>${caption?`<figcaption>${caption}</figcaption>`:''}</figure>`;
}
function entPairCircuit(prep='independent',basis='Z',{measured=true,stage=null}={}){
 const wires=[{input:'|0⟩'},{input:'|0⟩'}],columns=[];
 const gate=(wire,label)=>({type:'gate',wire,label});
 let caption='',title='';
 if(prep==='independent'){
  columns.push({ops:[gate(0,'H'),gate(1,'H')]});
  title=L('两个零态分别经过 H','Each |0⟩ goes through its own H');caption=L('两条线上分别施加 H，各自准备$|+\\rangle$。','An H on each wire prepares $|+\\rangle$ on each one separately.');
 }else if(prep==='mixed'){
  columns.push({ops:[gate(0,'Xr'),gate(1,'Xr')]});
  title=L('同一个经典随机位 r 控制两条线上的 X','One shared classical random bit r controls the X on both wires');caption=L('r 是同一个经典随机位，0、1 各半。r=0 时两个 X 都不执行，准备 00；r=1 时两个 X 都执行，准备 11。','r is one shared classical random bit: 0 or 1, half the time each. When r=0, neither X runs and you get 00; when r=1, both X gates run and you get 11.');
 }else{
  if(stage===null||stage>=1)columns.push({ops:[gate(0,'H')]});
  if(stage===null||stage>=2)columns.push({ops:[{type:'cx',wire:1,control:0}]});
  title=L('从两个零态制备贝尔态','Preparing a Bell state from two |0⟩ qubits');
 }
 if(basis==='X'){columns.push({ops:[gate(0,'H'),gate(1,'H')]});caption+=L('读出前双方各加 H，改变测量设置。',' Before readout, each side adds an H to change the measurement setting.');}
 if(measured){columns.push({ops:[{type:'measure',wire:0},{type:'measure',wire:1}]});caption+=L('表盘符号表示计算基测量；双线承载经典结果。',' The meter symbol is a computational-basis measurement; double lines carry the classical result.');}
 return entCircuitSVG({wires,columns,title,caption,output:measured?['c₀','c₁']:[]});
}
function entCandidateCircuit(input='|ψ⟩'){
 return entCircuitSVG({wires:[{input},{input:'|0⟩'}],columns:[{width:132,ops:[{type:'span',wire:0,to:1,label:L('候选机器 U','Candidate U')}]}],title:L('一个任意输入态与一个零态一起进入同一台候选机器 U','An arbitrary input state and a |0⟩ go into the same candidate machine U'),caption:L('虚线框是假设中的通用机器，内部操作未知；不是已经实现的复制线路。','The dashed box is a hypothetical universal machine whose inner workings are unknown. It is not a copying circuit anyone has built.')});
}
function entTeleportCircuit(m=null,resources=false){
 const op=(type,wire,extra={},active=true)=>({type,wire,...extra,...(m?{active}:{})});
 const columns=[{ops:[op('gate',1,{label:'H'})]},{ops:[op('cx',2,{control:1})]}];
 if(!resources)columns.push(
  {ops:[op('cx',1,{control:0},m?.stage>=1)]},
  {ops:[op('gate',0,{label:'H'},m?.stage>=2)]},
  {ops:[op('measure',0,{},m?.stage>=3),op('measure',1,{},m?.stage>=3)]},
  {ops:[op('gate',2,{label:'X',source:1,skipped:m?.stage===5&&!m.gates.includes('X')},m?.gates.includes('X'))]},
  {ops:[op('gate',2,{label:'Z',source:0,skipped:m?.stage===5&&!m.gates.includes('Z')},m?.gates.includes('Z'))]}
 );
 const bits=m?.outcome!==null&&m?.outcome!==undefined?m.outcome.toString(2).padStart(2,'0'):null;
 return entCircuitSVG({wires:[{name:'q0',owner:'Alice',input:'|ψ⟩'},{name:'q1',input:'|0⟩'},{name:'q2',owner:'Bob',input:'|0⟩'}],columns,title:resources?L('传态资源：q₀ 是输入，提前用 H 和 CNOT 在 q₁、q₂ 间制备贝尔态','Teleportation resource: q₀ is the input; H and CNOT prepare a Bell state between q₁ and q₂ in advance'):L('量子隐形传态完整线路；q₁ 的测量结果控制 Bob 的 X，q₀ 的测量结果控制 Bob 的 Z','Full quantum teleportation circuit; the outcome of q₁ controls Bob’s X and the outcome of q₀ controls Bob’s Z'),caption:resources?L('最左侧两步提前制备共享贝尔态，之后 q₁、q₂ 分别由 Alice 和 Bob 持有。q₀ 是另一个待传输入。','The two leftmost steps prepare a shared Bell state in advance; then Alice holds q₁ and Bob holds q₂. q₀ is a separate input to be sent.'):L('从左向右：预共享纠缠 → Alice 的 CNOT、H 与测量 → 经典通信 → Bob 的条件修正。双线从 q₁ 连到 X，从 q₀ 连到 Z。','Left to right: pre-shared entanglement → Alice’s CNOT, H and measurement → classical message → Bob’s conditional corrections. Double lines run from q₁ to X and from q₀ to Z.')+(m?L('绿色为已执行的门；灰色为尚未执行或无需执行的门。',' Green gates have run; gray gates have not run yet or are not needed.'):''),output:resources?[]:[bits?bits[0]:'m₀',bits?bits[1]:'m₁',m?.stage===5?'|ψ⟩':''],classicalReceived:m?.stage>=4});
}
function entLessonCircuit(kind){
 if(kind.startsWith('cnot'))return entCircuitSVG({wires:[{input:kind==='cnot10'?'|1⟩':'|0⟩'},{input:'|0⟩'}],columns:[{ops:[{type:'cx',control:0,wire:1}]}],title:L('q₀ 控制 q₁ 的 CNOT','CNOT with q₀ controlling q₁')});
 if(kind==='bell')return entPairCircuit('bell','Z',{measured:false});
 if(kind==='bell-measured')return entPairCircuit('bell');
 if(kind==='pair-Z'||kind==='pair-X')return `<div class="qc-comparison"><section><h3>${L('贝尔态','Bell state')}</h3>${entPairCircuit('bell',kind.slice(-1))}</section><section><h3>${L('随机准备 00 或 11','Random 00 or 11')}</h3>${entPairCircuit('mixed',kind.slice(-1))}</section></div>`;
 if(kind==='candidate')return entCandidateCircuit();
 if(kind==='teleport-prepare')return entCircuitSVG({
  wires:[{name:'Q',owner:'Alice',input:'|ψ⟩'},{name:'A'},{name:'B',owner:'Bob'}],
  columns:[
   {ops:[{type:'cx',control:0,wire:1,active:true}]},
   {ops:[{type:'gate',wire:0,label:'H',active:true}]},
   {ops:[{type:'measure',wire:0},{type:'measure',wire:1}]}
  ],output:['a','b',''],
  title:L('Alice 先以 Q 控制 A 做 CNOT，再对 Q 做 H，然后测量 Q、A 得到 a、b；Bob 暂不操作 B','Alice does a CNOT with Q controlling A, then an H on Q, then measures Q and A to get a and b; Bob leaves B alone for now')
 });
 throw Error('Unknown chapter-3 circuit: '+kind);
}
;
/* js/joint-lesson.js */
/* C3-1: one experiment page that runs both classical preparations and compares their joint counts.
   Batches live in carry so back/forward and reload keep the same evidence. */
function jointBatch(shared,random=Math.random){
 return Array.from({length:100},()=>{const a=random()<.5?0:1,b=shared?a:random()<.5?0:1;return `${a}${b}`;});
}
function jointCounts(records){return ['00','01','10','11'].map(bits=>records.filter(x=>x===bits).length);}
function jointChart(records,label){
 const counts=jointCounts(records||[]);
 return `<figure class="joint-chart"><figcaption>${label}</figcaption><div class="joint-columns">${counts.map((n,i)=>`<div class="joint-column" style="--i:${i}"><strong data-count="${n}">${records?n:'—'}</strong><div class="joint-track"><span style="--joint-count:${n}%"></span></div><span>${['00','01','10','11'][i]}</span></div>`).join('')}</div></figure>`;
}
// After a run, the numbers count up while the bars spring up (CSS .joint-animate); skipped when motion is reduced.
function jointCountUp(root){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const cells=[...root.querySelectorAll('.joint-column strong[data-count]')],start=performance.now(),length=700;
 const tick=now=>{
  const t=Math.min(1,(now-start)/length),ease=1-Math.pow(1-t,3);
  cells.forEach(cell=>{if(cell.isConnected)cell.textContent=Math.round(Number(cell.dataset.count)*ease)});
  if(t<1&&cells[0]?.isConnected)requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
COMP.jointLesson=(slot,p)=>{
 const validBatch=x=>Array.isArray(x)&&x.length===100&&x.every(v=>/^[01]{2}$/.test(v));
 for(const key of ['jointA','jointB'])if(!validBatch(S.carry[key]))delete S.carry[key];
 function draw(focus,animate){
  const a=S.carry.jointA,b=S.carry.jointB,ready=!!(a&&b);
  slot.innerHTML=`<section class="joint-lesson${animate?' joint-animate':''}"><div class="joint-comparison">${jointChart(a,L('A 组：两位各自随机','Group A: each bit random on its own'))}${jointChart(b,L('B 组：先选定 00 或 11','Group B: pick 00 or 11 first'))}</div><div class="ent-actions"><button type="button" class="primary" data-joint-run>${ready?L('再运行一次','Run again'):L('各运行 100 次','Run each 100 times')}</button></div></section>`;
  slot.querySelector('[data-joint-run]').addEventListener('click',()=>{S.carry.jointA=jointBatch(false);S.carry.jointB=jointBatch(true);update('[data-joint-run]',true);});
  S.gateOK=ready;go('继续',ready);hint(ready?'':L('运行一次实验，再继续。','Run the experiment once, then continue.'));
  if(ready)S.passed[S.i]=true;else delete S.passed[S.i];
  if(focus)slot.querySelector(focus)?.focus({preventScroll:true});
  if(animate)jointCountUp(slot);
 }
 function update(focus,animate){
  for(const snapshot of Object.values(S.carrySnapshots))for(const key of ['jointA','jointB']){
   if(key in S.carry)snapshot[key]=S.carry[key];else delete snapshot[key];
  }
  draw(focus,animate);rememberStep();
 }
 draw();
};
;
/* js/entanglement.js */
/* Chapter 3 experiments. q0 is always the most significant bit.
   Teleportation evolves a three-qubit complex state, then conditions on Alice's outcome. */
const ENT={sessions:{}};
function entGate(state,gate,target,control=null){
 const mask=1<<(Math.log2(state.length)-1-target),out=state.map(a=>a.slice());
 for(let i=0;i<state.length;i++){
  if(i&mask)continue;
  if(control!==null&&!(i&(1<<(Math.log2(state.length)-1-control))))continue;
  const j=i|mask,a=state[i],b=state[j];
  if(gate==='H'){out[i]=a.map((x,k)=>(x+b[k])*Math.SQRT1_2);out[j]=a.map((x,k)=>(x-b[k])*Math.SQRT1_2);}
  if(gate==='X'){out[i]=b.slice();out[j]=a.slice();}
  if(gate==='Z')out[j]=b.map(x=>-x);
 }
 return out;
}
function entInput(name){
 const [x,y,z]=QB_STATES[name].b,a=Math.sqrt((1+z)/2);
 return a<1e-10?[[0,0],[1,0]]:[[a,0],[x/(2*a),y/(2*a)]];
}
function entTeleportState(name,step=2){
 const input=entInput(name),state=Array.from({length:8},()=>[0,0]);
 for(let q=0;q<2;q++)for(const pair of [0,3])state[4*q+pair]=input[q].map(x=>x*Math.SQRT1_2);
 let out=state;
 if(step>=1)out=entGate(out,'X',1,0);
 if(step>=2)out=entGate(out,'H',0);
 return out;
}
function entBranches(state){return Array.from({length:4},(_,i)=>state.slice(2*i,2*i+2).flat().reduce((s,x)=>s+x*x,0));}
function entBob(name,outcome,gates=[]){
 const state=entTeleportState(name),prob=entBranches(state)[outcome];
 let b=state.slice(outcome*2,outcome*2+2).map(a=>a.map(x=>x/Math.sqrt(prob)));
 for(const gate of gates)b=entGate(b,gate,0);
 return b;
}
function entBloch([a,b]){return [2*(a[0]*b[0]+a[1]*b[1]),2*(a[0]*b[1]-a[1]*b[0]),a[0]**2+a[1]**2-b[0]**2-b[1]**2];}
function entCorrections(outcome){return [...(outcome&1?['X']:[]),...(outcome&2?['Z']:[])];}
function entChoose(probs,random=Math.random){let r=random();for(let i=0;i<probs.length;i++){r-=probs[i];if(r<0)return i;}return probs.length-1;}
function entButtons(items,attribute='action',selected=null){return `<div class="ent-actions">${items.map(([value,label,disabled])=>`<button type="button" class="secondary" data-ent-${attribute}="${value}"${disabled?' disabled':''}${selected!==null?` aria-pressed="${value===selected}"`:''}>${label}</button>`).join('')}</div>`;}
const ENT_BELL_GATES=['H0','H1','X0','X1','Z0','Z1','CNOT'];
function entBellState(gates){
 return gates.reduce((state,g)=>g==='CNOT'?entGate(state,'X',1,0):entGate(state,g[0],Number(g[1])),[[1,0],[0,0],[0,0],[0,0]]);
}
function entBellTarget(state){
 // State overlap includes the relative phase and ignores an unobservable global phase.
 return Math.abs((state[0][0]+state[3][0])**2/2+(state[0][1]+state[3][1])**2/2-1)<1e-10;
}
function entBellStateFormula(state){
 // H, X, Z and CNOT keep this builder's amplitudes real and equal in magnitude.
 const terms=state.map((a,i)=>({value:a[0],bits:i.toString(2).padStart(2,'0')})).filter(a=>Math.abs(a.value)>1e-10);
 const sum=terms.map((a,i)=>`${a.value<0?'-':i?'+':''}|${a.bits}\\rangle`).join('');
 const factor=terms.length===2?'\\frac{1}{\\sqrt{2}}':terms.length===4?'\\frac{1}{2}':'';
 return `|\\psi\\rangle = ${factor?`${factor}\\left(${sum}\\right)`:sum}`;
}
function entModel(kind){return {kind,stage:0,input:'00',preset:'plus',basis:'Z',expanded:false,filter:false,seen:[],runs:0,counts:null,last:null,outcome:null,gates:[],finished:[],mode:'random'};}
function entView(m){
 let html='',ready=false,message='';
 if(m.kind==='cnot'){
  const a=Number(m.input[0]),b=Number(m.input[1])^(m.stage%2?a:0),output=`${a}${b}`;
  html=`<p>${L('q0 控制 q1；先选择输入，再执行门。','q0 controls q1. Pick an input first, then apply the gate.')}</p>${entButtons(['00','01','10','11'].map(x=>[x,x]),'input',m.input)}<div class="ent-machine"><strong>|${m.input}⟩</strong><span>→</span><div>CNOT × ${m.stage}</div><span>→</span><strong>|${output}⟩</strong></div>${labCircuit({n:2,seq:[...(a?['X0']:[]),...(Number(m.input[1])?['X1']:[]),...Array(m.stage).fill('CNOT')],static:true})}${entButtons([['next',L('执行 CNOT','Apply CNOT'),m.stage===2],['reset',L('恢复当前输入','Reset this input')]])}${m.stage?`<p>${m.stage===2?L('连续两次 CNOT 回到输入状态。','Two CNOTs in a row bring you back to the input.'):L(`控制位为 ${a}，目标位${a?'翻转':'保持不变'}。`,`The control is ${a}, so the target ${a?'flips':'stays the same'}.`)}</p>`:''}`;
  ready=['00','01','10','11'].every(x=>m.seen.includes(x))&&m.seen.includes('twice');message=L(`已执行 ${m.seen.filter(x=>/^[01]{2}$/.test(x)).length} / 4 种输入；再观察连续两次 CNOT。`,`Inputs tried: ${m.seen.filter(x=>/^[01]{2}$/.test(x)).length} / 4. Also watch two CNOTs in a row.`);
 }else if(m.kind==='bell-build'){
  const state=entBellState(m.gates),target=entBellTarget(state);
  html=`${labCircuit({n:2,seq:m.gates,static:true,measured:false})}<p class="cap">${L('点击组件，按顺序加到线路末尾。CNOT 由 q0 控制 q1；最多添加 6 个门。','Click a gate to add it to the end of the circuit. CNOT uses q0 as control and q1 as target. You can add up to 6 gates.')}</p>${entButtons(ENT_BELL_GATES.map(g=>[g,g==='CNOT'?L('CNOT：q0 → q1','CNOT: q0 → q1'):`${g[0]} q${g[1]}`,m.gates.length>=6]),'gate')}${entButtons([['undo',L('撤销上一步','Undo'),!m.gates.length],['reset',L('恢复初态','Reset')]])}<p class="ent-label">${L('当前预期量子态','Expected state now')}</p><div class="math-line">$$${entBellStateFormula(state)}$$</div><p class="ent-result">${target?L('已得到目标贝尔态：00 与 11 等幅、同相位叠加。','You made the target Bell state: an equal, in-phase superposition of 00 and 11.'):L('还未得到目标态。目标是 00 与 11 等幅、同相位叠加，01 与 10 的概率幅为 0。','Not the target yet. The goal is an equal, in-phase superposition of 00 and 11, with zero amplitude on 01 and 10.')}</p><details><summary>${L('查看制备提示','Show a hint')}</summary><p>${L('先试 H q0，再加 CNOT。H 产生 00 与 10 的叠加；CNOT 保留 00，把 10 变为 11，并保留相干关系。也可以交换门的顺序，对照结果。','Try H q0 first, then add CNOT. H makes a superposition of 00 and 10; CNOT keeps 00, turns 10 into 11, and preserves the coherence between them. You can also swap the gate order and compare.')}</p></details>`;
  ready=target;message=L('自由尝试不同组件，制备出目标贝尔态。','Try different gates freely until you make the target Bell state.');
 }
 return {html,ready,message};
}
function entAct(m,action,value){
 const remember=x=>{if(!m.seen.includes(x))m.seen.push(x);};
 if(action==='reset'){
  const keep={input:m.input,preset:m.preset,seen:m.seen,finished:m.finished};Object.assign(m,entModel(m.kind),keep);return;
 }
 if(action==='input'){m.input=value;m.stage=0;return;}
 if(action==='branch'){
  m.mode='demo';m.outcome=parseInt(value,2);m.stage=3;m.gates=[];return;
 }
 if(m.kind==='bell-build'){
  if((action==='gate'&&ENT_BELL_GATES.includes(value)&&m.gates.length<6)||(action==='undo'&&m.gates.length)){
   if(action==='gate')m.gates.push(value);else m.gates.pop();
   m.last=null;m.counts=null;
  }
 }else if(m.kind==='cnot'){
  if(action==='next'&&m.stage<2){m.stage++;remember(m.input);if(m.stage===2)remember('twice');}
 }else if(m.kind==='teleport'){
  if(action==='next'&&m.stage<4){
   if(m.stage===2)m.outcome=entChoose(entBranches(entTeleportState(m.preset)));
   m.stage++;
  }else if(m.stage===4){
   const needed=entCorrections(m.outcome);
   if(action===needed[m.gates.length])m.gates.push(action);
   if((needed.length&&m.gates.length===needed.length)||(!needed.length&&action==='finish')){
    m.stage=5;if(m.mode==='random'&&!m.finished.includes(m.preset))m.finished.push(m.preset);
   }
  }
 }
}
COMP.entanglement=(slot,p)=>{
 const key=S.lesson.id+':'+p.key,m=ENT.sessions[key]||(ENT.sessions[key]=entModel(p.kind));
 function draw(focus){
  const view=entView(m);
  slot.innerHTML=`<section class="ent-experiment" aria-label="${p.task}"><div class="ent-content" aria-live="polite">${view.html}</div></section>`;
  slot.querySelectorAll('[data-ent-action],[data-ent-input],[data-ent-basis],[data-ent-preset],[data-ent-branch],[data-ent-gate]').forEach(el=>{
   const action=['action','input','basis','preset','branch','gate'].find(k=>el.hasAttribute('data-ent-'+k));
   const handle=()=>{const value=el.tagName==='SELECT'?el.value:el.getAttribute('data-ent-'+action);entAct(m,action==='action'?value:action,value);draw(`[data-ent-${action}]${el.tagName==='SELECT'?'':`[data-ent-${action}="${value}"]`}`);};
   el.addEventListener(el.tagName==='SELECT'?'change':'click',handle);
  });
  typesetMath(slot);
  slot.querySelectorAll('.lab-node').forEach(el=>el.disabled=true);
  S.gateOK=view.ready;go('继续',view.ready);
  if(view.ready)S.passed[S.i]=true;else delete S.passed[S.i];
  hint(view.ready?'':view.message);
  if(focus){const target=slot.querySelector(focus);(target&&!target.disabled?target:slot.querySelector('.ent-actions button:not(:disabled)'))?.focus({preventScroll:true});}
 }
 draw();
};
;
/* js/protocol-lesson.js */
/* Shared experiment evidence persists across pages, revisits and reloads. */
function protocolSave(){
 for(const snapshot of Object.values(S.carrySnapshots))snapshot.protocol=S.carry.protocol;
 rememberStep();
}
function protocolInvalidate(from){
 for(const key of Object.keys(S.answers))if(Number(key)>=from)delete S.answers[key];
 for(const key of Object.keys(S.passed))if(Number(key)>=from)delete S.passed[key];
}
function protocolOptions(labels,selected,attribute='choice'){
 return `<div class="opts">${labels.map((label,i)=>`<button class="opt${selected===i?' selected':''}" data-protocol-${attribute}="${i}" aria-pressed="${selected===i}">${label}</button>`).join('')}</div>`;
}
function protocolButton(action,label,disabled=false){return `<button class="primary" data-protocol-action="${action}"${disabled?' disabled':''}>${label}</button>`;}
function protocolNote(text){return `<p class="protocol-feedback" role="status">${text}</p>`;}
;
/* js/teleport-lesson.js */
/* Guided protocol with standard questions for the plan and final checks. The 11 branch is an explicit teaching example,
   while the shared complex-state simulator still calculates the physical state. */
let teleportSceneObserver;
function teleportModel(){return {...entModel('teleport'),preset:'weighted',version:1};}
function teleportScene(m){
 const measured=m.stage>=3,received=m.stage>=4,restored=m.stage===5;
 const records=measured?`<div class="teleport-records" data-teleport-records tabindex="-1" aria-label="${received?L('Bob 收到的经典消息','Classical message received by Bob'):L('Alice 得到的经典消息','Classical message Alice got')}"><span>a = 1</span><span>b = 1</span></div>`:'';
 const held=(id,label)=>{
  const active=id==='B'?m.gates.length>0:!measured&&(m.stage===1||m.stage===2&&id==='Q');
  return `<span class="teleport-held teleport-held-${id.toLowerCase()}${active?' is-active':''}${measured&&id!=='B'?' is-measured':''}${restored&&id==='B'?' is-restored':''}" data-held="${id}" aria-label="${id}${L('，',', ')}${label}">${id}</span>`;
 };
 const cat=(name,qubits)=>`<div class="teleport-cat teleport-cat-${name.toLowerCase()}"><span class="teleport-art"><img src="assets/illustrations/teleportation-cats-white-ears.png" alt="${name==='Alice'?L('白猫 Alice 手持两个量子比特','Alice, a white cat, holding two qubits'):L('灰猫 Bob 手持一个量子比特','Bob, a gray cat, holding one qubit')}" width="1776" height="888">${qubits}</span></div><h3>${name}</h3>`;
 return `<div class="teleport-scene${received?' has-message':''}" tabindex="-1"><section class="teleport-person">${cat('Alice',held('Q',measured?L('已测量','measured'):L('待传输入','input to send'))+held('A',measured?L('已测量','measured'):L('共享纠缠的一半','half of the shared entanglement')))}${!received?records:''}</section><svg class="teleport-links" aria-label="${measured?L('经典消息由 Alice 发给 Bob','Classical message from Alice to Bob'):L('A 与 B 预先共享纠缠','A and B share entanglement in advance')}" role="img"><path class="${measured?'teleport-classical-link':'teleport-entangled-link'}"/><path class="teleport-arrow"/></svg><section class="teleport-person">${cat('Bob',held('B',restored?L('已恢复输入态','input state restored'):measured?L('等待修正','waiting for correction'):L('共享纠缠的另一半','other half of the shared entanglement')))}${received?records:''}</section></div>`;
}
// Locate the link endpoints from the actual held qubits at every viewport width.
function teleportConnect(slot,measured){
 const scene=slot.querySelector('.teleport-scene');if(!scene)return;
 const svg=scene.querySelector('.teleport-links'),path=svg.querySelector('path'),arrow=svg.querySelector('.teleport-arrow');
 const update=()=>{
  if(!scene.isConnected){teleportSceneObserver?.disconnect();return;}
  const box=scene.getBoundingClientRect(),a=scene.querySelector('[data-held="A"]').getBoundingClientRect(),b=scene.querySelector('[data-held="B"]').getBoundingClientRect();
  const x1=a.right-box.left,x2=b.left-box.left,y1=a.top+a.height/2-box.top,y2=b.top+b.height/2-box.top;
  svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  const lift=measured?Math.max(24,box.width*.1):0;
  path.setAttribute('d',`M${x1},${y1} C${x1},${y1-lift} ${x2},${y2-lift} ${x2},${y2}`);
  arrow.setAttribute('d',measured?`M${x2-5},${y2-6} L${x2},${y2} L${x2+3},${y2-7}`:'');
 };
 update();return {scene,update};
}
function teleportCircuit(m){
 const gate=(wire,label,active,extra={})=>({type:'gate',wire,label,active,...extra});
 return entCircuitSVG({
  wires:[{name:'Q',owner:'Alice',input:'|ψ⟩'},{name:'A'},{name:'B',owner:'Bob'}],
  columns:[
   {ops:[{type:'cx',control:0,wire:1,active:m.stage>=1}]},
   {ops:[gate(0,'H',m.stage>=2)]},
   {ops:[{type:'measure',wire:0,active:m.stage>=3},{type:'measure',wire:1,active:m.stage>=3}]},
   {ops:[gate(2,'X',m.gates.includes('X'),{source:1})]},
   {ops:[gate(2,'Z',m.gates.includes('Z'),{source:0})]}
  ],
  output:[m.stage>=3?'a=1':'a',m.stage>=3?'b=1':'b',m.stage===5?'|ψ⟩':''],
  classicalReceived:m.stage>=4,
  title:L('传态线路：Q 控制 A 做 CNOT，Q 上做 H，再测量；b 控制 B 上的 X，a 控制 B 上的 Z','Teleportation circuit: CNOT with Q controlling A, H on Q, then measure; b controls the X on B and a controls the Z on B')
 });
}
function teleportRestored(m){
 if(m.stage!==5)return false;
 const actual=entBloch(entBob(m.preset,m.outcome,m.gates)),target=QB_STATES[m.preset].b;
 return actual.every((value,i)=>Math.abs(value-target[i])<1e-10);
}
COMP.teleportLesson=(slot,p)=>{
 if(S.carry.protocol?.version!==1)S.carry.protocol=teleportModel();
 const m=S.carry.protocol;
 // The preceding question explains these gates; measurement starts after both operations.
 function prepareExample(){
  if(m.stage===0)entAct(m,'next');
  if(m.stage===1)entAct(m,'next');
  if(m.stage===2)entAct(m,'branch','11');
 }
 if(p.kind==='transfer'&&m.stage<3){prepareExample();protocolSave();}
 function draw(focus){
  let html='',ready=false;
  if(p.kind==='resources'){
   html=L(String.raw`<p>Alice 只有一个处于未知态的量子比特 Q。她不能把 Q 本身送给 Bob，也无法复制或读出它的状态，但两只猫咪已经共享纠缠态：</p><p>$$|\Phi^+\rangle_{AB}=\frac{|00\rangle_{AB}+|11\rangle_{AB}}{\sqrt{2}}$$</p><p>它们还可以互相发送经典消息。</p>`,String.raw`<p>Alice has just one qubit, Q, in an unknown state. She can’t send Q itself to Bob, and she can’t copy it or read out its state. But the two cats already share an entangled state:</p><p>$$|\Phi^+\rangle_{AB}=\frac{|00\rangle_{AB}+|11\rangle_{AB}}{\sqrt{2}}$$</p><p>They can also send each other classical messages.</p>`);
   ready=true;
  }else if(p.kind==='derive'){
html=L(String.raw`<div class="teleport-algebra"><p>测量 Q 的结果记为 a，测量 A 的结果记为 b。</p><p>设输入为 $|\psi\rangle=\alpha|0\rangle+\beta|1\rangle$，其中 $|\alpha|^2+|\beta|^2=1$。按 Q、A、B 的顺序，初态为：</p><p>$$|\psi\rangle_Q\otimes\frac{|00\rangle_{AB}+|11\rangle_{AB}}{\sqrt2}.$$</p><p>以 Q 控制 A 做 CNOT，Q 为 1 时翻转 A。操作后的<strong>完整状态</strong>是：</p><p>$$\begin{aligned}&\frac{\alpha}{\sqrt2}|000\rangle+\frac{\alpha}{\sqrt2}|011\rangle\\&\quad+\frac{\beta}{\sqrt2}|110\rangle+\frac{\beta}{\sqrt2}|101\rangle\end{aligned}.$$</p><p>接着对 Q 做 H。而 $H|0\rangle=(|0\rangle+|1\rangle)/\sqrt2$，$H|1\rangle=(|0\rangle-|1\rangle)/\sqrt2$。因此展开后，完整状态为：</p><p>$$\begin{aligned}&\frac{\alpha}{2}(|000\rangle+|100\rangle)\\&\quad+\frac{\alpha}{2}(|011\rangle+|111\rangle)\\&\quad+\frac{\beta}{2}(|010\rangle-|110\rangle)\\&\quad+\frac{\beta}{2}(|001\rangle-|101\rangle)\end{aligned}.$$</p><p>接下来，试着从完整展开式中找出某个测量结果对应的 Bob 状态。</p></div>`,String.raw`<div class="teleport-algebra"><p>Call the outcome of measuring Q “a” and the outcome of measuring A “b”.</p><p>Let the input be $|\psi\rangle=\alpha|0\rangle+\beta|1\rangle$, where $|\alpha|^2+|\beta|^2=1$. In the order Q, A, B, the starting state is:</p><p>$$|\psi\rangle_Q\otimes\frac{|00\rangle_{AB}+|11\rangle_{AB}}{\sqrt2}.$$</p><p>Apply a CNOT with Q controlling A: when Q is 1, A flips. The <strong>full state</strong> afterward is:</p><p>$$\begin{aligned}&\frac{\alpha}{\sqrt2}|000\rangle+\frac{\alpha}{\sqrt2}|011\rangle\\&\quad+\frac{\beta}{\sqrt2}|110\rangle+\frac{\beta}{\sqrt2}|101\rangle\end{aligned}.$$</p><p>Next, apply H to Q. Since $H|0\rangle=(|0\rangle+|1\rangle)/\sqrt2$ and $H|1\rangle=(|0\rangle-|1\rangle)/\sqrt2$, expanding gives the full state:</p><p>$$\begin{aligned}&\frac{\alpha}{2}(|000\rangle+|100\rangle)\\&\quad+\frac{\alpha}{2}(|011\rangle+|111\rangle)\\&\quad+\frac{\beta}{2}(|010\rangle-|110\rangle)\\&\quad+\frac{\beta}{2}(|001\rangle-|101\rangle)\end{aligned}.$$</p><p>Now try to find, in the full expansion, Bob’s state for one particular measurement outcome.</p></div>`);
   ready=true;
  }else if(p.kind==='transfer'){
   ready=teleportRestored(m);
   html=L('<p class="teleport-example">本次演示取 <strong>ab=11</strong>：Alice 已测得 a=1、b=1。四种结果各有 1/4 的概率，这里不是随机抽样。</p>','<p class="teleport-example">This demo uses <strong>ab=11</strong>: Alice has measured a=1 and b=1. Each of the four outcomes has probability 1/4; this one is picked, not randomly sampled.</p>');
   html+=teleportScene(m);
   if(m.stage===3){
    html+=L('<p>Bob 尚未收到结果，不能确定该做什么修正。先把 Alice 的两个经典比特发给他。</p>','<p>Bob hasn’t received the outcome yet, so he can’t know which correction to make. First, send him Alice’s two classical bits.</p>');
   }else{
    const state=ready?String.raw`\alpha|0\rangle+\beta|1\rangle=|\psi\rangle`:m.gates.length?String.raw`\alpha|0\rangle-\beta|1\rangle`:String.raw`\alpha|1\rangle-\beta|0\rangle`;
    const explanation=ready?L('Z 让一态分量变号，恢复了原来的相对符号。Bob 的 B 已恢复完整输入态；Alice 的 Q 已被测量，不再保有原态。','Z flips the sign of the |1⟩ part, restoring the original relative sign. Bob’s B now holds the full input state; Alice’s Q has been measured and no longer holds it.'):m.gates.length?L('X 交换了零态与一态的位置，系数跟随对应分量。现在还差一态分量的符号，再执行 Z。','X swapped |0⟩ and |1⟩, and each coefficient moved with its part. Only the sign of the |1⟩ part is still wrong, so apply Z next.'):L('Bob 收到 11，知道自己的 B 对应这个状态。先执行 X，交换零态与一态的位置。','Bob receives 11, so he knows B is in this state. First apply X to swap |0⟩ and |1⟩.');
    html+=`<div class="teleport-live-state teleport-algebra" tabindex="-1" role="status"><p><strong>${ready?L('已恢复原态','Original state restored'):m.gates.length?L('执行 X 后','After X'):L('Bob 收到消息后，对应的状态','Bob’s state once he gets the message')}</strong></p><p>$$${state}$$</p><p>${explanation}</p></div>`;
    if(m.stage===4&&!m.gates.length)html+=L('<p>这一步需要等待经典消息，不能用来超光速传信。Bob 无需知道 α、β 的具体数值。</p>','<p>This step has to wait for the classical message, so it can’t send information faster than light. Bob never needs to know the actual values of α and β.</p>');
   }
   const action=m.stage===3?protocolButton('send',L('发送经典消息','Send classical message')):m.stage===4?protocolButton(m.gates.length?'z':'x',m.gates.length?L('执行 Z','Apply Z'):L('执行 X','Apply X')):'';
   html+=`<div class="protocol-actions">${action}<button class="ghost" data-protocol-action="restart">${L('重新开始演示','Restart demo')}</button></div>`;
   html+=teleportCircuit(m);
  }
  teleportSceneObserver?.disconnect();
  slot.innerHTML=`<section class="protocol-lesson teleport-lesson">${p.kind==='resources'?teleportScene(m):''}${html}</section>`;
  const connection=teleportConnect(slot,m.stage>=3);
  if(connection){teleportSceneObserver=new ResizeObserver(connection.update);teleportSceneObserver.observe(connection.scene);}
  slot.querySelectorAll('[data-protocol-action]').forEach(button=>button.onclick=()=>act(button.dataset.protocolAction));
  typesetMath(slot);S.gateOK=ready;
  go(p.kind==='resources'?'开始传态':p.kind==='transfer'?'进入练习':'继续',ready);hint('');
  if(ready)S.passed[S.i]=true;else delete S.passed[S.i];
  if(focus){
   const target=slot.querySelector(focus)||document.getElementById('go');
   target.focus({preventScroll:true});target.scrollIntoView({block:'nearest'});
  }
 }
 function update(focus){protocolSave();draw(focus);}
 function act(action){
  const from=action==='send'?slot.querySelector('[data-teleport-records]')?.getBoundingClientRect():null;
  if(p.kind!=='transfer')return;
  if(action==='restart'){
   for(const key of Object.keys(m))delete m[key];
   Object.assign(m,teleportModel());prepareExample();protocolInvalidate(S.i);
  }else if(action==='send'&&m.stage===3)entAct(m,'next');
  else if(action==='x'&&m.stage===4&&m.gates.length===0)entAct(m,'X');
  else if(action==='z'&&m.stage===4&&m.gates.length===1)entAct(m,'Z');
  const focus=action==='restart'?'[data-protocol-action="send"]':'.teleport-live-state';
  update(focus);
  if(from&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const records=slot.querySelector('[data-teleport-records]'),to=records.getBoundingClientRect();
   records.animate([{transform:`translate(calc(-50% + ${from.x-to.x}px),${from.y-to.y}px)`},{transform:'translateX(-50%)'}],{duration:650,easing:'ease-in-out'});
  }
 }
 draw();
};
;
/* js/hardware-compile.js */
/* Built-in teaching sequences for the same three-qubit circuit. Positions are schematic. */
const HARDWARE_FIXED=[
 {map:[0,1,2],text:L('初始对应：q0、q1、q2 分别放在 p0、p1、p2。只有相邻器件直接连接。','Starting layout: q0, q1 and q2 sit on p0, p1 and p2. Only neighboring sites are directly connected.')},
 {map:[0,1,2],text:L('先对三个量子比特分别执行 H。','First, apply H to each of the three qubits.'),h:true},
 {map:[1,0,2],text:L('交换 p0、p1 承载的量子态。q0 现在由 p1 承载，可以与 p2 上的 q2 作用。','Swap the states held by p0 and p1. q0 now sits on p1, so it can interact with q2 on p2.'),swap:[0,1]},
 {map:[1,0,2],text:L('在 p1、p2 上执行 CZ，完成线路中的 CZ(q0, q2)。','Apply CZ on p1 and p2. This completes CZ(q0, q2) from the circuit.'),gate:[1,2],completed:1},
 {map:[0,1,2],text:L('再次交换 p0、p1 的量子态，让 q1 回到 p1，与 q2 相邻。','Swap p0 and p1 again so q1 returns to p1, next to q2.'),swap:[0,1],completed:1},
 {map:[0,1,2],text:L('在 p1、p2 上执行 CZ，完成 CZ(q1, q2)。器件一直留在原位。','Apply CZ on p1 and p2 to complete CZ(q1, q2). The sites never move.'),gate:[1,2],completed:2}
];
// Each movement and gate is a separate teaching step; coordinates are SVG units.
const HARDWARE_RECONFIGURABLE=[
 {positions:[[150,230],[270,230],[390,230]],text:L('初始布局：q0、q1、q2 位于存储区。标签跟随各自的原子。','Starting layout: q0, q1 and q2 are in the storage zone. Each label moves with its atom.')},
 {positions:[[150,230],[270,230],[390,230]],text:L('先对三个量子比特分别执行 H。','First, apply H to each of the three qubits.')},
 {positions:[[230,52],[270,230],[310,52]],text:L('把 q0、q2 移入纠缠区。移动只安排位置，还没有执行 CZ。','Move q0 and q2 into the entangling zone. Moving only arranges positions; no CZ has run yet.')},
 {positions:[[230,52],[270,230],[310,52]],gate:[0,2],completed:1,text:L('对 q0、q2 执行 CZ，完成线路中的第一个双比特门。','Apply CZ to q0 and q2. This completes the first two-qubit gate in the circuit.')},
 {positions:[[150,230],[270,230],[310,52]],completed:1,text:L('把 q0 移回存储区，q2 留在纠缠区，为下一次操作腾出位置。','Move q0 back to the storage zone and leave q2 in the entangling zone, making room for the next step.')},
 {positions:[[150,230],[230,52],[310,52]],completed:1,text:L('把 q1 移入纠缠区，与 q2 配对。此时第二个 CZ 还没有执行。','Move q1 into the entangling zone to pair with q2. The second CZ has not run yet.')},
 {positions:[[150,230],[230,52],[310,52]],gate:[1,2],completed:2,text:L('对 q1、q2 执行 CZ，完成线路中的第二个双比特门。','Apply CZ to q1 and q2. This completes the second two-qubit gate in the circuit.')}
];
function hardwareAtomPositions(mode,frame){
 return mode==='fixed'?Object.fromEntries(frame.map.map((q,p)=>[q,{x:100+p*170,y:112}])):Object.fromEntries(frame.positions.map(([x,y],q)=>[q,{x,y}]));
}
function hardwareCircuit(completed=0,h=false){
 return `<svg class="hw-circuit" viewBox="0 0 460 142" role="img" aria-label="${L('三比特输入线路：各做 H，然后 CZ q0 q2，再 CZ q1 q2','Three-qubit input circuit: H on each qubit, then CZ q0 q2, then CZ q1 q2')}">
 ${[0,1,2].map((q)=>`<text x="12" y="${30+q*48}">q${q}</text><path d="M54 ${25+q*48}H440"/><g class="${h?'is-active':''}"><rect x="90" y="${10+q*48}" width="30" height="30" rx="3"/><text x="105" y="${30+q*48}" text-anchor="middle">H</text></g>`).join('')}
 ${[[240,0,2],[350,1,2]].map(([x,a,b],i)=>`<g class="${completed>i?'is-active':''}"><path d="M${x} ${25+a*48}V${25+b*48}"/><circle cx="${x}" cy="${25+a*48}" r="5"/><circle cx="${x}" cy="${25+b*48}" r="5"/></g>`).join('')}</svg>`;
}
function hardwareDeviceSVG(mode,frame){
 const fixed=mode==='fixed',pos=hardwareAtomPositions(mode,frame);
 const gate=fixed?frame.gate?.map(p=>frame.map[p]):frame.gate;
 return `<svg class="hw-device" viewBox="0 0 540 ${fixed?210:300}" role="img" aria-label="${fixed?L('固定器件与量子态对应关系','Fixed sites and the qubit states they hold'):L('可重排阵列的原子位置：上方纠缠区，下方存储区','Atom positions in a reconfigurable array: entangling zone on top, storage zone below')}">
 ${fixed?`<path class="hw-link" d="M100 112H440"/>${[0,1,2].map(p=>`<rect class="hw-site" x="${76+p*170}" y="88" width="48" height="48" rx="8"/><text x="${100+p*170}" y="172" text-anchor="middle">${L(`器件 p${p}`,`Site p${p}`)}</text>`).join('')}`:`<rect class="hw-zone hw-ent" x="8" y="8" width="524" height="70" rx="12"/><rect class="hw-zone" x="8" y="84" width="524" height="206" rx="12"/><text x="22" y="36">${L('纠缠区','Entangling zone')}</text><text x="22" y="111">${L('存储区','Storage zone')}</text>`}
 ${gate?`<path class="hw-gate" d="M${pos[gate[0]].x} ${pos[gate[0]].y}L${pos[gate[1]].x} ${pos[gate[1]].y}"/><text class="hw-gate-label" x="${(pos[gate[0]].x+pos[gate[1]].x)/2}" y="${pos[gate[0]].y-25}" text-anchor="middle">CZ</text>`:''}
 ${Object.entries(pos).map(([id,p])=>`<g class="hw-atom" data-atom="${id}" transform="translate(${p.x} ${p.y})"><circle r="17"/><text text-anchor="middle" y="5">q${id}</text></g>`).join('')}</svg>`;
}
const HARDWARE_ROUTES=[
 [L('超导','Superconducting'),'fridgePhoto',L('超导电路的两个能级','Two energy levels of a superconducting circuit')],[L('离子阱','Trapped ions'),'ion',L('带电原子的两个内部态','Two internal states of a charged atom')],[L('中性原子','Neutral atoms'),'atom',L('中性原子的两个内部态','Two internal states of a neutral atom')],[L('光量子','Photonic'),'photon',L('光子的路径或偏振','A photon’s path or polarization')],[L('硅量子点','Silicon quantum dots'),'silicon',L('硅中单个电子自旋的两个方向','The two spin directions of a single electron in silicon')]
];
ART.hardwareOverview=()=>`<div class="hw-overview">
 <div class="hw-route-buttons" role="group" aria-label="${L('选择硬件路线','Choose a hardware platform')}">${HARDWARE_ROUTES.map(([title],i)=>`<button type="button" class="hw-route-button" data-hw-route="${i}" aria-pressed="${i===0}" aria-controls="hw-route-panel-${i}">${title}</button>`).join('')}</div>
 ${HARDWARE_ROUTES.map(([title,route,description],i)=>`<section class="hw-route-panel" id="hw-route-panel-${i}" aria-label="${title}" ${i===0?'':'hidden'}>${ROUTE_ART[route]()}<p class="hw-route-description">${description}</p></section>`).join('')}
 </div>`;
function bindHardwareOverview(slot){
 const step=S.i,buttons=[...slot.querySelectorAll('[data-hw-route]')],panels=[...slot.querySelectorAll('.hw-route-panel')];
 function select(index,save=false){
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  panels.forEach((panel,i)=>panel.hidden=i!==index);
  if(save){S.answers[step]={routeIndex:index};rememberStep();}
 }
 const saved=S.answers[step]?.routeIndex;
 select(Number.isInteger(saved)&&saved>=0&&saved<buttons.length?saved:0);
 buttons.forEach((button,i)=>button.addEventListener('click',()=>select(i,true)));
}
ART.fixedArchitecture=()=>`<div class="hw-architecture-single">${hardwareDeviceSVG('fixed',HARDWARE_FIXED[0])}</div>`;
ART.reconfigurableArchitecture=()=>'<div class="hw-architecture-animation"></div>';
COMP.hardwareCompile=(slot,p)=>{
 const frames=p.mode==='reconfigurable'?HARDWARE_RECONFIGURABLE:HARDWARE_FIXED,key='hardware-'+p.mode+(p.overview?'-overview':'');
 const saved=S.carry[key];
 let index=Number.isInteger(saved)?Math.min(Math.max(0,saved),frames.length-1):0,playing=false,timer;
 const step=S.i,lesson=S.lesson;
 const alive=()=>slot.isConnected&&S.lesson===lesson&&S.i===step;
 function draw(previous){
  const frame=frames[index],fixed=p.mode==='fixed';
  const complete=frame.completed||0;
  slot.innerHTML=`<section class="hw-playback${p.overview?' hw-playback-overview':''}" aria-label="${fixed?L('固定连接演示','Fixed connectivity demo'):L('可重排原子阵列演示','Reconfigurable atom array demo')}">
   ${p.overview?'':`<div class="hw-input">${hardwareCircuit(complete,index>0)}</div>`}
   <div class="hw-scene">${hardwareDeviceSVG(p.mode,frame)}</div>
   <p class="hw-step" role="status" aria-live="polite">${frame.text}</p>
   <div class="hw-controls"><button type="button" class="ghost" data-hw="reset">${L('恢复初态','Reset')}</button>${p.overview?'':`<button type="button" class="secondary" data-hw="previous" ${index===0?'disabled':''}>${L('上一步','Back')}</button><button type="button" class="secondary" data-hw="next" ${index===frames.length-1?'disabled':''}>${L('下一步','Next')}</button>`}${fixed?'':`<button type="button" class="secondary" data-hw="play">${playing?L('暂停','Pause'):index===frames.length-1?L('重新播放','Replay'):p.overview?L('播放动画','Play animation'):L('播放','Play')}</button>`}</div>
  </section>`;
  // Redraws replace the SVG labels and prose; reapply the initial math notation.
  typesetCourseMath(slot);
  if(previous!==undefined&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const old=frames[previous];
   slot.querySelectorAll('[data-atom]').forEach(atom=>{
    const id=Number(atom.dataset.atom),a=hardwareAtomPositions(p.mode,old)[id],b=hardwareAtomPositions(p.mode,frame)[id];
    if(a.x!==b.x||a.y!==b.y)atom.animate([{transform:`translate(${a.x}px,${a.y}px)`},{transform:`translate(${b.x}px,${b.y}px)`}],{duration:650,easing:'ease-in-out'});
   });
  }
  slot.querySelectorAll('[data-hw]').forEach(button=>button.onclick=()=>act(button.dataset.hw));
  const ready=p.overview||index===frames.length-1;S.gateOK=ready;go('继续',ready);hint(ready?'':p.gh);
  S.carry[key]=index;rememberStep();
 }
 function tick(){timer=setTimeout(()=>{if(!alive()){playing=false;return;}const old=index;index=Math.min(index+1,frames.length-1);if(index===frames.length-1)playing=false;draw(old);if(playing)tick();},1600);}
 function act(action){
  clearTimeout(timer);const old=index;
  if(action==='play'){playing=!playing;if(playing&&index===frames.length-1)index=0;}
  else {playing=false;index=action==='reset'?0:Math.max(0,Math.min(frames.length-1,index+(action==='next'?1:-1)));}
  draw(old);slot.querySelector(`[data-hw="${action}"]:not(:disabled)`)?.focus({preventScroll:true});if(playing)tick();
 }
 draw();
};
;
/* js/course.js */
/* =========================================================
   课程数据 —— 一课一问，后页吃前页的结果
   ========================================================= */
const LESSONS={};
const EQUATIONS={
  qubit:String.raw`$$\lvert\psi\rangle=\alpha\lvert0\rangle+\beta\lvert1\rangle$$`,
  normalized:String.raw`$$\lvert\alpha\rvert^2+\lvert\beta\rvert^2=1$$`
};
;
/* js/curriculum.js */
/* Lesson titles for the seven-chapter required curriculum. */
const REQUIRED_CATALOG={
 "C1-1": {"title": L("“算得慢”与“算不完”","“Slow to compute” vs. “impossible to finish”")},
 "C1-2": {"title": L("量子计算的潜力与边界","What quantum computing can and cannot do")},
 "C1-3": {"title": L("量子计算发展史","A short history of quantum computing")},
 "C2-1": {"title": L("量子比特的状态怎么描述？","How do we describe a qubit’s state?")},
 "C2-2": {"title": L("概率幅、概率与测量","Amplitudes, probabilities and measurement")},
 "C2-3": {"title": L("单比特门的旋转作用","Single-qubit gates as rotations")},
 "C2-4": {"title": L("测量概率相同，为什么量子态会不同？","Same measurement probabilities, different states?")},
 "C3-1": {"title": L("两个比特的关联","Correlation between two qubits")},
 "C3-2": {"title": L("受控翻转门","The controlled-NOT gate")},
 "C3-3": {"title": L("制备一个贝尔态","Preparing a Bell state")},
 "C3-4": {"title": L("量子态能被复制吗？","Can a quantum state be copied?")},
 "C3-5": {"title": L("量子隐形传态","Quantum teleportation")},
 "C4-1": {"title": L("量子计算机硬件路线","Hardware platforms for quantum computers")},
 "C4-2": {"title": L("用编译连接软硬件","Compilation: connecting software and hardware")},
 "C5-1": {"title": L("噪声与测量的随机性","Noise and the randomness of measurement")},
 "C5-2": {"title": L("如何发现并处理错误","Detecting and handling errors")},
 "C6-1": {"title": L("概率幅与干涉","Amplitudes and interference")},
 "C6-2": {"title": L("Grover 搜索算法","Grover’s search algorithm")},
 "C6-3": {"title": L("Shor 算法：用周期分解整数","Shor’s algorithm: factoring with periods")},
 "C7-1": {"title": L("用 FatQat 编写量子程序","Writing quantum programs with FatQat")},
 "C7-2": {"title": L("走进量子计算：找到你的探索方向","Into quantum computing: find your direction")}
};
const R={
 say:(...b)=>({t:'say',b}),
 ask:(q,o,a,why)=>({t:'ask',q,o,a,f:why}),
 end:line=>({t:'end',line}),
 play:(kind,task,config={})=>({t:'play',c:'studio',kind,task,gh:'',...config}),
 lab:(task,config)=>({t:'play',c:'lab',task,gh:L('运行一次当前实验，再继续。','Run the experiment once, then continue.'),ok:m=>!!m.result,...config}),
 add:(id,pages)=>{const meta=REQUIRED_CATALOG[id];if(!meta)throw Error('Unknown lesson '+id);LESSONS[id]={...meta,ask:meta.title,pages};},
 // English pages replace the Chinese ones page for page (same count, options and answers), so progress and
 // bookmarks carry over between languages: the bookmark revision is still computed from the Chinese pages.
 en:(id,pages)=>{if(LANG!=='en')return;const lesson=LESSONS[id];if(!lesson)throw Error('Unknown lesson '+id);
  // If the Chinese lesson changed shape and the English one has not caught up, keep the Chinese pages rather than break the course.
  if(pages.length!==lesson.pages.length){console.warn('English lesson '+id+' has '+pages.length+' pages, Chinese has '+lesson.pages.length+'; showing Chinese');return}
  LESSONS[id]={...lesson,pages,revisionPages:lesson.pages};}
};
;
/* js/lessons/required-1.js */
/* Layer 1: motivation without front-loading the physics. */
R.add('C1-1',[
 R.ask('想象一排开关，每个开关只有“开”和“关”两种状态。每多一个开关，所有开关状态的可能组合数会怎么变？',['增加 2 种','翻倍','不变'],1,'每增加一个开关，组合数就翻一倍。新开关有“开”“关”两种选择，原来的每一种组合都能分别配上这两种选择，所以总数变成原来的 2 倍。比如 1 个开关有 2 种组合，2 个有 4 种，3 个有 8 种，依此类推。'),
 {t:'play',c:'c2',unit:'开关数量',max:300,task:'拖动滑条，观察开关数量增加时，组合数如何变化。',ok:st=>st.n>=250,note:'每多一个开关，组合数就翻一倍。所以即使计算机的检查速度提高一倍，在同样的时间里，它也只能多处理一个开关。'},
 R.say('逐一检查所有组合，所需时间会随开关数量迅速增长。开关少时只是“算得慢”，开关多到一定程度，就变成了“算不完”。','好在不少问题有规律可循，可以用更少的计算得到答案，不必穷举。','量子计算研究的是：能否利用量子特性，为某些特定问题找到更快的解法。'),
 R.ask('一个问题的候选答案非常多。这能说明量子计算一定可以更快地解决它吗？',['能，候选答案越多，量子计算的优势就越大','不能，还要看这个问题有没有可以利用的结构'],1,'候选答案多，只说明穷举的成本可能很高，并不等于“量子计算一定更快”。量子计算只对某些特定类型的问题有已知的加速方法；很多问题即使候选答案很多，也未必能找到量子加速。'),
 R.end('开关一多，逐一检查所有组合就会“算不完”。量子计算并不是对所有问题都更快，只对某些特定问题有已知的加速方法。<br>下一节看看量子计算可能用在哪里，又有哪些边界。')
]);
R.add('C1-2',[
 {t:'ask',multi:true,q:'以下哪些是量子计算正在研究的潜在应用方向？（可多选）',
  o:['模拟分子如何成键','加快日常的文字处理和网页浏览','为特定优化问题寻找更好的方案'],a:[0,2],
  f:'量子计算被研究的方向，主要是模拟分子、材料这类“本身就是量子”的问题，以及某些特定的优化问题。文字处理和网页浏览靠普通计算机和网络就能很好地完成，不是量子计算要解决的问题。'},
 R.say('知道了可能的应用方向，再来练习识别夸大的说法。下面是两条模拟新闻，请判断它们是否准确。'),
 {t:'ask',q:'“某公司实现 1000 个量子比特，算力超过全球超算总和。”这句话应怎样判断？',
  o:['准确','夸大','完全错误'],a:1,
  f:'即使“1000 个量子比特”这个数字是真的，也不能只看数量判断算力。还要知道它具体算了什么、结果是否可靠，和哪种经典方法比较、双方各花了多少时间和资源。“超过全球超算总和”缺少这些条件，所以是夸大的说法。'},
 {t:'ask',q:'“量子计算机很快就会让现在的银行加密全部失效。”这句话应怎样判断？',
  o:['准确','夸大','完全错误'],a:1,
  f:'足够强大、能稳定运行的量子计算机，确实可能破解一部分保护通信和交易的现有公钥密码，这是真实存在的潜在风险。但不能因此说“很快”就会发生，也不代表所有加密方法都会失效。人们也在开发和部署能抵抗已知量子攻击的密码方法。'},
 {t:'end',line:'量子计算有没有帮助，要看具体任务、结果质量和计算成本。看到“量子突破”的新闻，可以这样核对：',steps:[
  '找出处：原论文或技术报告实际说了什么？',
  '定任务：它具体算了什么，怎样才算成功？',
  '看对照：和哪种经典方法比，双方用时和结果质量如何？',
  '查边界：这是正在研究的可能性，还是已经验证的结果？有没有把某一项任务的优势，说成“所有问题都更快”？'
 ]}
]);
R.add('C1-3',[
 {t:'show',art:'timeline',cap:'判断新闻需要一些背景。沿着时间线看，研究者关心的问题逐渐从“能不能这样算”走向“怎样可靠地算出来”。'},
 {t:'ask',q:'今天的量子计算发展到了什么阶段？',
  o:['仍停留在理论设想，还没有能运行的实验设备','已有实验设备和特定任务上的成果，正在探索更可靠、更实用的计算','已经能在大多数实际任务中稳定超越经典计算机'],a:1,
  f:'量子计算机已经在一些特定任务上展示出计算能力。为了让它解决更多实际问题，科学家和工程师正在扩大设备规模、提高可靠性，并探索算法和应用。'},
 R.end('从模拟自然的设想，到算法、处理器和纠错，量子计算的进展由许多环节共同推动。<br>下一章，我们先认识承载这些计算的基本单元：量子比特。')
]);
;
/* js/lessons/required-2.js */
/* Standard lesson pages; Bloch experiments mount only inside play steps. */
R.add('C2-1',[
 R.say(
  String.raw`经典比特像一个开关，用 0 和 1 表示两个取值。量子比特则由可以控制和测量的物理系统承载，例如原子的两个内部状态。这两个状态记作 $|0\rangle$ 和 $|1\rangle$，分别读作“零态”和“一态”。`,
  String.raw`要知道量子比特的状态，需要测量。本课程中的测量都是“计算基测量”，也叫“$Z$ 基测量”：每次把量子比特读成 0 或 1。在理想情况下，测量 $|0\rangle$ 确定得到 0，测量 $|1\rangle$ 确定得到 1。`,
  String.raw`$$|0\rangle\xrightarrow{\text{测量}}0\qquad |1\rangle\xrightarrow{\text{测量}}1$$`
 ),
 R.play('sphere','将箭头拖至赤道附近，观察测到 0 和 1 的概率。',{
  intro:[
   String.raw`量子比特还可以处在叠加态。想象一个球：从球心出发的箭头指向北极时表示 $|0\rangle$，指向南极时表示 $|1\rangle$，指向球面其他位置时表示叠加态。`,
   String.raw`这个球叫作 Bloch 球（布洛赫球）。<strong>在理想情况下，球面上的每一个点都对应量子比特的一个状态</strong>。`
  ],
  c:'c5',gates:[],ok:st=>st.dragged&&Math.abs(st.b[2])<0.08
 }),
 R.ask('箭头指向赤道上的一点时，进行一次计算基测量，会得到什么？',
  ['0 或 1，两者概率各为 50%','0.5','一次同时得到 0 和 1'],0,
  '一次测量只得到一个结果。各为 50% 描述的是两种结果出现的概率，不是一次读出“一半”，也不是同时得到 0 和 1。'),
 R.end('量子态可以连续变化，但在计算基测量中，每次只得到 0 或 1。<br>下一节用公式描述量子态，算一算测到 0 和 1 的概率。')
]);
R.add('C2-2',[
 R.say(
  String.raw`上一节用球上的箭头表示量子态，也可以用公式表示：$$|\psi\rangle=a|0\rangle+b|1\rangle.$$其中 $|\psi\rangle$ 读作“psi 态”，泛指一个量子比特的状态；系数 $a$、$b$ 称为<strong>概率幅</strong>。`,
  '概率幅不等于概率。概率描述一个结果有多大可能出现，取值在 0 到 1 之间；概率幅要经过平方，才得到概率。例如概率幅是 1/2，概率就是 1/4，也就是 25%。概率幅可以带负号，概率却不能为负。'
 ),
 R.say(
  String.raw`在计算基测量中，测到 0 和 1 的概率分别是：$$P(0)=|a|^2,\qquad P(1)=|b|^2.$$竖线表示取模，也就是取概率幅的大小。本节的例子都用实数，取模就是取绝对值。一般的概率幅还可以是复数，但“取模再平方”的规则相同。两种结果的概率之和为 1。`
 ),
 R.ask(String.raw`量子比特处于状态 $$|\psi\rangle=\frac12|0\rangle+\frac{\sqrt3}{2}|1\rangle.$$测到 0 的概率是多少？`,
  ['50%','25%','75%'],1,
  String.raw`$|0\rangle$ 前的概率幅是 $1/2$，所以 $P(0)=(1/2)^2=1/4=25\%$。`),
 R.ask(String.raw`量子比特处于状态 $$|\psi\rangle=\frac35|0\rangle+\frac45|1\rangle.$$测到 0 和 1 的概率分别是多少？`,
  ['36% 和 64%','60% 和 80%','50% 和 50%'],0,
  String.raw`分别平方：$P(0)=(3/5)^2=9/25=36\%$，$P(1)=(4/5)^2=16/25=64\%$。检查概率之和：$36\%+64\%=100\%$。`),
 R.ask(String.raw`这次概率幅带有负号：$$|\psi\rangle=\frac{1}{\sqrt2}|0\rangle-\frac{1}{\sqrt2}|1\rangle.$$测到 1 的概率是多少？`,
  ['−50%','100%','50%'],2,
  String.raw`$P(1)=|-1/\sqrt2|^2=1/2=50\%$。负号不会产生负概率；测到 0 的概率也是 50%。这个负号有什么作用，本章最后一节会讨论。`),
 R.ask('把一个量子比特设为赤道上的叠加态，测量一次，得到 1。接着不做任何操作，马上用同样的方式再测一次（假设测量是理想的，中间没有干扰）。<br><br>第二次会得到什么？',
  ['确定仍为 1','得到 0 和 1 的概率仍各为 50%'],0,
  String.raw`第一次得到 1 后，状态成为 $|1\rangle$。没有其他操作或干扰时，再做同样的理想计算基测量，就会确定得到 1。`),
 R.say(
  '测量不仅给出一个结果，也会改变量子比特的状态。这种变化叫作<strong>量子态的塌缩</strong>。',
  String.raw`可以用球上的箭头来想象。箭头表示的是量子态，不是原子在空间里的位置。测量前，箭头可以指向赤道等位置；进行一次计算基测量后，它会“落定”在两个极点之一：得到 0，测后的状态就是北极的 $|0\rangle$；得到 1，就是南极的 $|1\rangle$。`,
  '这也解释了上一题：测完马上再测，结果由测后的新状态决定。第一次得到 1，第二次也一定得到 1。'
 ),
 R.ask('我们换一种做法：第一次测得 1 之后，先把量子比特重新设为原来的赤道叠加态，再测一次。<br><br>这次还一定得到 1 吗？',
  ['一定，仍然得到 1','不一定，测到 0 和 1 的概率各为 50%'],1,
  '重新设置后，量子比特又回到原来的叠加态，两种结果的概率各为 50%。第一次的结果不会固定这次的结果。'),
 R.end('量子态决定测量概率，测量结果决定测量后的状态。再次测量时，如果状态保持测量后的样子，结果就是确定的；如果重新制备了状态，就要按新状态重新计算概率。<br>下一节，我们用量子门主动改变状态。')
]);
R.add('C2-3',[
 R.say('单比特门只作用于一个量子比特，用来改变它的状态。本节介绍四种常用单比特门：X、Y、Z 和 H。其中 X、Y、Z 合称 Pauli 门，H 叫作 Hadamard 门。',
  String.raw`在 Bloch 球上，X、Y、Z 分别对应绕 $x$、$y$、$z$ 轴旋转半圈（即旋转 $\pi$）。H 则对应绕一根斜轴旋转半圈，这根轴位于 $x$、$z$ 正方向的正中间，与两轴各成 $45^\circ$。`),
 R.play('gates','从零态出发，连续按两次 X，观察每次操作后箭头的方向。',
  {c:'qubit',key:'xzero',init:'zero',gates:['X'],axis:'X',showFormula:true,showMeasurement:false,required:true,minGates:2,explain:'X 交换零态和一态。连续施加两次 X，状态回到起点。'}),
 R.ask('刚才 X 让箭头在南北极之间翻转。现在把初态换成赤道上指向 +x 的叠加态，叫作加号态，记作 $|+\\rangle$。<br><br>施加一次 X 后，箭头会指向哪里？',
  ['仍指向 +x','转向 −x','转到南极'],0,'+x 方向正好是 X 门的旋转轴。箭头沿着旋转轴时，绕这根轴转动不会改变它的方向。同一个 X 门作用于不同初态，结果可以不同。'),
 R.play('gates','从 $|+\\rangle$ 出发，按一次 Y，观察箭头的方向如何变化。',
  {intro:['Y 门绕 y 轴旋转半圈。和 X 一样，它也会交换南北极。这次从 $|+\\rangle$ 出发，比较它与 X 的区别。'],c:'qubit',key:'yplus',init:'plus',gates:['Y'],axis:'Y',showFormula:true,showMeasurement:false,required:true,explain:'$|+\\rangle$ 经过 Y 后，箭头指向赤道的 −x 方向，这个状态叫减号态，记作 $|-\\rangle$。'}),
 R.ask('同样从 $|+\\rangle$ 出发，X 让箭头保持不变，Y 却让它转到 −x。<br><br>为什么这两个门的作用不同？',
  ['旋转角度不同：Y 比 X 多转了半圈','旋转轴不同：箭头正好在 X 的旋转轴上，却不在 Y 的旋转轴上'],1,'X 和 Y 都旋转半圈，区别在于旋转轴。沿 x 轴的箭头绕 x 轴转动时方向不变，绕 y 轴转半圈则指向 −x。'),
 R.play('gates','从 $|+\\rangle$ 出发，按一次 Z，观察箭头沿赤道的变化。',
  {intro:['Z 门绕 z 轴旋转半圈。z 轴穿过南北极，$|+\\rangle$ 的箭头与这根轴垂直。'],c:'qubit',key:'zplus',init:'plus',gates:['Z'],axis:'Z',showFormula:true,showMeasurement:false,required:true,explain:'Z 把 $|+\\rangle$ 变成 $|-\\rangle$。它与 Y 对这个初态的最终方向相同，但旋转轴不同。'}),
 R.ask('刚才 Z 把赤道上的箭头转到了相反方向。如果把初态换成北极的零态，箭头就沿着 z 轴。<br><br>施加一次 Z 后，箭头会怎样？',
  ['转到南极','保持原方向'],1,'北极的箭头沿着 Z 门的旋转轴，绕这根轴转动时方向不变。南极也一样。Z 会改变 $|+\\rangle$ 的方向，却不会改变两极的方向。'),
 R.play('gates','从零态出发，连续按两次 H，观察每次操作后箭头停在极点还是赤道上。',
  {intro:['H 门绕 x、z 正方向正中间的斜轴旋转半圈。'],c:'qubit',key:'hzero',init:'zero',gates:['H'],axis:'H',showFormula:true,showMeasurement:false,required:true,minGates:2,explain:'第一次 H 把零态变成 $|+\\rangle$，第二次 H 把 $|+\\rangle$ 变回零态。'}),
 R.ask('根据刚才连续两次 H 的实验，H 会把所有输入状态都变成叠加态吗？',
  ['会，H 的输出总是叠加态','不会，输出取决于输入状态'],1,'H 把零态变成 $|+\\rangle$，但也把 $|+\\rangle$ 变回零态。因此，不能把 H 理解成总会产生叠加态的操作。'),
 R.say('把门按时间顺序排在一条线上，就得到单比特线路。线代表量子比特，方框代表门，从左到右执行。',
  '接下来自由组合这四种门，观察状态怎样一步步变化。“撤销”退回上一步，“重置”回到本次实验的初态。'),
 R.play('gates','任选 X、Y、Z、H 组成线路，对照球上的状态变化，再试试撤销和重置。',
  {c:'qubit',key:'circuit',init:'zero',gates:['X','Y','Z','H'],axis:'H',showFormula:true,showMeasurement:false,required:true}),
 R.end('现在你认识了 Pauli 门 X、Y、Z 和 Hadamard 门 H。每个门都有固定的作用规则，结果还取决于输入的状态。<br>下一节继续比较 $|+\\rangle$ 与 $|-\\rangle$：为什么测量概率相同的两个状态，经过同一个门后会得到不同的结果？')
]);
R.add('C2-4',[
 R.say(
  String.raw`两个状态可以有相同的测量概率，却有不同的概率幅。例如：$$|+\rangle=\frac{|0\rangle+|1\rangle}{\sqrt2},\qquad |-\rangle=\frac{|0\rangle-|1\rangle}{\sqrt2}. $$直接测量（不加其他门，直接做计算基测量）这两个状态，得到 0 和 1 的概率都各为 50%。`,
  String.raw`区别在于符号：$|+\rangle$ 的两个概率幅同号，$|-\rangle$ 的两个概率幅异号。两个分量之间的这种差别叫作<strong>相对相位</strong>（概率幅为复数时，相对相位可以取任意角度，正负号是其中最简单的情况）。在 Bloch 球上，相对相位对应箭头绕 z 轴转到的方位，所以 $|+\rangle$ 和 $|-\rangle$ 位于赤道的相反两侧。`
 ),
 R.say(
  String.raw`同一个量子态有两种写法。一种用概率幅：$$|\psi\rangle=a|0\rangle+b|1\rangle$$另一种用 Bloch 球上箭头的两个角度：$$|\psi\rangle=\cos\frac{\theta}{2}|0\rangle+e^{i\phi}\sin\frac{\theta}{2}|1\rangle$$`,
  String.raw`θ 是箭头偏离北极的角度，决定测量概率：$P(0)=\cos^2(\theta/2)$，$P(1)=\sin^2(\theta/2)$。`,
  String.raw`φ 是箭头绕 z 轴转到的方位角，对应相对相位。$e^{i\phi}$ 的模为 1，只改变相位，不改变概率幅的大小（$i$ 是虚数单位，$i^2=-1$）。`
 ),
 R.play("formula","切换状态，观察 θ 和 φ 怎样变化。",{"key":"angles","showMeasurement":false,"init":"plus","presets":["zero","one","plus","minus","yplus"],"mathDetails":true,"formulaNotes":false,"c":"qubit","explain":"θ 相同的状态，直接测量的概率相同；φ 不同，相对相位就不同。"}),
 R.ask(String.raw`只看直接测量的概率，能区分 $|+\rangle$ 和 $|-\rangle$ 吗？`,['能','不能'],1,'取模平方后，两者的测量概率都是各半，但量子态并不相同。'),
 R.play('gates',String.raw`对 $|+\rangle$ 施加一次 Z，观察公式、球上方向和测量概率。`,{key:'zphase',sample:false,init:'plus',gates:['Z'],axis:'Z',showFormula:true,required:true,c:'qubit',explain:String.raw`Z 门只改变相对相位，把 $|+\rangle$ 变为 $|-\rangle$，直接测量的概率仍各半。`}),
 R.ask(String.raw`如果先给 $|+\rangle$ 和 $|-\rangle$ 各施加一个 H 门，再进行计算基测量，结果会怎样？`,
  ['两种初态仍然都以各 50% 的概率得到 0 或 1','$|+\\rangle$ 确定得到 0，$|-\\rangle$ 确定得到 1','$|+\\rangle$ 确定得到 1，$|-\\rangle$ 确定得到 0'],1,
  String.raw`H 门将 $|+\rangle$ 变为 $|0\rangle$，将 $|-\rangle$ 变为 $|1\rangle$。因此，再进行计算基测量，就能确定地区分这两个初态。下一页动手验证。`),
 R.play('compare','给 $|+\\rangle$ 和 $|-\\rangle$ 同时施加 H，对照操作前后的状态与测量概率。',
  {c:'qubit',key:'phase-after-h',pair:'phase',sample:false,required:true,explain:'H 将 $|+\\rangle$ 变为零态、$|-\\rangle$ 变为一态，再测量就分别确定得到 0 和 1。'}),
 R.ask(String.raw`$|+\rangle$ 和 $|-\rangle$ 直接测量的概率相同，经过同一个 H 后，测量结果却完全不同。这说明了什么？`,
  ['H 门会随机地给出不同结果','相对相位不影响直接测量的概率，却会影响后续操作的结果'],1,'H 的作用是确定的。两个状态只差在相对相位上，这个差别在直接测量时看不出来，经过 H 之后就变成了测量概率的差别。第六章会把这个现象称为干涉。'),
 R.end('概率幅的模平方决定直接测量的概率；相对相位虽然不改变直接测量的概率，却会影响后续操作的结果。<br>下一章，我们从一个量子比特走向两个量子比特。')
]);
;
/* js/lessons/required-3.js */
/* Joint states → entanglement → no-cloning → teleportation. */
R.add('C3-1',[
 {...R.ask('从这一章开始，我们同时使用两个量子比特 q0 和 q1。一起测量它们，会得到一对结果。<span class="joint-readout"><span><small>q0</small><strong>0</strong></span><span><small>q1</small><strong>1</strong></span></span>按 q0、q1 的顺序，这次的结果记作什么？',['00','01','10','11'],1,'按 q0、q1 的顺序记录：前一位是 0，后一位是 1，所以记作 01。')},
 R.ask('<span class="q-lead">下面用两种方式准备两个量子比特，每种方式都重复 100 次，再一起测量：</span><span class="cap-item"><strong>A 组</strong>：q0、q1 各自独立地随机准备成 0 或 1，各占一半。</span><span class="cap-item"><strong>B 组</strong>：每次先随机选定 00 或 11（各占一半），再按选定的结果准备两个比特。</span><span class="cap-item">单独看任意一位，两组测到 0、1 的概率都是各占一半。</span><br>两组中，哪一组可能测到 01 这样两位不同的结果？',['只有 A 组','只有 B 组','两组都可能'],0,'A 组两位各自随机，01、10 都可能出现；B 组两位总是一起选定，只会出现 00 或 11。下一页用实验验证。'),
 R.play('both','运行两组实验，对照两位一起出现的结果。',{c:'jointLesson'}),
 R.ask('两组单独看每一位，概率完全相同，一起看的结果却不同。这说明了什么？',['只要知道每一位各自的概率，就能确定两位一起出现的结果','描述两个比特时，还要知道哪些结果会一起出现'],1,'每一位各自的概率只描述了“分开看”的情况。两个比特之间可能存在关联：B 组的两位总是相同，A 组则没有这种关联。'),
 R.end('分别看，每一位都可能是 0 或 1；一起看，还要知道哪些结果会共同出现。<br>B 组的关联来自经典的随机选择：每次先随机选定 00 或 11，再分别准备两个比特。本章后面会看到另一种来源的关联：纠缠。<br>下一节认识同时作用于两个比特的 CNOT 门。')
]);
R.add('C3-2',[
 {...R.say('CNOT 是受控翻转门：控制比特为 1 时翻转目标比特，为 0 时目标比特不变。这里 q0 控制 q1。','线路上的实心点是控制位，带圈的加号是目标位。控制位本身不会改变。'),illustration:{src:'assets/illustrations/cnot-circuit.svg',alt:'CNOT 线路：上方 q0 的实心点为控制，下方 q1 的带圈加号为目标。',width:640,height:250,wide:true}},
 R.ask(String.raw`从 $|10\rangle$ 出发（q0 为 1，q1 为 0）做一次 CNOT，会得到什么？`,['00','10','11'],2,'q0 为 1，所以把 q1 从 0 翻到 1，得到 11。'),
 R.play('cnot','切换四种输入，连续执行两次 CNOT，对照输入与输出。',{c:'entanglement',key:'cnot'}),
 R.ask('连续执行两次 CNOT 之后，两个比特的状态会怎样？',['目标位被翻转两次，一定变成 1','回到原来的输入状态'],1,'控制位为 1 时，目标位被翻转两次，回到原值；控制位为 0 时，目标位始终不变。所以连续两次 CNOT 相互抵消。'),
 R.end('控制比特为 0 时，CNOT 不改变目标比特；控制比特为 1 时，CNOT 翻转目标比特。<br>下一节把 H 和 CNOT 组合起来，制备一个纠缠态。')
]);
R.add('C3-3',[
 R.say('如果两个量子比特的状态无法拆成“q0 的状态”和“q1 的状态”分别描述，只能作为一个整体描述，就称它们处于<strong>纠缠</strong>态。','贝尔态（Bell 态）是最典型的纠缠态，共有四种。本节制备其中一种：',String.raw`$$\frac{|00\rangle+|11\rangle}{\sqrt2}.$$`, '它是 00 与 11 的等幅、同相位叠加：两项概率幅的大小相同、符号相同。直接测量两个比特时，只会得到 00 或 11，各有一半概率。'),
 R.play('bell-build','从 |00⟩ 开始，自己选择量子门，观察联合状态怎样变化，试着得到上一页的贝尔态。',{c:'entanglement',key:'bell-build'}),
 R.say('经过 H → CNOT，我们制备出了目标贝尔态。直接测量时，每一位的结果都是随机的，两位的结果却总相同；多次独立制备与测量的计数通常接近各半，不必恰好相等。'),
 R.say('这和第一节的 B 组很像：B 组也只出现 00 和 11，各占一半。区别在于关联的来源。B 组每次先随机选定 00 或 11，测量前两个比特就已经有确定的值，只是我们不知道；贝尔态在测量前并没有确定是 00 还是 11，两项同时存在，并保持着确定的相对相位。','只做直接测量，两者的统计结果完全相同。如果先给两个比特各施加一个 H 再测量，B 组会以各 25% 的概率出现 00、01、10、11；这个贝尔态却仍然只出现 00 和 11。这正是第二章看到的现象：相对相位在直接测量中看不出来，经过后续操作才显现出来。'),
 R.end('理想的 H → CNOT 会把 |00⟩ 制备成贝尔态。它的关联来自纠缠，而不是测量前就已确定的经典随机选择。<br>在用纠缠传送量子态之前，先看一个限制：未知的量子态能不能被复制？')
]);
R.add('C3-4',[
 R.say('经典信息可以随意复制，一份文件可以拷贝无数次。那么，能不能造一台“量子复印机”？','设想这样一台机器：输入一个未知态 $|\\psi\\rangle$ 和一个空白比特 $|0\\rangle$，输出两份 $|\\psi\\rangle$。'),
 R.ask('以 q0 为控制位的 CNOT，能把 $|0\\rangle$ 复制成 $|00\\rangle$，把 $|1\\rangle$ 复制成 $|11\\rangle$。<br><br>把 q0 换成 $|+\\rangle$，再执行同一个 CNOT，会得到两份 $|+\\rangle$ 吗？',
  ['会，得到两份 $|+\\rangle$','不会，得到的是上一节的贝尔态'],1,
  String.raw`这正是上一节的 H → CNOT：结果是贝尔态 $(|00\rangle+|11\rangle)/\sqrt2$，只会测到 00 或 11。两份 $|+\rangle$ 则是 $(|00\rangle+|01\rangle+|10\rangle+|11\rangle)/2$，四种结果各占 25%。CNOT 能复制 0 和 1，却不能复制它们的叠加。`),
 R.say('这不是 CNOT 不够好。量子操作对叠加态的作用，由它对 $|0\\rangle$、$|1\\rangle$ 的作用按概率幅组合而成。能复制 $|0\\rangle$ 和 $|1\\rangle$ 的机器，作用在叠加态上只能得到纠缠态，得不到两份副本。','可以证明：不存在一台机器能完美复制任意未知的量子态。这就是<strong>量子不可克隆定理</strong>。','先测量、再照着结果重新准备，也行不通：一次测量只得到 0 或 1，并且会让状态塌缩，得不到概率幅的完整信息。'),
 R.ask('关于量子不可克隆定理，哪种说法正确？',
  ['任何量子态都无法再制备出第二份','只要测量得足够仔细，就能读出未知态再复制','已知的状态（例如 $|0\\rangle$）可以反复制备；不能完美复制的是任意未知的量子态'],2,
  '如果知道状态是什么，按同样的步骤再制备一份就可以。不可克隆定理限制的是：手里只有一个未知态时，无法得到它的完美副本。'),
 R.end('未知的量子态既不能被完美复制，也不能靠一次测量读出来。<br>那么，怎样把 Alice 手中的未知量子态交给 Bob？下一节的量子隐形传态给出了答案。')
]);
R.add('C3-5',[
 R.play('resources','怎样把 Alice 手中的未知量子态转移给 Bob？',{c:'teleportLesson'}),
 {...R.ask('Alice 手中有一个处于未知态的量子比特 Q，以及纠缠对中的一个量子比特 A；Bob 持有纠缠对中的另一个量子比特 B。接下来，Alice 应该怎样做？',[
  '直接测量 Q，把结果告诉 Bob，让他照着准备原态。',
  '对 Q 和 A 一起进行操作，再测量它们，把结果告诉 Bob。',
  '不做任何操作，Bob 的 B 已经自动变成了 Q 的状态。'
 ],1,'上一节讲过，直接测量一个未知态，得不到重建它所需的完整信息；共享纠缠也不会自动完成传态。<br><br>Alice 需要先对 Q、A 做特定操作：<strong>Q 控制 A 做 CNOT，再对 Q 做 H</strong>，随后测量这两个比特。这样，测量结果就能告诉 Bob 应该怎样修正 B，恢复原来的量子态。'),feedbackCircuit:'teleport-prepare'},
 R.play('derive','从输入态出发，展开 CNOT 和 H 后的完整状态。',{c:'teleportLesson'}),
 {...R.ask('Alice 测得 <strong>a=0、b=1</strong>，即 Q、A 的结果为 01。Bob 尚未执行修正，此时 B 的归一化状态是什么？',[
  String.raw`$\alpha|0\rangle+\beta|1\rangle$`,
  String.raw`$\alpha|1\rangle+\beta|0\rangle$`,
  String.raw`$\alpha|0\rangle-\beta|1\rangle$`,
  String.raw`$\alpha|1\rangle-\beta|0\rangle$`
 ],1,String.raw`测得 01，就在完整展开式中保留 Q、A 为 01 的两项：<div class="teleport-algebra">$$\frac{\alpha}{2}|011\rangle+\frac{\beta}{2}|010\rangle.$$</div>把共同的 $|01\rangle_{QA}$ 提出来，得到：<div class="teleport-algebra">$$\frac12|01\rangle_{QA}(\alpha|1\rangle+\beta|0\rangle)_B.$$</div>这一分支的概率是 ¼。保留该分支并归一化后，B 的状态为 $\alpha|1\rangle+\beta|0\rangle$。用同样的方法，可得到下表。表中均为测量后、Bob 修正前的归一化状态。
 <table class="protocol-table teleport-state-table"><thead><tr><th scope="col">结果 ab</th><th scope="col">B 的状态（修正前）</th></tr></thead><tbody>
 <tr><th scope="row">00</th><td>$\alpha|0\rangle+\beta|1\rangle$</td></tr>
 <tr><th scope="row">01</th><td>$\alpha|1\rangle+\beta|0\rangle$</td></tr>
 <tr><th scope="row">10</th><td>$\alpha|0\rangle-\beta|1\rangle$</td></tr>
 <tr><th scope="row">11</th><td>$\alpha|1\rangle-\beta|0\rangle$</td></tr>
 </tbody></table>`),key:'teleport-state'},
 R.play('transfer','把 Alice 的测量结果告诉 Bob，完成这一次传态。',{c:'teleportLesson'}),
 R.ask('另一轮传态中，Bob 收到 <strong>a=1、b=0</strong>。他应该怎样修正？',
  ['不操作','只做 X','只做 Z','先 X，再 Z'],2,
  String.raw`这一轮 B 的状态为 $\alpha|0\rangle-\beta|1\rangle$。只做 Z，就恢复 $\alpha|0\rangle+\beta|1\rangle$。一般地，先看 b：b=1 时做 X；再看 a：a=1 时做 Z。对应结果为 0，就跳过那个门。
  <table class="protocol-table teleport-corrections"><caption>测量结果与 Bob 的修正</caption><thead><tr><th scope="col">结果 ab</th><th scope="col">修正操作</th></tr></thead><tbody><tr><th scope="row">00</th><td>不操作</td></tr><tr><th scope="row">01</th><td>只做 X</td></tr><tr><th scope="row">10</th><td>只做 Z</td></tr><tr><th scope="row">11</th><td>先 X，再 Z</td></tr></tbody></table>`),
 R.ask('关于刚才的协议，哪项描述正确？',[
  'Bob 恢复原态，Alice 也保留原态，因此双方各有一个副本。',
  'Bob 恢复原态，Alice 不再保有原态；Bob 需要经典消息来确定修正。',
  '有了共享纠缠，Bob 就可以省略接收经典消息，直接恢复任意输入态。'
 ],1,'Alice 的 Q 已被测量，原态没有留下副本，这与不可克隆定理一致。Bob 也必须收到经典消息，才能确定修正。'),
 R.end('传态把未知量子态转移给 Bob：Alice 不再保有原态，没有产生副本，Bob 也离不开经典消息。<br>下一章看看这些量子线路怎样在真实的硬件上运行。')
]);

// Illustrate explanations and predictions with the matching circuit.
const CHAPTER_THREE_CIRCUITS={
 'C3-2':{0:'cnot',1:'cnot10',3:'cnot'},
 'C3-3':{2:'bell-measured',3:'pair-X'},
 'C3-4':{0:'candidate',1:'bell'},
};
for(const [id,pages] of Object.entries(CHAPTER_THREE_CIRCUITS)){
 for(const [index,circuit] of Object.entries(pages))LESSONS[id].pages[index].circuit=circuit;
}
;
/* js/lessons/required-4.js */
/* Hardware first; compile the same operations for different architectures. */
R.add('C4-1',[
 {t:'show',art:'quantumStack',cap:'前面我们在理想模型中使用量子线路。本章认识承载量子信息的硬件，再看编译怎样把量子线路变成设备能执行的操作。'},
 {t:'show',art:'hardwareOverview',cap:'五种路线用不同的物理系统承载量子信息。'},
 R.say('无论使用哪种物理系统，要执行一条量子线路，硬件都要完成三件事：把量子比特准备到初态，用控制信号实现量子门，最后测量并读出结果。下面逐一来看。'),
 {...R.ask('线路要求从 |0⟩ 开始。承载量子比特的器件或原子已经装进设备，能直接开始执行门操作吗？',['可以，装进设备后状态就确定了','还不行，需要先把量子比特准备到线路要求的初态'],1,'装进设备只是有了物理载体，并不等于它处在线路要求的量子态。开始计算前，需要先把量子比特准备到线路要求的初态。')},
 {...R.ask('线路中的 X 门要求把 |0⟩ 变成 |1⟩。设备此时需要做什么？',['施加控制信号，改变量子态','读出量子比特，记录一个结果'],0,'门操作改变状态。例如，超导设备可以用经过校准的微波信号操控量子比特；这一步不是测量。')},
 {...R.ask('两个比特从 |00⟩ 开始，只分别对它们做单比特门，就能制备贝尔态吗？',['能，只要每个比特都进入叠加态','不能，还需要能产生纠缠的双比特操作'],1,'单比特门只能分别改变每个比特，不能让两个独立的比特纠缠起来。硬件还要支持合适的双比特操作，例如第三章用到的 CNOT。')},
 {...R.ask('在离子阱中，离子处于不同的内部态时，被激光照射后会发出明暗不同的荧光。收集并判别这些信号，属于哪一步？',['准备初态','执行量子门','测量与读出'],2,'测量与读出得到结果记录；控制信号则用于实现线路要求的状态变化。')},
 R.ask('下面哪一组步骤能执行“从 |0⟩ 开始，做 X，再测量”的线路？',['准备初态 → 做 X → 测量','测量 → 做 X，不需要准备初态','把量子比特的载体移动到另一个位置 → 测量'],0,'准备、操控、测量是不同的任务。这些硬件路线都需要完成这些任务，只是物理过程不同。'),
 R.end('我们已经知道硬件要做什么。<br>下一节看看，怎样让同一条量子线路适配设备支持的门和连接方式。')
]);
R.add('C4-2',[
 R.say('量子线路写出要做的操作。编译把它转换成目标设备能够执行的形式，同时保持原本的计算作用。','我们只看两个问题：设备不直接支持这个门怎么办？需要作用的两个比特连不上怎么办？'),
 {t:'show',art:'compileDevices',carry:'设备不直接支持这个门怎么办？',cap:'两种实现的理想作用相同。CZ（受控 Z 门）只在两个比特都为 1 时给这一项变号，其余情况不变；两侧的 H 都作用在 CNOT 的目标比特上。'},
 R.ask('用 H → CZ → H 替代一个 CNOT，门数增加了。这是否意味着编译失败？',['是，编译必须减少门数','不是，这些门共同实现了设备不能直接执行的操作'],1,'门分解首先要保持计算作用并适配设备。门数增加不等于编译失败。'),
 R.ask('再看连接问题。在超导等设备上，量子比特由芯片上位置固定的器件承载，只有相邻的器件之间才能直接执行双比特门。如果线路要求两个不相邻的量子比特执行双比特门，可以怎么做？',['忽略连接限制，直接执行双比特门','用 SWAP（交换门）交换两个器件承载的量子态，让它们由相邻的器件承载','省略这个双比特门'],1,'SWAP 交换两个相邻器件承载的量子态。交换后，原本不相邻的两个量子态就由相邻的器件承载，可以执行所需的门。器件本身不移动，也不能随意省略线路要求的操作。接下来逐步观察一种实现。'),
 {t:'play',c:'hardwareCompile',mode:'fixed',task:'线路要求先做 CZ(q0, q2)，再做 CZ(q1, q2)。逐步观察固定连接上的实现。',ok:m=>m.finished,gh:'走到最后一步，观察量子态如何沿固定连接交换。'},
 R.ask('刚才的 SWAP 改变了什么？',['芯片上器件的位置','量子态由哪个器件承载'],1,'SWAP 交换两个器件承载的量子态，器件本身不移动。之后的操作要跟踪新的对应关系。'),
 {t:'play',c:'hardwareCompile',mode:'reconfigurable',task:'换成可重排的中性原子阵列：原子可以被激光“光镊”搬动，在上方的纠缠区执行双比特门，在下方的存储区等待。同样的三比特线路怎样执行？逐步观察原子移动与 CZ 的先后顺序。',ok:m=>m.finished,gh:'播放或逐步走到最后一步，再继续。'},
 R.ask('把 q0、q2 搬进纠缠区之后，线路要求的 CZ 就已经完成了吗？',['已经完成，靠近就等于执行了门','还没有，还要执行相应的门操作'],1,'移动只改变位置和可用的相互作用条件；CZ 是另一个操作。'),
 R.ask('这个示例为什么先把 q0 移开，再让 q1 与 q2 执行下一次 CZ？',['移动 q0 就是在测量它','为下一次操作安排位置，并减少对不参与运算的原子的影响','所有原子每次都必须回到最初的位置'],1,'这个示例让 q0 返回存储区，q2 留在纠缠区，再把 q1 搬进来。编译器安排的是具体的执行顺序，不只是翻译门的名字。'),
 R.ask('可重排阵列能把任意两个原子搬到一起。这是否说明它在所有方面都优于固定连接的设备？',['是，能移动就没有限制','不一定，移动需要时间，也要遵守设备的控制条件'],1,'不同架构提供不同的实现方式，也带来不同的约束。不能只凭“可重排”就判断哪种设备更好。'),
 {t:'show',art:'quantumStack',recap:true,cap:'沿图回顾：线路规定计算；编译安排门、位置与顺序；控制系统把指令变成信号，驱动物理硬件。实际系统还包含跨层的校准、运行时与纠错。'},
 R.ask('把 CZ 分配到可以直接作用的一对比特，并安排 SWAP 或原子移动，主要属于哪一层？',['应用与算法','编译','物理硬件'],1,'编译连接线路与设备。它要结合门集、连接方式和控制约束，安排保持原计算作用的实现。'),
 R.end('线路相同，在不同设备上的实现可以不同。<br>下一章看看噪声为什么会让实际结果偏离理想计算。')
]);
;
/* js/lessons/required-5.js */
/* Layer 5: learn noise, bit flips and correction through short questions. */
R.add('C5-1',[
 R.say('同样的量子实验，为什么不一定得到同样的结果？先做几道题，分清测量本身的随机性和噪声。'),
 R.ask('每次都重新准备 |+⟩，再理想地测量 0/1。有时得到 0，有时得到 1，这说明设备出错了吗？',['说明设备出错了','不说明，这个态的测量结果本来就有随机性'],1,'|+⟩ 在理想测量中得到 0、1 的概率各为一半。单次结果不确定，不代表发生了错误。'),
 R.play('single','反复准备 |+⟩ 并测量。先模拟 32 次，再换成 512 次，对比两次的计数。',{buttons:true,sample:true,controls:[['shots','重复次数',[[32,'32 次'],[512,'512 次']]]],initial:{prep:'plus',analysis:'none',shots:32},observe:[{shots:32},{shots:512}],note:'每次都重新准备 |+⟩ 再测量，单次结果无法预测。计数来自模拟采样，每次运行都不一样。',pm:'理论概率始终各占一半；每批计数都会上下波动，次数越多，比例越接近 50%。'}),
 R.ask('理论上测到 0、1 的概率各为 50%。重复实验 100 次，得到 48 次 0、52 次 1。仅凭这一点，能确定有噪声吗？',['能，必须正好各 50 次才正常','不能，有限次数的计数本来就会波动'],1,'概率各占一半，不要求每批计数都恰好相等。这种采样波动在理想实验中也会出现。'),
 R.ask('已经正确准备了 |0⟩，没有安排任何改变状态的操作。测量前，环境扰动却把它变成了 |1⟩。这属于什么？',['噪声造成的状态错误','|0⟩ 的理想测量随机性'],0,'理想情况下，直接测量 |0⟩ 应当得到 0。这里是额外的物理扰动改变了状态；噪声也可能影响操作和读出。'),
 R.ask('读出仪器有时会把 0 记成 1。仅把实验从 100 次增加到 1000 次，会自动消除这种错误吗？',['会，多测几次就能修好','不会，只会更稳定地看清带有读出错误的结果'],1,'更多采样能减小统计波动，却不会自动修好读出仪器。要减少这种错误，需要针对错误来源采取措施。'),
 R.ask('计算还在进行，量子比特持续受到环境扰动。一直不测量，就能避免噪声影响吗？',['不能，等待和操作期间也可能发生错误','能，只有测量时才会出错'],0,'噪声不需要等到测量时才起作用。计算持续得越久，越需要保护其中的量子信息。'),
 R.end('测量可以天然随机，有限次计数也会波动；噪声则会额外影响状态、操作或读出。增加测量次数不能自动消除噪声。<br>下一节，试着发现并纠正一个错误。')
]);
R.add('C5-2',[
 R.say('先看一种简单错误：0 变成 1，或 1 变成 0，叫作比特翻转（bit flip）。','从一个经典比特的例子开始：用 000 表示 0，用 111 表示 1。先假设最多只有一位发生翻转。'),
 R.ask('收到 010。在“最多一位翻转”的前提下，原来是哪一组？',['000','111'],0,'010 与 000 只差中间一位，与 111 差两位。在这个前提下，原来只能是 000，中间一位出错了。'),
 R.ask('要把 010 恢复成 000，应该做什么？',['把第一位翻转','把第二位再翻转一次','把第三位翻转'],1,'把中间的 1 翻回 0，就恢复了 000。找到错误后采取恢复操作，这就是纠正（correction）。'),
 R.ask('现在不告诉你每一位的值，只告诉你：第 1、2 位不同，第 2、3 位也不同。在最多一位翻转的前提下，哪一位出错了？',['第 1 位','第 2 位','第 3 位'],1,'两边都与中间不同，说明中间一位发生了翻转。无论原来是 000 还是 111，这条判断都成立：只比较各位之间的关系，就能得到错误线索。'),
 R.play('syndrome','逐个选择翻转的位置，只看“第 1、2 位是否相同”“第 2、3 位是否相同”，能不能找出出错的那一位？最后试试两位同时翻转。',{buttons:true,observe:[{mask:4},{mask:2},{mask:1},{mask:3}],pm:'单个翻转都能被准确定位；两位同时翻转时，比较结果会把它伪装成另一位出错。'}),
 R.ask('如果原来是 000，却有两位翻转成了 110，仍按“最多一位出错”来纠正，会得到什么？',['恢复为 000','误以为第三位出错，变成 111'],1,'110 与 111 只差一位，纠正反而会选错。这种三位保护只能纠正一位翻转，不能处理任意多个错误。'),
 R.say('怎样把这个思路用到量子信息上？难点在于：第三章讲过，未知的量子态不能复制，测量又会让它塌缩，所以不能像经典比特那样复制几份、逐一读出来比较。','量子纠错（QEC，Quantum Error Correction）把一个量子比特的信息编码到多个量子比特中，再用额外的辅助比特比较它们之间的关系（就像刚才比较“第 1、2 位是否相同”），取得错误线索，而不直接读出被保护的量子信息。','硬件上实际存在的量子比特叫<strong>物理比特</strong>；由多个物理比特共同编码、受到保护的那个量子比特叫<strong>逻辑比特</strong>。'),
 R.ask('在三位量子翻转码中，通过比较已经确定：第 2 个物理比特发生了 X 翻转。哪种操作可以纠正它？',['测量所有物理比特，再按多数重新准备','在第 2 个物理比特上再施加一次 X 门'],1,'X 会交换 |0⟩ 和 |1⟩，连续两次 X 相互抵消。因此，定位后再施加一次 X，可以撤销这次翻转，而不必读出被保护的量子态。'),
 R.say('刚才只处理了翻转错误。量子态还可能发生相位错误，完整的量子纠错方案也要处理它们。','而且，检查和纠正的操作本身也可能出错。要完成长时间的计算，需要在计算过程中持续保护信息，并避免操作中的错误扩散到无法纠正。'),
 R.ask('下面哪种做法更接近容错量子计算？',['开始时纠错一次，之后不再检查','在计算过程中反复纠错，并用能控制错误传播的方式执行量子门'],1,'这就是容错量子计算（FTQC，Fault-Tolerant Quantum Computing）的方向：利用纠错和容错操作，让不完美的物理比特也能支持可靠的计算。它需要底层错误率足够低，单纯增加比特数量并不能保证成功。'),
 R.end('从发现翻转、定位错误，到施加纠正操作，我们认识了纠错的基本思路。QEC 用编码保护量子信息；FTQC 进一步把这种保护贯穿整个计算过程，让逻辑比特可靠地完成计算。<br>下一章看看量子算法怎样利用叠加与相位，解决具体问题。')
]);
;
/* js/lessons/required-6.js */
/* Chapter 6: amplitudes and interference, then two algorithms that use them. */
R.add('C6-1',[
 {t:'show',art:'mziSetup',cap:'先认识一个经典的光学实验装置：<strong>马赫-曾德尔干涉仪</strong>。<span class="cap-item"><strong>光子源</strong>每次只发出一个光子。</span><span class="cap-item"><strong>分束器</strong>是一块半透半反的镜片：光子有一半机会直接穿过，一半机会被反射。</span><span class="cap-item">两面<strong>反射镜</strong>把上、下两条路径引到分束器 2 汇合。</span><span class="cap-item">上方路径上有一块<strong>相位片</strong>，可以调节这条路径的相位，但不会挡住光子。</span><span class="cap-item">最后，两个<strong>探测器</strong>记录光子从哪个出口出来。</span>'},
 {...R.ask('先做个预测：如果光子在分束器 1 只是“随机选了一条路”，走上方或下方各一半，那么两个探测器各会收到多少光子？',
  ['几乎全部到达探测器 0','两个探测器各收到约一半，和上方路径的设置无关','取决于光子飞行的速度'],1,
  '如果光子真的只是随机选路，每条路通向两个探测器的机会都一样，结果应该总是各一半。下面用实验检验这个预测。'),leadArt:'mziSetup'},
 {t:'play',c:'mzi',task:'拖动滑条改变上方路径的相位，看看两个探测器的概率怎样变化。和你的预测一样吗？',
  intro:['这就是马赫-曾德尔干涉仪：光子经过分束器 1 后，可能走上方或下方路径；上方路径有一块可调的相位片；两条路在分束器 2 汇合，再由两个探测器接收。'],
  gh:'把相位调到 180° 附近，看看光子去了哪里。',ok:st=>st.seen.includes('dark'),pm:'相位 0° 时光子全部到达探测器 0，180° 时全部到达探测器 1：只改变相位，就能决定光子去哪里。'},
 R.say(
  '结果和“随机选路”的预测不同：相位为 0° 时，光子全部到达探测器 0；180° 时，全部到达探测器 1。',
  '原因在于，光子并没有只走其中一条路。它处在两条路径的叠加中，每条路径为每个探测器各贡献一份<strong>概率幅</strong>。概率都是正数，加在一起只会变大；概率幅却有正有负（更一般地说，带有相位），相加时既可能彼此增强，也可能相互抵消。'
 ),
 R.ask('相位 φ = 90° 时，光子被探测器 0 接收的概率是多少？',['0%','50%','100%'],1,
  '通向探测器 0 的两份概率幅长度都是 1/2，方向相差 90°。两个箭头首尾相接，合成箭头的长度是 √2/2，取模平方得到 1/2，也就是 50%。相位从 0° 变到 180°，概率从 100% 连续降到 0%。'),
 R.play('compare','A、B 两组只在相对相位上不同。给它们施加同一个 H 门，看看结果。',{
  c:'qubit',key:'interference-short',pair:'phase',init:'plus',sample:false,required:true,probabilityOnly:true,
  intro:['同样的事情也发生在量子线路里：分束器的作用相当于 H 门，相位片相当于给 $|1\\rangle$ 分量加上相位。','回到第二章的实验：A 组为 $|+\\rangle$，B 组为 $|-\\rangle$，相当于相位 0° 和 180°。两组直接测量看不出区别。'],
  explain:'A 全部测到 0，B 全部测到 1。直接测量时分不出来的两组，经过同一个 H 后完全分开了，和干涉仪里把相位从 0° 调到 180° 的效果一样。'
 }),
 {t:'show',art:'interferenceSums',cap:'为什么会这样？把 H 的作用拆开看：两个分量都会同时通向 0 和 1，每份概率幅是 +1/2 或 −1/2。通向同一结果的概率幅先相加，再取模平方，才得到概率。<span class="cap-item"><strong>A 组</strong>（$|+\\rangle$）：通向 0 的两份同号，相互增强；通向 1 的两份异号，相互抵消。</span><span class="cap-item"><strong>B 组</strong>（$|-\\rangle$）：恰好相反。</span>相位上的差别，就这样变成了测量概率的差别。'},
 R.ask(String.raw`$|-\rangle$ 经过 H 后，通向 0 的两份概率幅分别是 +1/2 和 −1/2。测到 0 的概率是多少？`,
  ['0%','50%','100%'],0,
  '先把概率幅相加：+1/2 − 1/2 = 0，再取模平方，得到 0%。如果像经典概率那样，把两条路径各自的概率 1/4 + 1/4 相加，就会错误地得到 50%。'),
 R.say(
  '概率幅同号时相互增强，异号时相互抵消，这种现象叫作<strong>干涉</strong>。',
  '量子算法的基本思路，就是先用一系列操作安排好各个分量的相位，再通过干涉，让错误答案的概率幅相互抵消，让正确答案的概率幅相互增强。',
  '干涉需要量子态保持相干。如果中途测量，或者噪声破坏了相位关系，增强与抵消就会失效。这也是第五章强调保护量子信息的原因之一。'
 ),
 R.ask('一个量子算法想让正确答案更容易被测到。下面哪种描述更准确？',
  ['同时检查所有候选答案，再直接读出正确的那个','先调整各分量的相位，再通过干涉增强正确答案的概率幅'],1,
  '量子计算并不是“同时试遍所有答案再读出来”：一次测量只能得到一个结果。真正起作用的是对相位的安排和随后的干涉。'),
 R.end('概率都是正数，只会越加越大；概率幅有正有负，可以增强也可以抵消。干涉把相位上的差别变成了测量概率的差别。<br>下一节用 Grover 搜索，看看干涉怎样帮助寻找答案。')
]);

/* A short Grover experience: predict, act, observe, then explain. */
R.add('C6-2',[
 R.play('grover','四个候选密码里只有一个能开锁。怎样让正确的那个更容易被测到？',{
  c:'groverLock',phase:'task',stage:0,
  before:'这是一把教学用的密码锁，候选只有 00、01、10、11 四个（真实问题的候选可能多得多）。算法手里有一条检查规则，能判断某个密码对不对，却不知道答案是哪个。为了方便你观察，这里先透露：正确密码是 10。'
 }),
 R.play('grover','先猜一猜：均匀准备后，哪个密码最容易被测到？',{
  c:'groverLock',phase:'prepare',stage:0,
  o:['四个密码的机会一样','正确密码的机会已经更大'],a:0,
  after:'每个密码都是 25%。此时直接测量，就像随机猜一个，还没有偏向正确答案。'
 }),
 R.play('grover','先用检查规则做一次标记，看看概率有没有变化。',{
  c:'groverLock',phase:'mark',stage:0,nextStage:1,action:'标记',
  before:'第二章用 Z 门给单比特的 |1⟩ 分量变号。这里把检查规则做成一组量子门：正确密码对应的分量变号，其余保持不变。',
  after:'10 对应的概率幅由正变负，但四个概率仍是 25%。和施加 Z 之后一样，只改变相位，还不会改变测量概率。',
  detail:'这组门按“密码是否通过检查”的规则改变相位，不会把密码读出来，也不是对两个量子比特直接各加一个 Z。图中的 − 号只帮助你观察。'
 }),
 R.play('grover','现在加入干涉，观察正确密码的概率。',{
  c:'groverLock',phase:'amplify',stage:1,nextStage:2,action:'放大',
  before:'放大的做法叫“关于平均值翻转”：先求出四个概率幅的平均值，再把每个概率幅以平均值为中心翻到另一侧，即 新值 = 2 × 平均值 − 原值。标记后四个概率幅是 +1/2、+1/2、−1/2、+1/2，平均值是 1/4。先算一算，再点“放大”验证。',
  after:'三个错误密码：2 × 1/4 − 1/2 = 0；正确密码 10：2 × 1/4 − (−1/2) = 1。概率是概率幅的平方，所以正确密码从 25% 升到 100%，其余降到 0。',
  detail:'被标记成负号的分量离平均值最远，翻转后变得最大；其余分量正好落在 0。这就是干涉：错误答案的概率幅相互抵消，正确答案的相互增强。100% 是四选一理想模型的结果，候选更多时每轮只增大一部分，需要重复若干轮。'
 }),
 R.play('grover','再做一轮“标记＋放大”，会发生什么？',{
  c:'groverLock',phase:'repeat',stage:2,nextStage:4,action:'再做一轮',
  o:['仍然保持 100%','概率可能下降'],a:1,
  before:'先作预测，再用同一把锁验证。',
  after:'正确密码的概率从 100% 回到 25%。Grover 需要安排好操作次数，重复更多次不一定更好。'
 }),
 R.play('grover','最后确认：Grover 怎样让正确答案更容易被测到？',{
  c:'groverLock',phase:'recap',stage:2,
  o:['提前告诉算法正确密码，再把它读出来','用检查规则做相位标记，再用干涉提高目标概率'],a:1,
  after:'检查规则 → 相位标记 → 干涉放大。合适的操作能提高找到目标的概率，但不是重复越多越好。',
  detail:'候选更多时，Grover 需要的检查次数与候选数的平方根成正比（约 0.8×√N 次，N 是候选数），而逐个检查平均需要候选数的一半。'
 }),
 R.end('Grover 用检查规则标记目标，再用干涉放大它的概率。<br>下一节认识另一种著名的量子算法：用周期分解整数的 Shor 算法。')
]);

R.add('C6-3',[
 R.say(
  '把两个质数相乘很容易，例如 3 × 5 = 15；反过来，把一个很大的整数分解成质因数却很难。数字有几百位时，已知的经典算法也需要极长的时间。现在广泛使用的 RSA 等公钥密码，正是依靠这种困难来保护信息。',
  '1994 年，Peter Shor 提出了一种量子算法：在足够大、足够可靠的量子计算机上，它可以高效地分解整数。它的关键一步，是把“分解整数”变成“寻找周期”。'
 ),
 {t:'show',art:'shorPeriod',cap:'以分解 15 为例：选一个与 15 互质（除 1 以外没有公因数）的数，比如 2，计算 2 的各次方除以 15 的余数。余数按 1、2、4、8 的顺序循环出现。'},
 R.ask('根据表格，从 x = 0 开始，余数每隔几步重复一次？',['2 步','4 步','8 步'],1,'2⁰ 除以 15 余 1，2⁴ = 16 除以 15 又余 1，之后余数继续按 1、2、4、8 重复。所以周期 r = 4。'),
 R.say(
  '找到周期后，剩下的工作用经典计算就能快速完成。周期 r = 4 是偶数，先算 $2^{r/2}=2^2=4$，再分别求 4 − 1 = 3 和 4 + 1 = 5 与 15 的最大公因数：',
  String.raw`$$\gcd(3,15)=3,\qquad \gcd(5,15)=5.$$`,
  '于是得到 15 = 3 × 5。对其他整数，这个步骤偶尔会失败，换一个底数重试即可。'
 ),
 R.ask('Shor 算法中，哪一步真正需要量子计算机？',['求最大公因数','找出余数序列的周期','把两个因数相乘，检验结果'],1,'求最大公因数和检验乘积，经典计算都很快。困难在于：整数很大时，周期可能非常长，逐个计算余数去找周期，和穷举一样慢。量子计算机把许多指数放进叠加态，再用量子傅里叶变换（一种通过干涉提取周期的量子操作），让与周期有关的结果增强，从而高效地得到周期信息。'),
 {t:'show',art:'algorithmOverview',cap:'除了 Grover 和 Shor，量子算法还在模拟分子与材料、优化等方向上发展。不同算法针对的任务不同，能带来的提升也不同。'},
 R.ask('“Shor 算法已经让今天的银行加密失效了。”这句话应怎样判断？',
  ['准确，算法已经提出，加密就失效了','不准确，分解实用规模的密钥需要大规模的容错量子计算机，目前还做不到'],1,
  '今天的量子计算机，规模和错误率都还远远不够。分解 RSA 这样的实用密钥，需要大量逻辑比特，以及第五章介绍的容错量子计算。不过这种潜在风险是真实的，人们已经在开发和部署能抵抗量子攻击的新密码方法。'),
 R.end('Shor 算法把分解整数变成寻找周期，再用干涉高效地找出周期。Grover 和 Shor 都说明：量子算法的能力来自对概率幅的精心安排，而不是同时试遍所有答案。<br>下一章用 FatQat 把量子操作写成程序。')
]);
;
/* js/lessons/required-7.js */
/* Chapter 7: a FatQat introduction followed by career exploration. */
R.add('C7-1',[
 {...R.say('<strong>FatQat</strong> 是量立方社区的开源量子编程框架，基于 Python。它的思路是“量子程序只写一次”：门、测量和参数都写进同一个 Program，再交给不同的后端运行。可以只看算法的行为，也可以加入真实设备的门集与连接限制，甚至模拟脉冲层面的物理过程。','这一节先用最基本的模拟器做一个小实验：准备 |0⟩ → 施加 H 门 → 测量，重复 100 次并统计结果。我们分四步写，每一步只看一小段代码。')},
 R.lab('准备比特：从 |0⟩ 开始。',{labKey:'code',codeStage:'prepare',seed:[],measured:false,shots:100,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('添加量子门：给第 0 个比特施加 H 门。',{labKey:'code',codeStage:'gates',seed:['H'],measured:false,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('添加测量：把测量结果保存到经典位。',{labKey:'code',codeStage:'measure',seed:['H'],measured:true,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('执行采样，并读取计数。',{labKey:'code',codeStage:'execute',seed:['H'],measured:true,shots:100,explain:true,showCode:true,codeFirst:true,ok:m=>!!m.result,gh:'采样一次，观察 0 和 1 分别出现了多少次。'}),
 R.ask('如果输出中有「\'0\': 49」，它表示什么？',['概率幅是 49','测到 0 共 49 次','第 49 个量子比特'],1,'键是测量结果，值是次数。它不等于量子态的概率幅。'),
 R.lab('这次不用 H，改用 X：计数会怎样变化？先在心里预测，再加入一个 X 门并采样，留意代码同步改变。',{labKey:'code',seed:[],measured:true,shots:100,edit:true,gates:['H','X'],showCode:true,codeFirst:true,explain:true,ok:m=>m.seq.join(',')==='X'&&!!m.result,gh:'加入一个 X 门，再采样。'}),
 R.say('本节的计数来自网页内的模拟，网页并不运行上面展示的 FatQat Python 代码。有限次采样不一定恰好符合理论比例；真实设备还涉及实际的准备、控制与读出，增加采样次数不会自动消除设备误差。','想继续使用 FatQat，可以复制实验代码，在安装了 FatQat 的 Python 环境中运行。<a class="career-doc-link" href="https://fatqat.readthedocs.io/en/latest/guide/quickstart/" target="_blank" rel="noopener noreferrer">继续使用 FatQat：快速入门（新窗口）</a>'),
 R.end('你已经了解怎样用代码描述一个量子实验。让这样的程序在真实设备上运行，还需要哪些人的工作？')
]);
R.add('C7-2',[
 {t:'show',art:'careerFlow',cap:'这些工作相互合作，同一个人也可能跨越多个方向。'},
 {t:'show',art:'careerDirections',cap:'点击方向查看具体工作与相关基础。这是探索入口，不是固定的专业或岗位边界。'},
 {t:'show',art:'careerNext',cap:'兴趣选择没有对错，随时可以切换。后续任务不影响本课完成。'},
 R.end('这门课提供了一张入门地图。带着一个感兴趣的问题继续学习，在具体的小项目中逐步积累能力，也逐步了解自己喜欢怎样的工作。')
]);
;
/* js/lessons/en/required-1.js */
/* English pages for chapter 1; must mirror js/lessons/required-1.js page for page. */
R.en('C1-1',[
 R.ask('Picture a row of light switches, each one either on or off. Every time you add another switch, what happens to the number of possible on/off combinations?',['It goes up by 2','It doubles','It stays the same'],1,'It doubles. The new switch can be on or off, and each of those two choices can pair with every combination you already had. So 1 switch gives 2 combinations, 2 switches give 4, 3 give 8, and so on.'),
 {t:'play',c:'c2',unit:'Switches',max:300,task:'Drag the slider to add switches and watch the number of combinations climb.',ok:st=>st.n>=250,note:'Each extra switch doubles the count. So a computer that checks twice as fast only buys you one more switch in the same amount of time.'},
 R.say('Checking every combination takes longer and longer as switches pile up. With a few switches, the computer is merely slow; with enough of them, it will never finish.','Luckily, many problems have structure you can take advantage of, so you can find the answer with far less work instead of trying everything.','Quantum computing asks a focused question: can quantum effects give us faster ways to solve certain specific problems?'),
 R.ask('A problem has an enormous number of candidate answers. Does that guarantee a quantum computer can solve it faster?',['Yes. The more candidates, the bigger the quantum advantage','No. It also depends on whether the problem has structure to exploit'],1,'Lots of candidates only tells you that trying them all could be expensive. It doesn\'t mean a quantum computer will be faster. We know of quantum speedups only for certain kinds of problems, and many problems with huge numbers of candidates may have no quantum speedup at all.'),
 R.end('Add enough switches and checking every combination becomes impossible to finish. Quantum computing isn\'t faster at everything; we know of speedups only for certain specific problems.<br>Next, let\'s look at where quantum computing might help, and where its limits are.')
]);
R.en('C1-2',[
 {t:'ask',multi:true,q:'Which of these are being researched as possible uses for quantum computing? (Select all that apply)',
  o:['Simulating how molecules form bonds','Making everyday word processing and web browsing faster','Finding better solutions to certain optimization problems'],a:[0,2],
  f:'Research focuses mainly on simulating molecules and materials, which are quantum by nature, and on certain specific optimization problems. Ordinary computers and networks already handle word processing and web browsing well; that isn\'t what quantum computing is for.'},
 R.say('Now that you know some possible uses, let\'s practice spotting hype. Here are two made-up headlines. Decide whether each one holds up.'),
 {t:'ask',q:'"Company builds 1,000 qubits, more computing power than all the world\'s supercomputers combined." What do you make of this headline?',
  o:['Accurate','Exaggerated','Completely wrong'],a:1,
  f:'Even if the company really has 1,000 qubits, the qubit count alone doesn\'t tell you how powerful the machine is. You\'d also need to know what it actually computed, whether the result is reliable, which classical method it was compared against, and how much time and resources each side used. The headline skips all of that, so it\'s exaggerated.'},
 {t:'ask',q:'"Quantum computers will soon break all of today\'s banking encryption." What do you make of this headline?',
  o:['Accurate','Exaggerated','Completely wrong'],a:1,
  f:'A quantum computer that is powerful enough and runs reliably could break some of the public-key cryptography protecting today\'s communications and transactions. That risk is real. But it doesn\'t mean it will happen soon, or that every kind of encryption will fail. Cryptography designed to resist known quantum attacks is already being developed and deployed.'},
 {t:'end',line:'Whether quantum computing helps depends on the task, the quality of the result, and what it costs to compute. Next time you see a "quantum breakthrough" in the news, run through these checks:',steps:[
  'Go to the source: what does the original paper or technical report actually say?',
  'Pin down the task: what exactly was computed, and what counts as success?',
  'Look at the comparison: which classical method was it up against, and how did running time and result quality compare?',
  'Check the scope: is this a possibility still under research, or a verified result? Is an advantage on one task being sold as "faster at everything"?'
 ]}
]);
R.en('C1-3',[
 {t:'show',art:'timeline',cap:'Judging the news takes a little history. Follow the timeline and you\'ll see researchers\' main question shift from "Can we compute this way at all?" to "How do we compute reliably?"'},
 {t:'ask',q:'Where does quantum computing stand today?',
  o:['It\'s still just a theoretical idea, with no working experimental devices','Experimental devices exist and have produced results on specific tasks; work continues toward more reliable, practical computing','It already reliably beats classical computers on most real-world tasks'],a:1,
  f:'Quantum computers have already shown what they can do on some specific tasks. To take on more real-world problems, scientists and engineers are building larger devices, making them more reliable, and exploring algorithms and applications.'},
 R.end('From the early idea of simulating nature to algorithms, processors, and error correction, quantum computing has moved forward on many fronts at once.<br>In the next chapter, we meet the basic unit that does the computing: the qubit.')
]);
;
/* js/lessons/en/required-2.js */
/* English pages for chapter 2; must mirror js/lessons/required-2.js page for page. */
R.en('C2-1',[
 R.say(
  String.raw`A classical bit is like a switch: it's either 0 or 1. A qubit is a physical system we can control and measure, such as an atom with two distinct internal states. We write those two states as $|0\rangle$ and $|1\rangle$ and call them the "zero state" and the "one state".`,
  String.raw`To find out a qubit's state, you have to measure it. Every measurement in this course is a computational-basis measurement (also called a $Z$-basis measurement), which reads the qubit as either 0 or 1. Ideally, measuring $|0\rangle$ always gives 0, and measuring $|1\rangle$ always gives 1.`,
  String.raw`$$|0\rangle\xrightarrow{\text{measure}}0\qquad |1\rangle\xrightarrow{\text{measure}}1$$`
 ),
 R.play('sphere','Drag the arrow close to the equator and watch the probabilities of measuring 0 and 1.',{
  intro:[
   String.raw`A qubit can also be in a superposition. Picture a sphere with an arrow starting at its center. Pointing to the north pole means $|0\rangle$, pointing to the south pole means $|1\rangle$, and pointing anywhere else on the surface means a superposition.`,
   String.raw`This is the Bloch sphere. <strong>Ideally, every point on its surface stands for exactly one qubit state</strong>.`
  ],
  c:'c5',gates:[],ok:st=>st.dragged&&Math.abs(st.b[2])<0.08
 }),
 R.ask('The arrow points to a spot on the equator. If you make one computational-basis measurement, what do you get?',
  ['0 or 1, each with 50% probability','0.5','0 and 1 at the same time'],0,
  'A single measurement gives exactly one outcome. "50% each" tells you how likely each outcome is. It doesn\'t mean you read out one half, or get 0 and 1 together.'),
 R.end('A quantum state can vary continuously, but a computational-basis measurement only ever gives 0 or 1.<br>Next, we\'ll write quantum states as formulas and use them to calculate the probabilities of measuring 0 and 1.')
]);
R.en('C2-2',[
 R.say(
  String.raw`In the last lesson, a quantum state was an arrow on a sphere. You can also write it as a formula: $$|\psi\rangle=a|0\rangle+b|1\rangle.$$Here $|\psi\rangle$ (pronounced "psi") stands for any single-qubit state. The numbers $a$ and $b$ are called <strong>probability amplitudes</strong>, or just amplitudes.`,
  'An amplitude is not a probability. A probability is a number from 0 to 1 that tells you how likely an outcome is; to turn an amplitude into a probability, you square it. An amplitude of 1/2, for example, gives a probability of 1/4, or 25%. Amplitudes can be negative, but probabilities never are.'
 ),
 R.say(
  String.raw`When you measure in the computational basis, the probabilities of getting 0 and 1 are $$P(0)=|a|^2,\qquad P(1)=|b|^2.$$The vertical bars mean "take the magnitude," that is, the size of the amplitude. Every example in this lesson uses real numbers, so the magnitude is just the absolute value. In general, amplitudes can be complex numbers, but the rule is the same: take the magnitude and square it. The two probabilities always add up to 1.`
 ),
 R.ask(String.raw`A qubit is in the state $$|\psi\rangle=\frac12|0\rangle+\frac{\sqrt3}{2}|1\rangle.$$What is the probability of measuring 0?`,
  ['50%','25%','75%'],1,
  String.raw`The amplitude of $|0\rangle$ is $1/2$, so $P(0)=(1/2)^2=1/4=25\%$.`),
 R.ask(String.raw`Now the qubit is in the state $$|\psi\rangle=\frac35|0\rangle+\frac45|1\rangle.$$What are the probabilities of measuring 0 and 1?`,
  ['36% and 64%','60% and 80%','50% and 50%'],0,
  String.raw`Square each amplitude: $P(0)=(3/5)^2=9/25=36\%$ and $P(1)=(4/5)^2=16/25=64\%$. As a check, $36\%+64\%=100\%$.`),
 R.ask(String.raw`This time one amplitude is negative: $$|\psi\rangle=\frac{1}{\sqrt2}|0\rangle-\frac{1}{\sqrt2}|1\rangle.$$What is the probability of measuring 1?`,
  ['−50%','100%','50%'],2,
  String.raw`$P(1)=|-1/\sqrt2|^2=1/2=50\%$. A minus sign can never make a probability negative, and the probability of measuring 0 is 50% too. So what does the minus sign actually do? That's the subject of this chapter's last lesson.`),
 R.ask('Prepare a qubit in a superposition on the equator and measure it once. You get 1. Now, without doing anything else, measure it again the same way right away (assume an ideal measurement, with nothing disturbing the qubit in between).<br><br>What does the second measurement give?',
  ['1 again, for certain','0 or 1, still 50% each'],0,
  String.raw`Once the first measurement gives 1, the state is $|1\rangle$. With nothing else acting on it, the same ideal computational-basis measurement is certain to give 1 again.`),
 R.say(
  'Measuring a qubit doesn\'t just give you an outcome; it also changes the qubit\'s state. This is called <strong>the collapse of the quantum state</strong>.',
  String.raw`Think of the arrow on the sphere. It pictures the state, not where the atom is in space. Before the measurement, it can point anywhere, say at the equator. After one computational-basis measurement, it snaps to one of the two poles: to $|0\rangle$ at the north pole if you got 0, or to $|1\rangle$ at the south pole if you got 1.`,
  'That explains the last question: if you measure again right away, the result comes from the new state. Get 1 the first time, and you\'ll get 1 again.'
 ),
 R.ask('Let\'s try something different. After the first measurement gives 1, reset the qubit to the same superposition on the equator, then measure again.<br><br>Are you certain to get 1 this time?',
  ['Yes, 1 again','No, it could be 0 or 1, 50% each'],1,
  'The reset puts the qubit back in the original superposition, so each outcome has a 50% chance again. The first outcome has no say in this one.'),
 R.end('The quantum state sets the measurement probabilities, and the outcome sets the state afterward. Measure again without changing anything and you\'re certain to get the same result; prepare the state again and the probabilities come from that fresh state.<br>In the next lesson, we\'ll use quantum gates to change states on purpose.')
]);
R.en('C2-3',[
 R.say('A single-qubit gate acts on one qubit and changes its state. This lesson covers four common ones: X, Y, Z, and H. X, Y, and Z are known as the Pauli gates; H is the Hadamard gate.',
  String.raw`On the Bloch sphere, X, Y, and Z each turn the arrow half a turn (an angle of $\pi$) around the $x$, $y$, and $z$ axes, respectively. H turns it half a turn around a tilted axis that lies exactly halfway between the positive $x$ and $z$ directions, $45^\circ$ from each.`),
 R.play('gates','Start from the zero state and press X twice. Watch where the arrow points after each press.',
  {c:'qubit',key:'xzero',init:'zero',gates:['X'],axis:'X',showFormula:true,showMeasurement:false,required:true,minGates:2,explain:'X swaps the zero state and the one state, so applying it twice brings you back where you started.'}),
 R.ask('X just flipped the arrow between the north and south poles. Now start instead from the superposition on the equator that points along +x. This is called the plus state, written $|+\\rangle$.<br><br>Where does the arrow point after one X?',
  ['Still along +x','Along −x','To the south pole'],0,'The +x direction is the X gate\'s rotation axis, and an arrow lying along the axis it\'s turned around doesn\'t move. So the same X gate can have different effects depending on the starting state.'),
 R.play('gates','Start from $|+\\rangle$, press Y once, and watch how the arrow turns.',
  {intro:['The Y gate turns the arrow half a turn around the y axis. Like X, it swaps the north and south poles. This time, start from $|+\\rangle$ and compare with what X did.'],c:'qubit',key:'yplus',init:'plus',gates:['Y'],axis:'Y',showFormula:true,showMeasurement:false,required:true,explain:'After Y, $|+\\rangle$ points along −x on the equator. This state is called the minus state, written $|-\\rangle$.'}),
 R.ask('From the same $|+\\rangle$, X leaves the arrow where it is, but Y turns it to −x.<br><br>Why do the two gates behave differently?',
  ['They turn by different angles: Y turns half a turn more than X','They turn around different axes: the arrow lies on X\'s axis, but not on Y\'s'],1,'X and Y both turn the arrow half a turn; what differs is the axis. An arrow along the x axis stays put when turned around the x axis, but ends up along −x after half a turn around the y axis.'),
 R.play('gates','Start from $|+\\rangle$, press Z once, and watch the arrow swing around the equator.',
  {intro:['The Z gate turns the arrow half a turn around the z axis, which runs through the north and south poles. The $|+\\rangle$ arrow is at right angles to it.'],c:'qubit',key:'zplus',init:'plus',gates:['Z'],axis:'Z',showFormula:true,showMeasurement:false,required:true,explain:'Z turns $|+\\rangle$ into $|-\\rangle$. From this starting state it lands in the same place as Y, but by turning around a different axis.'}),
 R.ask('Z just reversed the arrow on the equator. But if you start from the zero state at the north pole, the arrow lies along the z axis.<br><br>What does one Z do to it?',
  ['It moves to the south pole','It stays where it is'],1,'An arrow at the north pole lies along the Z gate\'s rotation axis, so turning around that axis leaves it unchanged. The same goes for the south pole. Z changes the direction of $|+\\rangle$, but not of the two poles.'),
 R.play('gates','Start from the zero state and press H twice. After each press, check whether the arrow is at a pole or on the equator.',
  {intro:['The H gate turns the arrow half a turn around the tilted axis halfway between the positive x and z directions.'],c:'qubit',key:'hzero',init:'zero',gates:['H'],axis:'H',showFormula:true,showMeasurement:false,required:true,minGates:2,explain:'The first H takes the zero state to $|+\\rangle$; the second takes $|+\\rangle$ back to the zero state.'}),
 R.ask('Based on what happened with two H gates in a row, does H turn every input into a superposition?',
  ['Yes, H always outputs a superposition','No, the output depends on the input'],1,'H turns the zero state into $|+\\rangle$, but it also turns $|+\\rangle$ back into the zero state. So don\'t think of H as a gate that always creates a superposition.'),
 R.say('Place gates along a line in the order they happen and you have a single-qubit circuit. The line is the qubit, each box is a gate, and time runs from left to right.',
  'Now mix and match all four gates and watch the state change step by step. "Undo" steps back once; "Reset" returns to the starting state of this experiment.'),
 R.play('gates','Build a circuit from any mix of X, Y, Z, and H, follow the state on the sphere, then try Undo and Reset.',
  {c:'qubit',key:'circuit',init:'zero',gates:['X','Y','Z','H'],axis:'H',showFormula:true,showMeasurement:false,required:true}),
 R.end('You\'ve now met the Pauli gates X, Y, Z and the Hadamard gate H. Each gate follows a fixed rule, but what you get also depends on the state you start with.<br>Next, we take a closer look at $|+\\rangle$ and $|-\\rangle$: they have the same measurement probabilities, so why does the same gate give different results on them?')
]);
R.en('C2-4',[
 R.say(
  String.raw`Two states can share the same measurement probabilities and still have different amplitudes. Take these two: $$|+\rangle=\frac{|0\rangle+|1\rangle}{\sqrt2},\qquad |-\rangle=\frac{|0\rangle-|1\rangle}{\sqrt2}. $$Measure either one directly (a computational-basis measurement with no gates beforehand) and you get 0 or 1, each with 50% probability.`,
  String.raw`What differs is the sign. The two amplitudes of $|+\rangle$ have the same sign; those of $|-\rangle$ have opposite signs. This difference between the two parts is called the <strong>relative phase</strong>. (With complex amplitudes, the relative phase can be any angle; plus and minus are just the simplest cases.) On the Bloch sphere, the relative phase is how far the arrow is turned around the z axis, which is why $|+\rangle$ and $|-\rangle$ sit on opposite sides of the equator.`
 ),
 R.say(
  String.raw`You can write the same quantum state in two ways. One uses amplitudes: $$|\psi\rangle=a|0\rangle+b|1\rangle$$The other uses the two angles of the arrow on the Bloch sphere: $$|\psi\rangle=\cos\frac{\theta}{2}|0\rangle+e^{i\phi}\sin\frac{\theta}{2}|1\rangle$$`,
  String.raw`θ is how far the arrow tilts away from the north pole, and it sets the measurement probabilities: $P(0)=\cos^2(\theta/2)$ and $P(1)=\sin^2(\theta/2)$.`,
  String.raw`φ is how far the arrow is turned around the z axis, and it is the relative phase. $e^{i\phi}$ has magnitude 1, so it changes the phase but not the size of the amplitude ($i$ is the imaginary unit, $i^2=-1$).`
 ),
 R.play("formula","Switch between states and watch how θ and φ change.",{"key":"angles","showMeasurement":false,"init":"plus","presets":["zero","one","plus","minus","yplus"],"mathDetails":true,"formulaNotes":false,"c":"qubit","explain":"States with the same θ have the same direct-measurement probabilities; a different φ means a different relative phase."}),
 R.ask(String.raw`Can you tell $|+\rangle$ and $|-\rangle$ apart using only their direct-measurement probabilities?`,['Yes','No'],1,'Once you take the magnitudes and square them, both states give 50/50, even though they are different quantum states.'),
 R.play('gates',String.raw`Apply Z once to $|+\rangle$ and watch the formula, the arrow, and the measurement probabilities.`,{key:'zphase',sample:false,init:'plus',gates:['Z'],axis:'Z',showFormula:true,required:true,c:'qubit',explain:String.raw`Z changes only the relative phase, turning $|+\rangle$ into $|-\rangle$. The direct-measurement probabilities stay at 50/50.`}),
 R.ask(String.raw`Suppose you apply an H gate to $|+\rangle$, and separately to $|-\rangle$, and then measure each in the computational basis. What happens?`,
  ['Both still give 0 or 1 with 50% each','$|+\\rangle$ always gives 0, and $|-\\rangle$ always gives 1','$|+\\rangle$ always gives 1, and $|-\\rangle$ always gives 0'],1,
  String.raw`H turns $|+\rangle$ into $|0\rangle$ and $|-\rangle$ into $|1\rangle$, so a computational-basis measurement afterward tells the two apart with certainty. Try it yourself on the next page.`),
 R.play('compare','Apply H to $|+\\rangle$ and $|-\\rangle$ side by side, and compare the states and measurement probabilities before and after.',
  {c:'qubit',key:'phase-after-h',pair:'phase',sample:false,required:true,explain:'H turns $|+\\rangle$ into the zero state and $|-\\rangle$ into the one state, so measuring afterward gives 0 and 1 with certainty.'}),
 R.ask(String.raw`$|+\rangle$ and $|-\rangle$ have the same direct-measurement probabilities, yet the same H sends them to completely different outcomes. What does this tell you?`,
  ['H gives different results at random','Relative phase doesn\'t affect direct-measurement probabilities, but it does affect what later operations produce'],1,'H acts in a fixed, predictable way. The two states differ only in relative phase. Direct measurement can\'t see that difference, but H turns it into a difference in measurement probabilities. In Chapter 6, you\'ll meet this effect under the name interference.'),
 R.end('The squared magnitudes of the amplitudes set the direct-measurement probabilities. Relative phase leaves those probabilities alone, but it does change what later operations produce.<br>In the next chapter, we go from one qubit to two.')
]);
;
/* js/lessons/en/required-3.js */
/* English pages for chapter 3; must mirror js/lessons/required-3.js page for page. */
R.en('C3-1',[
 {...R.ask('Starting with this chapter, we work with two qubits at once: q0 and q1. Measuring both gives a pair of outcomes.<span class="joint-readout"><span><small>q0</small><strong>0</strong></span><span><small>q1</small><strong>1</strong></span></span>If we write q0 first and q1 second, how do we record this outcome?',['00','01','10','11'],1,'q0 goes first and q1 second. q0 gave 0 and q1 gave 1, so we write 01.')},
 R.ask('<span class="q-lead">Next, we prepare two qubits in two different ways. We repeat each way 100 times, measuring both qubits together every time:</span><span class="cap-item"><strong>Group A</strong>: q0 and q1 are each set to 0 or 1 at random, independently, with even odds.</span><span class="cap-item"><strong>Group B</strong>: each round, we first pick 00 or 11 at random (even odds), then set both bits to match.</span><span class="cap-item">In both groups, each bit on its own comes out 0 half the time and 1 half the time.</span><br>Which group can give an outcome like 01, where the two bits disagree?',['Only Group A','Only Group B','Both groups'],0,'In Group A each bit is random on its own, so 01 and 10 can both show up. In Group B the two bits are always chosen together, so you only ever see 00 or 11. The next page puts this to the test.'),
 R.play('both','Run both experiments and compare what the two bits give together.',{c:'jointLesson'}),
 R.ask('Bit by bit, the two groups have exactly the same probabilities, yet taken together their outcomes differ. What does this tell you?',['Each bit\'s own probabilities are enough to predict the outcomes of both bits together','To describe two bits, you also need to know which outcomes go together'],1,'Each bit\'s own probabilities only describe what you see when you look at the bits one at a time. Two bits can also be correlated: in Group B they always match, while Group A has no such link.'),
 R.end('Looked at one at a time, each bit can be 0 or 1; looked at together, you also need to know which outcomes go together.<br>Group B\'s correlation comes from a classical random choice: each round, 00 or 11 is picked at random before the bits are prepared. Later in this chapter, you\'ll meet a correlation with a different source: entanglement.<br>Next, meet the CNOT gate, which acts on two qubits at once.')
]);
R.en('C3-2',[
 {...R.say('CNOT is a controlled-flip gate. If the control qubit is 1, it flips the target qubit; if the control is 0, it leaves the target alone. Here q0 is the control and q1 is the target.','In the circuit diagram, a solid dot marks the control and a circled plus marks the target. The control itself never changes.'),illustration:{src:'assets/illustrations/cnot-circuit.svg',alt:'CNOT circuit: the solid dot on q0 (top) is the control, and the circled plus on q1 (bottom) is the target.',width:640,height:250,wide:true}},
 R.ask(String.raw`Start from $|10\rangle$ (q0 is 1, q1 is 0) and apply one CNOT. What do you get?`,['00','10','11'],2,'q0 is 1, so q1 flips from 0 to 1. The result is 11.'),
 R.play('cnot','Try each of the four inputs, apply CNOT twice in a row, and compare what goes in with what comes out.',{c:'entanglement',key:'cnot'}),
 R.ask('After two CNOTs in a row, what state are the two bits in?',['The target has been flipped twice, so it must end up as 1','They\'re back to the original input'],1,'If the control is 1, the target flips twice and ends up where it started; if the control is 0, the target never changes. Either way, two CNOTs in a row undo each other.'),
 R.end('When the control qubit is 0, CNOT leaves the target alone; when the control is 1, CNOT flips the target.<br>Next, we combine H and CNOT to prepare an entangled state.')
]);
R.en('C3-3',[
 R.say('If the state of two qubits can\'t be broken into "a state for q0" and "a state for q1", and can only be described as a whole, we say the qubits are <strong>entangled</strong>.','The best-known entangled states are the four Bell states. In this lesson, we prepare this one:',String.raw`$$\frac{|00\rangle+|11\rangle}{\sqrt2}.$$`, 'It\'s an equal, in-phase superposition of 00 and 11: the two amplitudes have the same size and the same sign. Measure both qubits directly and you only ever get 00 or 11, each with probability one half.'),
 R.play('bell-build','Start from |00⟩ and pick the gates yourself. Watch how the joint state changes, and try to reach the Bell state from the previous page.',{c:'entanglement',key:'bell-build'}),
 R.say('H followed by CNOT produces the Bell state we were after. Under direct measurement, each bit on its own is random, yet the two bits always agree. Over many rounds of preparing and measuring, the counts usually come out close to 50/50, though not necessarily exactly even.'),
 R.say('This looks a lot like Group B from the first lesson, which also gives only 00 and 11, half the time each. The difference is where the correlation comes from. In Group B, 00 or 11 is picked at random each round, so the bits already have definite values before measurement; we just don\'t know them yet. In the Bell state, whether you\'ll get 00 or 11 isn\'t settled before measurement: both terms are present at once, with a definite relative phase between them.','Direct measurement alone gives identical statistics for the two. But apply an H to each bit before measuring, and Group B gives 00, 01, 10, and 11 at 25% each, while the Bell state still gives only 00 and 11. It\'s the same effect you saw in Chapter 2: relative phase is invisible to direct measurement and only shows up after later operations.'),
 R.end('An ideal H → CNOT turns |00⟩ into a Bell state. Its correlation comes from entanglement, not from a classical random choice made before measurement.<br>Before we use entanglement to send a quantum state, let\'s look at a limit: can you copy an unknown quantum state?')
]);
R.en('C3-4',[
 R.say('Classical information is easy to copy: you can duplicate a file as many times as you like. So could we build a "quantum copier"?','Picture a machine that takes an unknown state $|\\psi\\rangle$ plus a blank qubit $|0\\rangle$, and hands back two copies of $|\\psi\\rangle$.'),
 R.ask('A CNOT with q0 as the control copies $|0\\rangle$ into $|00\\rangle$ and $|1\\rangle$ into $|11\\rangle$.<br><br>If q0 is $|+\\rangle$ instead, does the same CNOT give you two copies of $|+\\rangle$?',
  ['Yes, two copies of $|+\\rangle$','No, it gives the Bell state from the previous lesson'],1,
  String.raw`This is exactly the H → CNOT from the previous lesson, so the result is the Bell state $(|00\rangle+|11\rangle)/\sqrt2$, which only ever gives 00 or 11. Two copies of $|+\rangle$ would be $(|00\rangle+|01\rangle+|10\rangle+|11\rangle)/2$, with all four outcomes at 25% each. CNOT can copy 0 and 1, but not superpositions of them.`),
 R.say('The problem isn\'t CNOT. Any quantum operation acts on a superposition by acting on $|0\\rangle$ and $|1\\rangle$ and combining the results with the same amplitudes. So a machine that copies $|0\\rangle$ and $|1\\rangle$ can only turn a superposition into an entangled state, never into two copies.','In fact, it can be proved that no machine can perfectly copy an arbitrary unknown quantum state. This is the <strong>no-cloning theorem</strong>.','Measuring the state and then preparing a new one from the result doesn\'t work either. A single measurement gives only 0 or 1 and collapses the state, so you can\'t learn the full amplitudes.'),
 R.ask('Which statement about the no-cloning theorem is correct?',
  ['No quantum state can ever be prepared twice','With a careful enough measurement, you can read out an unknown state and then copy it','A known state (such as $|0\\rangle$) can be prepared over and over; what can\'t be perfectly copied is an arbitrary unknown quantum state'],2,
  'If you know what the state is, you can just prepare another one the same way. What the no-cloning theorem rules out is making a perfect copy when all you have is a single unknown state.'),
 R.end('An unknown quantum state can\'t be perfectly copied, and one measurement can\'t read it out.<br>So how can Alice hand an unknown quantum state to Bob? The next lesson\'s answer: quantum teleportation.')
]);
R.en('C3-5',[
 R.play('resources','How can Alice pass an unknown quantum state she holds to Bob?',{c:'teleportLesson'}),
 {...R.ask('Alice holds a qubit Q in an unknown state, plus qubit A from an entangled pair. Bob holds the pair\'s other qubit, B. What should Alice do next?',[
  'Measure Q directly, tell Bob the result, and have him prepare the original state from it.',
  'Apply operations to Q and A together, measure both, and send Bob the results.',
  'Nothing: Bob\'s B has already turned into Q\'s state on its own.'
 ],1,'As the last lesson showed, measuring an unknown state directly doesn\'t give you enough information to rebuild it, and shared entanglement alone doesn\'t complete the transfer.<br><br>Alice first applies specific operations to Q and A: <strong>a CNOT with Q as the control and A as the target, then an H on Q</strong>. Then she measures both qubits. Those results tell Bob how to correct B to recover the original quantum state.'),feedbackCircuit:'teleport-prepare'},
 R.play('derive','Starting from the input state, write out the full state after CNOT and H.',{c:'teleportLesson'}),
 {...R.ask('Alice measures <strong>a=0, b=1</strong>, so Q and A read 01. Before Bob applies any correction, what is B\'s normalized state?',[
  String.raw`$\alpha|0\rangle+\beta|1\rangle$`,
  String.raw`$\alpha|1\rangle+\beta|0\rangle$`,
  String.raw`$\alpha|0\rangle-\beta|1\rangle$`,
  String.raw`$\alpha|1\rangle-\beta|0\rangle$`
 ],1,String.raw`A result of 01 means we keep only the two terms of the full expansion where Q and A are 01:<div class="teleport-algebra">$$\frac{\alpha}{2}|011\rangle+\frac{\beta}{2}|010\rangle.$$</div>Pulling out the common factor $|01\rangle_{QA}$ gives:<div class="teleport-algebra">$$\frac12|01\rangle_{QA}(\alpha|1\rangle+\beta|0\rangle)_B.$$</div>This branch has probability ¼. Keep it and normalize, and B is in the state $\alpha|1\rangle+\beta|0\rangle$. The same method fills in the table below. Each entry is B's normalized state after the measurement, before Bob's correction.
 <table class="protocol-table teleport-state-table"><thead><tr><th scope="col">Result ab</th><th scope="col">State of B (before correction)</th></tr></thead><tbody>
 <tr><th scope="row">00</th><td>$\alpha|0\rangle+\beta|1\rangle$</td></tr>
 <tr><th scope="row">01</th><td>$\alpha|1\rangle+\beta|0\rangle$</td></tr>
 <tr><th scope="row">10</th><td>$\alpha|0\rangle-\beta|1\rangle$</td></tr>
 <tr><th scope="row">11</th><td>$\alpha|1\rangle-\beta|0\rangle$</td></tr>
 </tbody></table>`),key:'teleport-state'},
 R.play('transfer','Send Alice\'s measurement results to Bob to finish this round of teleportation.',{c:'teleportLesson'}),
 R.ask('In another round of teleportation, Bob receives <strong>a=1, b=0</strong>. How should he correct B?',
  ['Do nothing','X only','Z only','X, then Z'],2,
  String.raw`In this round, B is in the state $\alpha|0\rangle-\beta|1\rangle$, and a single Z restores $\alpha|0\rangle+\beta|1\rangle$. The general rule: check b first, and if b=1, apply X; then check a, and if a=1, apply Z. Skip any gate whose result is 0.
  <table class="protocol-table teleport-corrections"><caption>Measurement results and Bob's correction</caption><thead><tr><th scope="col">Result ab</th><th scope="col">Correction</th></tr></thead><tbody><tr><th scope="row">00</th><td>Do nothing</td></tr><tr><th scope="row">01</th><td>X only</td></tr><tr><th scope="row">10</th><td>Z only</td></tr><tr><th scope="row">11</th><td>X, then Z</td></tr></tbody></table>`),
 R.ask('Which statement about this protocol is correct?',[
  'Bob recovers the original state and Alice still has it too, so they each have a copy.',
  'Bob recovers the original state and Alice no longer has it; Bob needs a classical message to know which correction to apply.',
  'Thanks to shared entanglement, Bob can skip the classical message and recover any input state directly.'
 ],1,'Alice\'s Q has been measured, so the original state no longer exists on her side. No copy is made, just as the no-cloning theorem requires. And Bob has to receive the classical message to know which correction to apply.'),
 R.end('Teleportation moves an unknown quantum state to Bob. Alice is left without the original, no copy is made, and Bob can\'t finish without the classical message.<br>In the next chapter, we look at how quantum circuits like these run on real hardware.')
]);

// Re-attach the illustrative circuits from required-3.js to the English pages (R.en replaces the page objects).
{
 const circuits={
  'C3-2':{0:'cnot',1:'cnot10',3:'cnot'},
  'C3-3':{2:'bell-measured',3:'pair-X'},
  'C3-4':{0:'candidate',1:'bell'},
 };
 for(const [id,pages] of Object.entries(circuits)){
  for(const [index,circuit] of Object.entries(pages))LESSONS[id].pages[index].circuit=circuit;
 }
}
;
/* js/lessons/en/required-4.js */
/* English pages for chapter 4; must mirror js/lessons/required-4.js page for page. */
R.en('C4-1',[
 {t:'show',art:'quantumStack',cap:'Until now, our circuits have lived in an ideal world. In this chapter you’ll meet the hardware that actually stores quantum information, and see how compilation turns a circuit into operations a real device can run.'},
 {t:'show',art:'hardwareOverview',cap:'Here are five hardware platforms, each storing quantum information in a different physical system.'},
 R.say('Whatever the physical system, running a quantum circuit asks three things of the hardware: get the qubits into their starting state, carry out quantum gates with control signals, and finally measure to read out the result. Let’s take them one at a time.'),
 {...R.ask('The circuit says to start from |0⟩, and the device elements or atoms that hold the qubits are already in the machine. Can it start applying gates right away?',['Yes — once they’re in the device, their state is set','Not yet — the qubits first have to be prepared in the starting state the circuit needs'],1,'Having the physical carriers in the machine doesn’t mean they’re in the right quantum state. Before any computing, the qubits have to be prepared in the starting state the circuit asks for.')},
 {...R.ask('The circuit has an X gate that should turn |0⟩ into |1⟩. What does the device need to do?',['Send a control signal that changes the quantum state','Read out the qubit and record an outcome'],0,'Gates change the state. A superconducting device, for example, drives the qubit with a carefully calibrated microwave signal. That’s not a measurement.')},
 {...R.ask('Two qubits start in |00⟩. Can you make a Bell state using only single-qubit gates on each one?',['Yes, as long as each qubit is put into superposition','No — you also need a two-qubit operation that can create entanglement'],1,'Single-qubit gates act on each qubit separately, so they can’t entangle two independent qubits. The hardware also has to support a suitable two-qubit operation, like the CNOT from Chapter 3.')},
 {...R.ask('In a trapped-ion device, a laser makes each ion either glow brightly or stay dark, depending on its internal state. Collecting these signals and telling them apart is part of which job?',['Preparing the starting state','Applying quantum gates','Measurement and readout'],2,'Measurement and readout produce a recorded outcome. Control signals, by contrast, are what make the state changes the circuit asks for.')},
 R.ask('To run the circuit “start from |0⟩, apply X, then measure,” what sequence does the hardware follow?',['Prepare the starting state → apply X → measure','Measure → apply X (no preparation needed)','Move the qubit’s physical carrier somewhere else → measure'],0,'Preparation, control and measurement are separate jobs. Every hardware platform has to do all three; only the physics behind them differs.'),
 R.end('Now you know what the hardware has to do.<br>Next, see how a single circuit gets adapted to the gates and connectivity a particular device supports.')
]);
R.en('C4-2',[
 R.say('A quantum circuit lists the operations to perform. Compilation rewrites it into a form the target device can run, without changing what it computes.','We’ll focus on two questions: what if the device can’t run a gate directly? And what if two qubits that need to interact aren’t connected?'),
 {t:'show',art:'compileDevices',carry:'What if the device can’t run a gate directly?',cap:'In the ideal case, both versions do exactly the same thing. CZ (controlled-Z) flips the sign of a term only when both qubits are 1 and leaves everything else alone. The H gates on either side both act on the CNOT’s target qubit.'},
 R.ask('Swapping one CNOT for H → CZ → H adds gates. Does that mean compilation failed?',['Yes — compilation should always reduce the gate count','No — together these gates do something the device can’t run directly'],1,'The first job of gate decomposition is to keep the computation the same and fit the device. More gates doesn’t mean compilation failed.'),
 R.ask('Now for connectivity. On superconducting and similar devices, each qubit is held by a device element at a fixed spot on the chip, and two-qubit gates can only run directly between neighboring elements. If the circuit needs a two-qubit gate between qubits that aren’t neighbors, what can you do?',['Ignore the connectivity limit and run the gate anyway','Use SWAP gates to exchange the states held by two elements, until the two states sit on neighboring elements','Skip that two-qubit gate'],1,'SWAP exchanges the quantum states held by two neighboring elements. After swapping, the two states that started far apart are held by neighbors and can take part in the gate. The elements themselves never move, and you can’t just drop an operation the circuit needs. Next, step through one way to do it.'),
 {t:'play',c:'hardwareCompile',mode:'fixed',task:'The circuit asks for CZ(q0, q2), then CZ(q1, q2). Step through how this runs with fixed connectivity.',ok:m=>m.finished,gh:'Go to the last step and watch the quantum states get swapped along the fixed connections.'},
 R.ask('What did the SWAP actually change?',['Where the elements sit on the chip','Which element holds which quantum state'],1,'SWAP exchanges the quantum states held by two elements; the elements stay put. Every operation after that has to keep track of the new mapping.'),
 {t:'play',c:'hardwareCompile',mode:'reconfigurable',task:'Now try a reconfigurable neutral-atom array. Here, atoms can be moved with laser “optical tweezers”: two-qubit gates happen in the entangling zone at the top, and atoms wait in the storage zone at the bottom. How does the same three-qubit circuit run here? Step through the sequence of atom moves and CZ gates.',ok:m=>m.finished,gh:'Press play or step through to the end, then continue.'},
 R.ask('Once q0 and q2 have moved into the entangling zone, has the circuit’s CZ already happened?',['Yes — being close together is the same as running the gate','No — the gate still has to be applied'],1,'Moving only changes where the atoms are and which interactions are possible. The CZ is a separate operation.'),
 R.ask('Why does this example move q0 out first, before q1 and q2 do the next CZ?',['Moving q0 is the same as measuring it','To set up positions for the next operation and limit the effect on atoms that aren’t involved','Every atom always has to return to where it started'],1,'Here q0 goes back to the storage zone, q2 stays in the entangling zone, and q1 is brought in. The compiler plans the actual order of operations, not just a translation of gate names.'),
 R.ask('A reconfigurable array can bring any two atoms together. Does that make it better than fixed-connectivity devices in every way?',['Yes — if atoms can move, there are no limits','Not necessarily — moving takes time and has to respect the device’s control constraints'],1,'Each architecture offers its own ways to implement a circuit, along with its own constraints. Being “reconfigurable” doesn’t by itself make a device better.'),
 {t:'show',art:'quantumStack',recap:true,cap:'Use the diagram to review: the circuit defines the computation; compilation works out the gates, positions and order; and the control system turns those instructions into signals that drive the physical hardware. Real systems also include calibration, runtime and error correction, which span several layers.'},
 R.ask('Assigning a CZ to a pair of qubits that can interact directly, and planning SWAPs or atom moves — which layer does this mainly belong to?',['Applications and algorithms','Compilation','Physical hardware'],1,'Compilation is the bridge between circuits and devices. Working within the gate set, connectivity and control constraints, it plans an implementation that keeps the original computation intact.'),
 R.end('The same circuit can be implemented in different ways on different devices.<br>In the next chapter, see why noise pulls real results away from the ideal ones.')
]);
;
/* js/lessons/en/required-5.js */
/* English pages for chapter 5; must mirror js/lessons/required-5.js page for page. */
R.en('C5-1',[
 R.say('Why doesn’t the same quantum experiment always give the same result? Let’s work through a few questions and learn to tell the built-in randomness of measurement apart from noise.'),
 R.ask('You prepare a fresh |+⟩ each time and measure it with an ideal 0/1 measurement. Sometimes you get 0, sometimes 1. Did the device make a mistake?',['Yes, the device made an error','No — this state’s outcomes are random to begin with'],1,'With an ideal measurement, |+⟩ gives 0 or 1 with probability 1/2 each. Not being able to predict a single outcome doesn’t mean anything went wrong.'),
 R.play('single','Prepare |+⟩ and measure it over and over. Simulate 32 shots first, then switch to 512 and compare the counts.',{buttons:true,sample:true,controls:[['shots','Shots',[[32,'32 shots'],[512,'512 shots']]]],initial:{prep:'plus',analysis:'none',shots:32},observe:[{shots:32},{shots:512}],note:'Every shot prepares a fresh |+⟩ and measures it, so no single outcome can be predicted. The counts come from simulated sampling and change every time you run it.',pm:'The theoretical probabilities stay at 1/2 each. Each batch of counts wobbles around that, and the more shots you take, the closer the split gets to 50%.'}),
 R.ask('In theory, 0 and 1 each have a 50% chance. You run the experiment 100 times and get 48 zeros and 52 ones. Is that alone enough to say there’s noise?',['Yes — a working device should give exactly 50 of each','No — counts from a limited number of shots naturally fluctuate'],1,'Equal probabilities don’t mean every batch splits exactly evenly. This kind of sampling fluctuation shows up even in an ideal experiment.'),
 R.ask('You correctly prepared |0⟩ and didn’t plan any operation that changes it. But before measurement, a disturbance from the environment turned it into |1⟩. What is this?',['A state error caused by noise','The randomness that measuring |0⟩ has even in an ideal device'],0,'Ideally, measuring |0⟩ always gives 0. Here an extra physical disturbance changed the state. Noise can also affect operations and readout.'),
 R.ask('The readout instrument sometimes records a 0 as a 1. If you just go from 100 shots to 1000, will that error go away on its own?',['Yes, measuring more will fix it','No — you’ll just get a steadier view of results that still contain readout errors'],1,'More samples smooth out statistical fluctuation, but they don’t fix the readout instrument. Reducing this error means tackling its source.'),
 R.ask('While the computation is running, the qubits are constantly being disturbed by their environment. If you never measure, can you avoid the effects of noise?',['No — errors can also happen while qubits wait and during operations','Yes — errors only happen during measurement'],0,'Noise doesn’t wait for a measurement to do its damage. The longer a computation runs, the more its quantum information needs protecting.'),
 R.end('Some measurement outcomes are random by nature, and counts from a limited number of shots fluctuate. Noise is something extra that affects the state, the operations or the readout, and taking more shots won’t make it go away.<br>In the next lesson, try detecting and correcting an error.')
]);
R.en('C5-2',[
 R.say('Let’s start with a simple kind of error: a 0 turning into a 1, or a 1 turning into a 0. This is called a bit flip.','First, a classical example: use 000 to stand for 0 and 111 to stand for 1. For now, assume at most one bit flips.'),
 R.ask('You receive 010. If at most one bit flipped, which codeword was sent?',['000','111'],0,'010 differs from 000 only in the middle bit, but from 111 in two bits. So under this assumption it must have been 000, with an error in the middle.'),
 R.ask('How do you turn 010 back into 000?',['Flip the first bit','Flip the second bit back','Flip the third bit'],1,'Flip the middle 1 back to 0 and you have 000 again. Finding an error and undoing it is called correction.'),
 R.ask('Now you aren’t told any of the bit values. You only know that bits 1 and 2 differ, and bits 2 and 3 also differ. If at most one bit flipped, which one is wrong?',['Bit 1','Bit 2','Bit 3'],1,'The middle bit disagrees with both of its neighbors, so it’s the one that flipped. This works whether the original was 000 or 111: just comparing the bits with each other gives you a clue about the error.'),
 R.play('syndrome','Choose a position to flip, one at a time. Using only “are bits 1 and 2 the same?” and “are bits 2 and 3 the same?”, can you find the wrong bit? At the end, try flipping two bits at once.',{buttons:true,observe:[{mask:4},{mask:2},{mask:1},{mask:3}],pm:'Any single flip can be pinned down exactly. When two bits flip at once, the comparisons point to a different bit as the culprit.'}),
 R.ask('Say the original was 000, but two bits flipped and you got 110. If you still correct as if there’s “at most one error,” what do you end up with?',['Back to 000','You conclude the third bit is wrong and get 111'],1,'110 is only one bit away from 111, so the correction picks the wrong answer. This three-bit scheme can fix one flip, not any number of errors.'),
 R.say('How do we bring this idea to quantum information? There’s a catch. As you saw in Chapter 3, an unknown quantum state can’t be copied, and measuring it makes it collapse. So you can’t make several copies and read each one out to compare them, the way you would with classical bits.','Quantum error correction (QEC) spreads the information of one qubit across several qubits, then uses extra helper qubits to compare how those qubits relate to one another (just like asking “are bits 1 and 2 the same?” above). That reveals clues about errors without directly reading out the protected quantum information.','The qubits that physically exist in the hardware are called <strong>physical qubits</strong>; the protected qubit encoded jointly by several of them is called a <strong>logical qubit</strong>.'),
 R.ask('In the three-qubit bit-flip code, the comparisons show that physical qubit 2 has suffered an X flip. How do you fix it?',['Measure all the physical qubits, then re-prepare them by majority vote','Apply another X gate to physical qubit 2'],1,'X swaps |0⟩ and |1⟩, so two X gates in a row cancel out. Once you know where the error is, applying X again undoes the flip without reading out the protected quantum state.'),
 R.say('So far we’ve only dealt with flip errors. Quantum states can also suffer phase errors, and a complete quantum error correction scheme has to handle those too.','On top of that, the checks and corrections can go wrong themselves. To finish a long computation, the information has to stay protected the whole time, and errors from operations must be kept from spreading beyond what can be corrected.'),
 R.ask('Which approach is closer to fault-tolerant quantum computing?',['Correct errors once at the start, then never check again','Keep correcting errors throughout the computation, and run gates in ways that limit how errors spread'],1,'That’s the idea behind fault-tolerant quantum computing (FTQC): using error correction and fault-tolerant operations so that imperfect physical qubits can still support reliable computation. It needs low enough error rates in the hardware; just adding more qubits doesn’t guarantee success.'),
 R.end('You’ve spotted a flip, located the error and corrected it — that’s the basic idea of error correction. QEC protects quantum information by encoding it; FTQC extends that protection across the whole computation so logical qubits can compute reliably.<br>In the next chapter, see how quantum algorithms use superposition and phase to solve real problems.')
]);
;
/* js/lessons/en/required-6.js */
/* English pages for chapter 6; must mirror js/lessons/required-6.js page for page. */
R.en('C6-1',[
 {t:'show',art:'mziSetup',cap:'Let’s start with a classic optical setup: the <strong>Mach–Zehnder interferometer</strong>.<span class="cap-item">The <strong>photon source</strong> sends out one photon at a time.</span><span class="cap-item">A <strong>beam splitter</strong> is a half-silvered mirror: a photon has a 50% chance of passing straight through and a 50% chance of bouncing off.</span><span class="cap-item">Two <strong>mirrors</strong> steer the upper and lower paths so they meet again at beam splitter 2.</span><span class="cap-item">The upper path has a <strong>phase shifter</strong>, which adjusts the phase along that path without blocking the photon.</span><span class="cap-item">Finally, two <strong>detectors</strong> record which exit the photon comes out of.</span>'},
 {...R.ask('Make a prediction: suppose that at beam splitter 1 the photon simply “picks a path at random,” upper or lower, half the time each. How many photons will each detector get?',
  ['Almost all of them reach detector 0','Roughly half each, no matter how the upper path is set','It depends on how fast the photon travels'],1,
  'If the photon really just picked a path at random, each path would send it to either detector equally often, so you’d always see a half-and-half split. Now let’s test that prediction with the experiment.'),leadArt:'mziSetup'},
 {t:'play',c:'mzi',task:'Drag the slider to change the phase on the upper path, and watch how the detector probabilities change. Does this match your prediction?',
  intro:['This is the Mach–Zehnder interferometer. After beam splitter 1, the photon can take the upper or lower path, and the upper path has an adjustable phase shifter. The two paths meet at beam splitter 2, and two detectors pick up the photon.'],
  gh:'Set the phase to about 180° and see where the photon goes.',ok:st=>st.seen.includes('dark'),pm:'At 0°, every photon reaches detector 0; at 180°, every photon reaches detector 1. Changing nothing but the phase decides where the photon ends up.'},
 R.say(
  'That’s not what the “random path” prediction said: at 0°, every photon reaches detector 0, and at 180°, every photon reaches detector 1.',
  'The reason is that the photon doesn’t take just one path. It’s in a superposition of both, and each path contributes an <strong>amplitude</strong> (probability amplitude) toward each detector. Probabilities are never negative, so adding them can only make the total bigger. Amplitudes can be positive or negative (more generally, they carry a phase), so when you add them they can reinforce each other or cancel out.'
 ),
 R.ask('At phase φ = 90°, what’s the probability that detector 0 picks up the photon?',['0%','50%','100%'],1,
  'The two amplitudes heading to detector 0 each have length 1/2 and point 90° apart. Put the two arrows head to tail and the combined arrow has length √2/2; squaring that gives 1/2, or 50%. As the phase goes from 0° to 180°, the probability slides smoothly from 100% down to 0%.'),
 R.play('compare','Groups A and B differ only in their relative phase. Apply the same H gate to both and compare the results.',{
  c:'qubit',key:'interference-short',pair:'phase',init:'plus',sample:false,required:true,probabilityOnly:true,
  intro:['The same thing happens in quantum circuits: a beam splitter acts like an H gate, and a phase shifter is like adding a phase to the $|1\\rangle$ component.','Remember the Chapter 2 experiment? Group A is $|+\\rangle$ and group B is $|-\\rangle$, matching phases of 0° and 180°. Measured directly, the two look exactly the same.'],
  explain:'A always gives 0 and B always gives 1. Two groups you couldn’t tell apart by measuring directly are now completely different after the same H — just like turning the interferometer’s phase from 0° to 180°.'
 }),
 {t:'show',art:'interferenceSums',cap:'Why does this happen? Break H down: each of the two components leads to both 0 and 1, with an amplitude of +1/2 or −1/2. Amplitudes heading to the same outcome are added first, and only then is the magnitude squared to give a probability.<span class="cap-item"><strong>Group A</strong> ($|+\\rangle$): the two amplitudes toward 0 have the same sign and reinforce; the two toward 1 have opposite signs and cancel.</span><span class="cap-item"><strong>Group B</strong> ($|-\\rangle$): exactly the reverse.</span>That’s how a difference in phase becomes a difference in measurement probabilities.'},
 R.ask(String.raw`After H, the two amplitudes of $|-\rangle$ leading to 0 are +1/2 and −1/2. What’s the probability of measuring 0?`,
  ['0%','50%','100%'],0,
  'Add the amplitudes first: +1/2 − 1/2 = 0. Squaring the magnitude gives 0%. If you added the two paths’ probabilities instead, the classical way (1/4 + 1/4), you’d wrongly get 50%.'),
 R.say(
  'Amplitudes with the same sign reinforce each other; amplitudes with opposite signs cancel. This is called <strong>interference</strong>.',
  'Here’s the basic recipe of a quantum algorithm: use a series of operations to set up the phases of the components, then let interference cancel the amplitudes of wrong answers and reinforce the amplitude of the right one.',
  'Interference only works while the quantum state stays coherent. If you measure partway through, or noise scrambles the phase relationships, the reinforcing and canceling break down. That’s one reason Chapter 5 put so much weight on protecting quantum information.'
 ),
 R.ask('A quantum algorithm wants the right answer to be easier to measure. Which description is more accurate?',
  ['Check every candidate at once, then read out the right one directly','First adjust the phases of the components, then use interference to reinforce the right answer’s amplitude'],1,
  'Quantum computing isn’t “try every answer at once and read off the right one”: a single measurement gives just one outcome. The real work is done by arranging the phases and then letting them interfere.'),
 R.end('Probabilities are never negative, so adding them only makes them grow; amplitudes can be positive or negative, so they can reinforce or cancel. Interference turns differences in phase into differences in measurement probabilities.<br>In the next lesson, use Grover search to see how interference helps find an answer.')
]);

/* A short Grover experience: predict, act, observe, then explain. */
R.en('C6-2',[
 R.play('grover','Only one of four candidate codes opens the lock. How can you make the correct one easier to measure?',{
  c:'groverLock',phase:'task',stage:0,
  before:'This is a practice combination lock with just four candidate codes: 00, 01, 10 and 11 (real problems can have far more). The algorithm has a checking rule that can tell whether a code is right, but it doesn’t know which code that is. To make things easier to follow, we’ll let you in on the secret: the correct code is 10.'
 }),
 R.play('grover','Take a guess: after preparing an even superposition, which code is most likely to be measured?',{
  c:'groverLock',phase:'prepare',stage:0,
  o:['All four codes are equally likely','The correct code is already more likely'],a:0,
  after:'Each code sits at 25%. Measuring now is no better than a random guess; nothing favors the correct code yet.'
 }),
 R.play('grover','First, use the checking rule to mark once. Do the probabilities change?',{
  c:'groverLock',phase:'mark',stage:0,nextStage:1,action:'Mark',
  before:'In Chapter 2, the Z gate flipped the sign of a single qubit’s |1⟩ component. Here the checking rule is built from a set of quantum gates: the component for the correct code flips sign, and the others stay as they are.',
  after:'The amplitude of 10 goes from positive to negative, but all four probabilities are still 25%. Just as with Z, changing only the phase doesn’t change the measurement probabilities yet.',
  detail:'These gates change the phase based on one rule: does the code pass the check? They don’t read out the code, and they aren’t just a Z on each of the two qubits. The − sign in the figure is only there to show you what happened.'
 }),
 R.play('grover','Now add interference and watch the probability of the correct code.',{
  c:'groverLock',phase:'amplify',stage:1,nextStage:2,action:'Amplify',
  before:'Amplifying works by “reflecting about the average”: find the average of the four amplitudes, then flip each amplitude to the other side of that average, so new value = 2 × average − old value. After marking, the amplitudes are +1/2, +1/2, −1/2, +1/2, and their average is 1/4. Work it out yourself, then click “Amplify” to check.',
  after:'For each of the three wrong codes: 2 × 1/4 − 1/2 = 0. For the correct code 10: 2 × 1/4 − (−1/2) = 1. Probability is the amplitude squared, so the correct code jumps from 25% to 100% and the others drop to 0.',
  detail:'The component marked with a minus sign is farthest from the average, so the reflection makes it the largest, while the others land exactly on 0. That’s interference: the wrong answers’ amplitudes cancel and the right answer’s reinforce. The 100% holds for this ideal four-candidate model; with more candidates, each round raises the probability only partway, so you need several rounds.'
 }),
 R.play('grover','What happens if you run another round of “mark + amplify”?',{
  c:'groverLock',phase:'repeat',stage:2,nextStage:4,action:'Run another round',
  o:['It stays at 100%','The probability may drop'],a:1,
  before:'Make a prediction, then check it on the same lock.',
  after:'The correct code’s probability falls from 100% back to 25%. Grover needs the right number of rounds; more isn’t always better.'
 }),
 R.play('grover','One last check: how does Grover make the right answer easier to measure?',{
  c:'groverLock',phase:'recap',stage:2,
  o:['Tell the algorithm the correct code in advance, then read it out','Mark the target’s phase with the checking rule, then use interference to raise its probability'],a:1,
  after:'Checking rule → phase mark → amplify by interference. The right operations raise the chance of finding the target, but more rounds aren’t always better.',
  detail:'As the number of candidates N grows, the number of checks Grover needs grows only with its square root (about 0.8×√N). Checking candidates one by one takes N/2 checks on average.'
 }),
 R.end('Grover uses a checking rule to mark the target, then interference to amplify its probability.<br>In the next lesson, meet another famous quantum algorithm: Shor’s algorithm, which factors integers by finding periods.')
]);

R.en('C6-3',[
 R.say(
  'Multiplying two primes is easy: 3 × 5 = 15. Going the other way — breaking a very large integer into its prime factors — is hard. For numbers hundreds of digits long, even the best known classical algorithms take an extremely long time. Widely used public-key cryptography such as RSA relies on exactly this difficulty to keep information safe.',
  'In 1994, Peter Shor found a quantum algorithm that can factor integers efficiently, given a large and reliable enough quantum computer. Its key move is turning “factor an integer” into “find a period.”'
 ),
 {t:'show',art:'shorPeriod',cap:'Let’s factor 15 as an example. Pick a number coprime to 15 (one that shares no factor with it except 1), such as 2, and work out the remainders when powers of 2 are divided by 15. The remainders cycle through 1, 2, 4, 8.'},
 R.ask('Using the table and starting from x = 0, how many steps until the remainders repeat?',['2 steps','4 steps','8 steps'],1,'2⁰ divided by 15 leaves 1, and 2⁴ = 16 divided by 15 leaves 1 again; from there the remainders keep cycling through 1, 2, 4, 8. So the period is r = 4.'),
 R.say(
  'Once you know the period, an ordinary computer can quickly finish the job. The period r = 4 is even, so compute $2^{r/2}=2^2=4$, then find the greatest common divisor of 15 with 4 − 1 = 3 and with 4 + 1 = 5:',
  String.raw`$$\gcd(3,15)=3,\qquad \gcd(5,15)=5.$$`,
  'That gives 15 = 3 × 5. For other integers this step occasionally fails; if it does, just try again with a different base.'
 ),
 R.ask('Which step of Shor’s algorithm actually needs a quantum computer?',['Finding the greatest common divisor','Finding the period of the remainders','Multiplying the two factors to check the answer'],1,'Finding the gcd and checking the product are both fast on classical computers. The hard part is the period: for large integers it can be enormous, and computing remainders one at a time to find it is as slow as brute force. A quantum computer puts many exponents into superposition, then uses the quantum Fourier transform (a quantum operation that pulls out the period through interference) to reinforce the outcomes tied to the period. That lets it get the period efficiently.'),
 {t:'show',art:'algorithmOverview',cap:'Grover and Shor aren’t the only ones: quantum algorithms are also being developed for simulating molecules and materials, for optimization, and more. Different algorithms suit different tasks and offer different kinds of speedup.'},
 R.ask('“Shor’s algorithm has already broken the encryption banks use today.” Is this claim right?',
  ['Yes — once the algorithm was published, the encryption was broken','No — factoring keys of practical size needs a large-scale fault-tolerant quantum computer, and none exists yet'],1,
  'Today’s quantum computers are still far too small and too error-prone. Factoring real-world keys such as RSA keys would take many logical qubits, plus the fault-tolerant quantum computing from Chapter 5. Still, the risk is real, and new cryptography designed to resist quantum attacks is already being developed and rolled out.'),
 R.end('Shor’s algorithm turns factoring into period finding, then uses interference to find the period efficiently. Grover and Shor both show that the power of quantum algorithms comes from carefully arranging amplitudes, not from trying every answer at once.<br>In the next chapter, use FatQat to write quantum operations as a program.')
]);
;
/* js/lessons/en/required-7.js */
/* English pages for chapter 7; must mirror js/lessons/required-7.js page for page. */
R.en('C7-1',[
 {...R.say('<strong>FatQat</strong> is the SpaceQat community’s open-source quantum programming framework, built on Python. The idea is “write a quantum program once”: gates, measurements and parameters all go into a single Program, which you can then hand to different backends. You can look purely at how the algorithm behaves, add a real device’s gate set and connectivity limits, or go all the way down to simulating the physics at the pulse level.','In this lesson we’ll start with the simplest simulator and run a small experiment: prepare |0⟩ → apply an H gate → measure, repeat 100 times, and count the outcomes. We’ll build it in four steps, looking at just a few lines of code at a time.')},
 R.lab('Prepare the qubit, starting from |0⟩.',{labKey:'code',codeStage:'prepare',seed:[],measured:false,shots:100,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('Add a quantum gate: apply H to qubit 0.',{labKey:'code',codeStage:'gates',seed:['H'],measured:false,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('Add a measurement and store the outcome in a classical bit.',{labKey:'code',codeStage:'measure',seed:['H'],measured:true,explain:true,showCode:true,codeFirst:true,ok:()=>true,gh:''}),
 R.lab('Run the sampling and read the counts.',{labKey:'code',codeStage:'execute',seed:['H'],measured:true,shots:100,explain:true,showCode:true,codeFirst:true,ok:m=>!!m.result,gh:'Sample once and see how many times 0 and 1 each come up.'}),
 R.ask('If the output includes "\'0\': 49", what does that mean?',['The amplitude is 49','0 was measured 49 times','The 49th qubit'],1,'The key is the measurement outcome and the value is how many times it came up. It isn’t the amplitude of the quantum state.'),
 R.lab('This time, use X instead of H. How will the counts change? Make a prediction first, then add one X gate and sample. Watch the code change as you go.',{labKey:'code',seed:[],measured:true,shots:100,edit:true,gates:['H','X'],showCode:true,codeFirst:true,explain:true,ok:m=>m.seq.join(',')==='X'&&!!m.result,gh:'Add one X gate, then sample.'}),
 R.say('The counts in this lesson come from a simulation running inside the web page; the page doesn’t actually run the FatQat Python code shown above. With a limited number of shots, the counts won’t always match the theoretical ratio exactly. Real devices also involve actual preparation, control and readout, so taking more shots won’t automatically remove device errors.','To keep going with FatQat, copy the lab code and run it in a Python environment with FatQat installed. <a class="career-doc-link" href="https://fatqat.readthedocs.io/en/latest/guide/quickstart/" target="_blank" rel="noopener noreferrer">Continue with FatQat: Quickstart (opens in a new window)</a>'),
 R.end('You’ve seen how to describe a quantum experiment in code. What work goes into running a program like this on a real device, and who does it?')
]);
R.en('C7-2',[
 {t:'show',art:'careerFlow',cap:'These kinds of work depend on one another, and one person may cover several of them.'},
 {t:'show',art:'careerDirections',cap:'Click a direction to see what the work involves and the background it draws on. Treat it as a starting point for exploring, not a hard line between majors or jobs.'},
 {t:'show',art:'careerNext',cap:'There’s no right or wrong interest, and you can change your mind any time. The follow-up tasks don’t affect finishing this course.'},
 R.end('This course gives you a starter map. Keep learning by following a question you care about, build your skills one small project at a time, and discover along the way what kind of work you enjoy.')
]);
;
/* js/completion.js */
/* Completion is derived from the current curriculum, never a separate saved flag. */
function courseIsComplete(){
 const ids=allIds();
 return ids.length>0&&ids.every(id=>S.done[id]);
}
const COMPLETION_TAKEAWAYS=[
 [L('认识量子比特','Understand qubits'),'C2'],
 [L('理解纠缠与多比特线路','Explore entanglement'),'C3'],
 [L('体验量子编程','Write quantum code'),'C7']
];
// One line per chapter for the on-page recap; the keepsake card keeps its three short takeaways.
const COMPLETION_RECAP={
 C1:L('分清量子计算擅长什么、不擅长什么','What quantum computers are good at, and what they are not'),
 C2:L('用概率幅描述量子态，理解测量与相位','Describe states with amplitudes; understand measurement and phase'),
 C3:L('用 CNOT 制备纠缠，理解不可克隆与传态','Create entanglement with CNOT; no-cloning and teleportation'),
 C4:L('认识五条硬件路线，以及编译做什么','Five hardware platforms, and what compilation does'),
 C5:L('分清测量随机性与噪声，了解纠错思路','Tell measurement randomness from noise; the idea of error correction'),
 C6:L('用干涉理解 Grover 搜索与 Shor 算法','Interference behind Grover’s search and Shor’s algorithm'),
 C7:L('用 FatQat 写出自己的第一个量子程序','Write your first quantum program with FatQat')
};
// The draft stays in memory only. No account or public profile is created.
const completionDraft={nickname:'',anonymous:false};
function completionImage(src){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image unavailable'));image.src=src;
 });
}
// Share card: 1080×1350 (4:5) so it fills an Instagram portrait post and a WeChat Moments tile without cropping.
// Idea: the course ends with a "measurement" — the learner's state collapses to |通关⟩ with probability 100%,
// and the SpaceQat cat climbs out of its box. Brand cyan (the cat's eye) full-bleed, black ink, both logos.
const COMPLETION_CARD={W:1080,H:1350};
// Where the QR code and the footer send people. assets/course-qr.png encodes this exact URL; regenerate it if this changes.
const COMPLETION_COURSE_URL='https://space-qat.com/learn/intro';
// The moment the last lesson was finished, kept beside the progress record; clearing progress clears it.
const COURSE_COMPLETED_AT_STORE=COURSE_STORE+'.completedAt';
function courseSyncCompletionTime(){
 try{
  if(!courseIsComplete()){localStorage.removeItem(COURSE_COMPLETED_AT_STORE);return null}
  let stamp=localStorage.getItem(COURSE_COMPLETED_AT_STORE);
  if(!stamp||Number.isNaN(Date.parse(stamp))){stamp=new Date().toISOString();localStorage.setItem(COURSE_COMPLETED_AT_STORE,stamp)}
  return new Date(stamp);
 }catch(e){return courseIsComplete()?new Date():null}
}
function completionTimeLabel(date){
 const p=n=>String(n).padStart(2,'0');
 return `${date.getFullYear()}.${p(date.getMonth()+1)}.${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
// Pass number: salted SHA-256 of nickname + completion time. Same name and time always give the same number.
const COMPLETION_SALT='SpaceQat/quantum-journey/2026';
const COMPLETION_ALPHABET='0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U
async function completionPassNumber(name,date){
 const input=`${COMPLETION_SALT}|${name.normalize('NFC')}|${date.toISOString()}`;
 let bytes;
 try{bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))}
 catch(e){// no Web Crypto (insecure context): two FNV-1a passes as a fallback
  bytes=new Uint8Array(8);[2166136261,3735928559].forEach((seed,k)=>{let h=seed;for(let i=0;i<input.length;i++)h=Math.imul(h^input.charCodeAt(i),16777619);for(let j=0;j<4;j++)bytes[k*4+j]=(h>>>(j*8))&255})}
 let bits=0,value=0,out='';
 for(const byte of bytes){value=((value<<8)|byte)&0xffff;bits+=8;while(bits>=5&&out.length<8){out+=COMPLETION_ALPHABET[(value>>>(bits-5))&31];bits-=5}if(out.length>=8)break}
 return `SQ-${out.slice(0,4)}-${out.slice(4,8)}`;
}
// Turn the cat-in-box mark into a sticker: holes filled white, thick white outline, so it reads on any background.
function completionSticker(mark,width,outline){
 const height=Math.round(width*mark.naturalHeight/mark.naturalWidth),pad=outline+2,W=width+pad*2,H=height+pad*2;
 const shape=document.createElement('canvas');shape.width=W;shape.height=H;
 const s=shape.getContext('2d',{willReadFrequently:true});s.drawImage(mark,pad,pad,width,height);
 // Paint every transparent pixel that the outside cannot reach (inside the box, between the flaps) white.
 const img=s.getImageData(0,0,W,H),d=img.data,seen=new Uint8Array(W*H),stack=[];
 const push=i=>{if(!seen[i]&&d[i*4+3]<128){seen[i]=1;stack.push(i)}};
 for(let x=0;x<W;x++){push(x);push((H-1)*W+x)}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1)}
 while(stack.length){const i=stack.pop(),x=i%W;if(x>0)push(i-1);if(x<W-1)push(i+1);if(i>=W)push(i-W);if(i<W*(H-1))push(i+W)}
 for(let i=0;i<W*H;i++)if(!seen[i]&&d[i*4+3]<255){const a=d[i*4+3]/255;d[i*4]=d[i*4]*a+255*(1-a);d[i*4+1]=d[i*4+1]*a+255*(1-a);d[i*4+2]=d[i*4+2]*a+255*(1-a);d[i*4+3]=255}
 s.putImageData(img,0,0);
 // White silhouette, stamped around a circle to make the outline.
 const silhouette=document.createElement('canvas');silhouette.width=W;silhouette.height=H;
 const t=silhouette.getContext('2d');t.drawImage(shape,0,0);t.globalCompositeOperation='source-in';t.fillStyle='#fff';t.fillRect(0,0,W,H);
 const out=document.createElement('canvas');out.width=W;out.height=H;const o=out.getContext('2d');
 for(let k=0;k<32;k++){const a=k/32*Math.PI*2;o.drawImage(silhouette,Math.cos(a)*outline,Math.sin(a)*outline)}
 o.drawImage(shape,0,0);
 return {canvas:out,pad,width,height};
}
function drawCompletionCard(canvas,art,info){
 const {W,H}=COMPLETION_CARD,c=canvas.getContext('2d'),{name,passNo,time}=info;
 const font='"SpaceQat Course Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
 const mono='"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
 const ink='#0b0b0b',cyan='#a2ecf0',cyanDeep='#86dfe5',paper='#ffffff',deep='#14585d';
 const setFont=(size,weight,family=font)=>{c.font=`${weight} ${size}px ${family}`};
 // Draw text shrunk to fit; returns the width actually drawn.
 const text=(value,x,y,size,weight,fill,align='left',max=936,family=font)=>{
  c.fillStyle=fill;c.textAlign=align;c.textBaseline='alphabetic';setFont(size,weight,family);
  while(c.measureText(value).width>max&&size>14){size--;setFont(size,weight,family)}
  c.fillText(value,x,y);return c.measureText(value).width;
 };
 const round=(x,y,w,h,r,fill,stroke,lw=3)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}};
 const FOOT=1170,en=LANG==='en',chapters=Object.keys(LEVELS).length,lessons=allIds().length,M=72,R=W-72;
 c.save();c.clearRect(0,0,W,H);

 // Field: brand cyan with a faint dot lattice.
 c.fillStyle=cyan;c.fillRect(0,0,W,H);
 c.fillStyle=cyanDeep;
 for(let y=204;y<FOOT;y+=36)for(let x=36;x<W;x+=36){c.beginPath();c.arc(x,y,1.8,0,Math.PI*2);c.fill()}

 // Header: the two logos on a white plate (the SpaceQat mark needs a white ground), certificate title right.
 const sqH=60,sqW=sqH*art.full.naturalWidth/art.full.naturalHeight,oqH=36,oqW=oqH*art.openqi.naturalWidth/art.openqi.naturalHeight;
 const plateW=24+sqW+44+oqW+28;
 round(M,56,plateW,88,20,paper,ink,3);
 c.drawImage(art.full,M+24,70,sqW,sqH);
 c.fillStyle='#c9c9c9';c.fillRect(M+24+sqW+21,78,2,44);
 c.drawImage(art.openqi,M+24+sqW+44,82,oqW,oqH);
 if(en)text('CERTIFICATE OF COMPLETION',R,112,22,800,ink,'right',420,mono);
 else{text('结课证明',R,96,32,800,ink,'right',300);text('CERTIFICATE OF COMPLETION',R,128,16,700,ink,'right',300,mono)}
 c.fillStyle=ink;c.fillRect(M,180,R-M,4);

 // ① Result: kicker, the collapsed state as a giant ket, the probability readout.
 text(L('测量结果','MEASUREMENT RESULT'),M,250,en?22:28,700,ink,'left',936,en?mono:font);
 const word=L('通关','done');
 let size=en?210:200;setFont(size,900);
 while(c.measureText(word).width+size*.84>936&&size>80){size-=4;setFont(size,900)}
 const wordW=c.measureText(word).width,base=450,top=base-size*.80,bottom=base+size*.06,stroke=size*.075;
 let x=M+stroke/2;
 c.strokeStyle=ink;c.lineWidth=stroke;c.lineCap='square';c.lineJoin='miter';
 c.beginPath();c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();
 x+=size*.16;c.fillStyle=ink;c.textAlign='left';c.fillText(word,x,base);
 x+=wordW+size*.06;const mid=(top+bottom)/2;
 c.beginPath();c.moveTo(x,top);c.lineTo(x+size*.17,mid);c.lineTo(x,bottom);c.stroke();
 round(M,500,R-M,56,28,ink);
 text(L('测得概率','Probability'),M+32,537,24,600,cyan,'left',400);
 text('100%',R-32,538,28,700,cyan,'right',200,mono);

 // ② Who: name, what they finished, then the pass number and completion time as a ticket stub.
 let y=640;
 if(name){text(name,M,y,60,800,ink,'left',936);y+=52}
 const line=name
  ?L('完成了量立方「量子计算入门」课程','completed Intro to Quantum Computing by SpaceQat')
  :L('我完成了量立方「量子计算入门」课程','I completed Intro to Quantum Computing by SpaceQat');
 text(line,M,y,30,500,ink,'left',936);
 y+=34;
 const meta=[[L('通关号','PASS NO.'),passNo],[L('通关时间','COMPLETED'),completionTimeLabel(time)]];
 let mx=M;
 meta.forEach(([label,value])=>{
  const lw=text(label,mx,y+30,en?17:18,700,deep,'left',200,en?mono:font);
  const vw=text(value,mx+lw+12,y+31,22,700,ink,'left',300,mono);
  mx+=lw+12+vw+40;
 });

 // ③ Stats, stacked on the left; the cat sticker on the right, standing on the footer.
 const stats=[[String(chapters),L('章','chapters')],[String(lessons),L('节','lessons')],['1',L('个亲手写的量子程序','quantum program I wrote')]];
 let sy=name?900:870;const step=name?104:112;
 stats.forEach(([n,unit])=>{
  const w=text(n,M,sy,96,900,ink,'left',260);
  text(unit,M+w+14,sy,28,600,ink,'left',300);
  sy+=step;
 });
 const st=art.sticker,sx=W-st.width-30,sy2=FOOT-st.height+4;
 c.save();c.shadowColor='#0b3b3f33';c.shadowBlur=24;c.shadowOffsetY=8;c.drawImage(st.canvas,sx-st.pad,sy2-st.pad);c.restore();

 // Footer: invitation + URL on the left, a QR code to the course on the right.
 c.fillStyle=paper;c.fillRect(0,FOOT,W,H-FOOT);
 c.fillStyle=ink;c.fillRect(0,FOOT,W,4);
 text(L('零基础学量子计算，从这里开始','Learn quantum computing from zero'),M,FOOT+80,34,800,ink,'left',540);
 text(COMPLETION_COURSE_URL.replace(/^https?:\/\//,''),M,FOOT+128,28,700,'#1b7f86','left',520,mono);
 const qs=140,qx=R-qs,qy=FOOT+20;
 c.imageSmoothingEnabled=false;c.drawImage(art.qr,qx,qy,qs,qs);c.imageSmoothingEnabled=true;
 text(L('扫码打开课程','Scan to open'),qx-24,FOOT+80,24,800,ink,'right',260);
 text(L('微信可长按识别','the course'),qx-24,FOOT+116,20,500,'#525252','right',260);
 c.restore();
}
function showCourseCompletion(){
 if(!courseIsComplete()){home();return}
 window.CourseDirectory?.dispose();disposeJourney();rememberStep();S.lesson=null;S.intro=false;
 app.innerHTML=progressHeader(L('学习旅程已完成','Journey complete'),100)+`<main id="main-content" class="completion-page shell">
  <header class="completion-hero">
   <span class="completion-mark" aria-hidden="true">${courseAchievementBadge(true)}</span>
   <h1 id="completion-title" tabindex="-1">${L('你完成了量子之旅','You finished the quantum journey')}</h1>
   <p class="completion-count">${L(`全部 ${Object.keys(LEVELS).length} 章、${allIds().length} 节已完成。从“算不完”的问题出发，你一路走过了量子比特、纠缠、硬件、纠错和量子算法，并写出了自己的第一个量子程序。`,`All ${Object.keys(LEVELS).length} chapters and ${allIds().length} lessons are done. Starting from problems that are “impossible to finish”, you worked through qubits, entanglement, hardware, error correction and quantum algorithms, and wrote your first quantum program.`)}</p>
  </header>
  <div class="completion-layout">
   <figure class="completion-preview"><img id="completion-card" width="1080" height="1350" alt="${L('量子学习旅程纪念卡','Quantum journey keepsake card')}" hidden><span class="completion-preview-placeholder" aria-hidden="true"></span></figure>
   <div class="completion-side">
    <section class="completion-recap" aria-labelledby="completion-recap-title">
     <h2 id="completion-recap-title">${L('旅程回顾','Your journey')}</h2>
     <ol>${Object.entries(LEVELS).map(([chapter,level],i)=>`<li><button type="button" class="completion-recap-row" data-review-chapter="${chapter}"><span class="completion-recap-no">${i+1}</span><span class="completion-recap-text"><strong>${level.name}</strong><span>${COMPLETION_RECAP[chapter]||''}</span></span><span class="sr-only">${L('，回顾本章',', review this chapter')}</span></button></li>`).join('')}</ol>
    </section>
    <section class="completion-editor" aria-labelledby="completion-editor-title">
     <h2 id="completion-editor-title">${L('保存纪念卡','Save your keepsake card')}</h2>
     <label for="completion-nickname">${L('昵称（选填）','Name (optional)')}</label>
     <div class="completion-save-row"><input id="completion-nickname" type="text" maxlength="40" placeholder="${L('写上你的名字','Your name')}" autocomplete="off"><button id="completion-save" class="primary" disabled>${L('保存图片','Save image')}</button></div>
     <p id="completion-status" role="status" aria-live="polite">${L('正在准备纪念卡…','Preparing your card…')}</p>
     <button id="completion-retry" class="text-button" hidden>${L('重新生成纪念卡','Generate the card again')}</button>
    </section>
   </div>
  </div>
  <section class="completion-next" aria-labelledby="completion-next-title">
   <h2 id="completion-next-title">${L('接下来','What’s next')}</h2>
   <div class="completion-next-grid">
    <a class="completion-next-item" href="https://fatqat.readthedocs.io/en/latest/guide/quickstart/" target="_blank" rel="noopener noreferrer"><strong>${L('用 FatQat 继续实践','Keep practicing with FatQat')}</strong><span>${L('在自己的电脑上运行第七章的量子程序','Run the chapter 7 program on your own computer')}</span></a>
    <button type="button" class="completion-next-item" id="completion-back"><strong>${L('回到课程地图','Back to the course map')}</strong><span>${L('任何一节都可以随时回来复习','Revisit any lesson at any time')}</span></button>
    <button type="button" class="completion-next-item" data-review-chapter="C1"><strong>${L('从第一节重新开始','Start again from lesson one')}</strong><span>${L('带着新的理解再走一遍','Walk through it again with fresh eyes')}</span></button>
   </div>
  </section>
 </main>`+siteFooter();
 const page=app.querySelector('.completion-page'),input=page.querySelector('#completion-nickname'),anonymous={checked:false,addEventListener(){}};
 const preview=page.querySelector('#completion-card'),saveButton=page.querySelector('#completion-save'),status=page.querySelector('#completion-status'),retry=page.querySelector('#completion-retry');
 const canvas=document.createElement('canvas');canvas.width=COMPLETION_CARD.W;canvas.height=COMPLETION_CARD.H;
 let art,time=courseSyncCompletionTime()||new Date(),drawn=0;
 input.value=completionDraft.nickname;anonymous.checked=completionDraft.anonymous;input.disabled=anonymous.checked;
 const update=async()=>{
  if(!art||!page.isConnected)return;const ticket=++drawn;
  const name=anonymous.checked?'':Array.from(input.value.trim()).slice(0,20).join('');
  const passNo=await completionPassNumber(name,time);if(ticket!==drawn||!page.isConnected)return;
  drawCompletionCard(canvas,art,{name,passNo,time});
  preview.src=canvas.toDataURL('image/png');preview.hidden=false;
  preview.alt=L(`${name?name+'：':''}测量结果 |通关⟩，测得概率 100%。通关号 ${passNo}，通关时间 ${completionTimeLabel(time)}。完成量立方「量子计算入门」全部 ${Object.keys(LEVELS).length} 章 ${allIds().length} 节。扫码打开课程：${COMPLETION_COURSE_URL}`,`${name?name+': ':''}Measurement result |done⟩, probability 100%. Pass no. ${passNo}, completed ${completionTimeLabel(time)}. Finished all ${Object.keys(LEVELS).length} chapters and ${allIds().length} lessons of SpaceQat's Intro to Quantum Computing. Scan to open the course: ${COMPLETION_COURSE_URL}`);
  saveButton.disabled=false;status.textContent='';
 };
 const edit=()=>{
  if(Array.from(input.value).length>20)input.value=Array.from(input.value).slice(0,20).join('');
  completionDraft.nickname=input.value;completionDraft.anonymous=anonymous.checked;input.disabled=anonymous.checked;update();
 };
 input.addEventListener('input',event=>{if(!event.isComposing)edit()});input.addEventListener('compositionend',edit);anonymous.addEventListener('change',edit);
 page.querySelector('#completion-back').onclick=()=>{home();window.scrollTo(0,0);document.getElementById('view-completion')?.focus({preventScroll:true})};
 page.querySelectorAll('[data-review-chapter]').forEach(button=>button.onclick=()=>open(LEVELS[button.dataset.reviewChapter].list[0]));
 saveButton.onclick=()=>{
  const link=document.createElement('a');link.download=L('SpaceQat-我完成了量子之旅.png','SpaceQat-quantum-journey.png');link.href=preview.src;
  document.body.append(link);link.click();link.remove();
  status.textContent=L('已发起图片下载','Download started');
 };
 const prepare=async()=>{
  retry.hidden=true;saveButton.disabled=true;status.textContent=L('正在准备纪念卡…','Preparing your card…');
  try{
   const [full,mark,openqi,qr]=await Promise.all([completionImage('spaceqat-logo.png'),completionImage('assets/spaceqat-site-logo.png'),completionImage('assets/openqi-logo.png'),completionImage('assets/course-qr.png'),document.fonts.load('500 54px "SpaceQat Course Sans"')]);
   art={full,mark,openqi,qr,sticker:completionSticker(mark,540,12)};
   await document.fonts.ready;
   update();
  }catch(error){if(page.isConnected){status.textContent=L('纪念卡未能生成，请重试。','The card could not be created. Please try again.');retry.hidden=false}}
 };
 retry.onclick=prepare;prepare();
 window.scrollTo(0,0);page.querySelector('h1').focus({preventScroll:true});
}
;
/* js/start.js */
/* Required curriculum: chapters and lesson order. Lesson IDs are C<chapter>-<position>. */
const LEVELS={
 C1:{name:L('认识量子计算','Meet quantum computing'),list:['C1-1','C1-2','C1-3']},
 C2:{name:L('量子比特','Qubits'),list:['C2-1','C2-2','C2-3','C2-4']},
 C3:{name:L('多比特与纠缠','Multiple qubits and entanglement'),list:['C3-1','C3-2','C3-3','C3-4','C3-5']},
 C4:{name:L('在硬件上实现量子线路','Running circuits on hardware'),list:['C4-1','C4-2']},
 C5:{name:L('从噪声到容错','From noise to fault tolerance'),list:['C5-1','C5-2']},
 C6:{name:L('量子算法','Quantum algorithms'),list:['C6-1','C6-2','C6-3']},
 C7:{name:L('编程与实践','Programming and practice'),list:['C7-1','C7-2']}
};
// In the published build the stylesheet loads without blocking, so the splash shows at once;
// the course itself starts only when the stylesheet is in, so nothing renders unstyled.
function courseBoot(){load();home();showWelcome();}
(function bootWhenStyled(run){
 let started=false;const go=()=>{if(!started){started=true;run()}};
 try{
  const pending=[...document.querySelectorAll('link[rel=stylesheet][data-async]')].filter(link=>link.media==='print');
  if(!pending.length)return go();
  let left=pending.length;
  pending.forEach(link=>{link.addEventListener('load',()=>{if(--left===0)go()},{once:true});link.addEventListener('error',go,{once:true})});
  setTimeout(go,10000);
 }catch(e){go()}
})(courseBoot);
;