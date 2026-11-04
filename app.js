import { content } from './content.js';
import './effects.js';
import './music.js';
import { renderLetter, openEnvelope, unfoldLetter } from './letter.js';
import { attachCandles } from './candles.js';
import { startPetalWind } from './petals.js';
import { DANCE_SEQUENCE, restoreProgress, saveProgress, completeChapter, matchesDance } from './state.js';

const story = document.querySelector('#story');
const nav = document.querySelector('#chapters');
const live = document.querySelector('#announcement');
let storage;
try { storage = window.localStorage; } catch { /* The postcard also works without storage. */ }
let progress = restoreProgress(storage);
let sound = false;
let audio;
let sequenceVisible = true;
let attempt = [];
const popped = new Set();
const intentions = new Set();
const candles = new Set();
let letterOpen = false;
let letterExpanded = false;
let wishIndex = -1;
let feedback = '';
let hint = false;

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, className = '') => `<span class="icon icon-${name} ${className}" aria-hidden="true"></span>`;
const completed = () => progress.completed.includes(progress.chapter);
const symbols = { lotus: 'Лотос', sun: 'Солнце', heart: 'Сердце' };

function announce(message) {
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

function tone(note = 0, celebratory = false) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
    const now = audio.currentTime;
    const notes = celebratory ? [0, 4, 7, 12] : [note];
    notes.forEach((step, i) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 261.63 * 2 ** (step / 12);
      gain.gain.setValueAtTime(0, now + i * .11);
      gain.gain.linearRampToValueAtTime(.09, now + i * .11 + .018);
      gain.gain.exponentialRampToValueAtTime(.001, now + i * .11 + .5);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(now + i * .11); oscillator.stop(now + i * .11 + .52);
    });
  } catch {
    sound = false;
    updateSound();
    announce('Звук в этом браузере недоступен. Путешествие продолжается.');
  }
}

function updateSound() {
  const button = document.querySelector('#sound-toggle');
  button.setAttribute('aria-pressed', String(sound));
  button.setAttribute('aria-label', sound ? 'Выключить звуковые эффекты' : 'Включить звуковые эффекты');
  button.innerHTML = `${icon(sound ? 'sound' : 'muted')}<span>Звук ${sound ? 'включён' : 'выключен'}</span>`;
}

function renderNav() {
  document.querySelector('#chapter-count').textContent = `${String(progress.chapter + 1).padStart(2, '0')} / 06`;
  nav.innerHTML = content.chapters.map((chapter, i) => `<button class="chapter-link ${i === progress.chapter ? 'current' : ''} ${i <= progress.unlocked ? 'unlocked' : ''}" data-action="chapter" data-chapter="${i}" ${i > progress.unlocked ? 'disabled' : ''} ${i === progress.chapter ? 'aria-current="step"' : ''} aria-label="Глава ${i + 1}: ${escape(chapter.short)}${i > progress.unlocked ? ', ещё закрыта' : ''}"><span class="chapter-number">${String(i + 1).padStart(2, '0')}</span><span>${escape(chapter.short)}</span><span class="chapter-dot" aria-hidden="true">${i < progress.unlocked ? icon('check') : i === progress.chapter ? icon('spark') : ''}</span></button>`).join('');
}

function goTo(chapter, focus = true) {
  if (chapter < 0 || chapter > progress.unlocked) return;
  progress.chapter = chapter;
  saveProgress(storage, progress);
  feedback = ''; hint = false;
  render(focus);
}

function unlock(message) {
  progress = completeChapter(progress, progress.chapter);
  saveProgress(storage, progress);
  feedback = message;
  renderNav();
  tone(0, true);
  announce(message + ' Следующая глава открыта.');
}

function gameFooter() {
  const done = completed();
  const hints = { 1: 'Подсказка: Лотос → Солнце → Сердце → Лотос. Можно смотреть сколько угодно.', 2: content.italy.hint, 3: 'Пять пузырей — пять поводов улыбнуться. Коснись каждого, они никуда не убегают.', 4: 'Выбери любые три разных пожелания. Здесь всё — от сердца, неправильных ответов нет.' };
  return `<div class="game-feedback ${done ? 'is-success' : ''}">${feedback ? `${done ? icon('check') : icon('spark')}<span>${escape(feedback)}</span>` : '<span class="feedback-placeholder">Никакой спешки. Это твой день.</span>'}</div>
    ${hint ? `<p class="hint-message">${escape(hints[progress.chapter])}</p>` : ''}
    <div class="game-actions"><button class="primary next-button" data-action="next" ${done ? '' : 'disabled'}>${done ? 'А дальше — ещё теплее' : 'Следующая глава'} ${icon('arrow')}</button>
    <div class="quiet-actions"><button class="text-button" data-action="hint">${hint ? 'Скрыть подсказку' : 'Нужен намёк?'}</button><span aria-hidden="true">/</span><button class="text-button" data-action="skip">Пропустить загадку</button></div></div>`;
}

function danceGame() {
  const done = completed();
  return `<div class="dance-composition"><div class="dancer-window"><img src="./assets/sunlit-italy.png" alt="Иллюстрация: индийский танец на солнечной итальянской террасе"><span class="image-caption">il ritmo della felicità</span></div>
    <div class="rhythm-card"><span class="small-label">ТВОЯ ТАНЦЕВАЛЬНАЯ ПАРТИЯ</span><p class="game-instruction">${done ? 'Открытка уже поймала твой ритм.' : sequenceVisible ? 'Запомни четыре движения. В твоём темпе.' : 'А теперь повтори этот маленький танец.'}</p>
    <div class="rhythm-sequence" role="img" aria-label="${sequenceVisible || done ? 'Лотос, Солнце, Сердце, Лотос' : `Введено ${attempt.length} из 4 движений: ${attempt.map(symbol => symbols[symbol]).join(', ')}`}">${DANCE_SEQUENCE.map((symbol, i) => `<span class="rhythm-step ${attempt[i] || done ? 'filled' : ''}">${sequenceVisible || done ? icon(symbol) : attempt[i] ? icon(attempt[i]) : `<span>${i + 1}</span>`}</span>`).join('')}</div>
    ${done ? `<div class="dance-complete">${icon('spark')}<span>Танец принят.<br>Аплодисменты — бесконечные.</span></div>` : sequenceVisible ? `<button class="secondary" data-action="memorized">Я запомнила ${icon('arrow')}</button>` : `<div class="dance-keys">${Object.entries(symbols).map(([key, label]) => `<button class="symbol-button" data-action="dance" data-symbol="${key}">${icon(key)}<span>${label}</span></button>`).join('')}</div><div class="dance-tools"><button class="text-button" data-action="replay">Посмотреть ритм</button><button class="text-button" data-action="clear-dance">Начать заново</button></div>`}
    <span class="handwritten">и раз, и два… и просто красота.</span></div></div>${gameFooter()}`;
}

function italyGame() {
  return `<div class="italy-composition"><div class="postcard-stamp" aria-hidden="true">ITALIA<br><span>con amore</span>${icon('sun')}</div><span class="small-label">UNA PICCOLA DOMANDA</span><h2 class="question">${escape(content.italy.question)}</h2><div class="answer-list">${content.italy.options.map((option, i) => `<button class="answer-button ${completed() && option.id === 'happiness' ? 'selected' : ''}" data-action="answer" data-answer="${option.id}" ${completed() ? 'disabled' : ''}><span class="answer-letter">${['A', 'B', 'C'][i]}</span><span>${escape(option.text)}</span>${icon(completed() && option.id === 'happiness' ? 'check' : 'arrow')}</button>`).join('')}</div><p class="handwritten italy-note">Ответ можно выбрать сердцем. Или после кофе.</p></div>${gameFooter()}`;
}

function laughterGame() {
  return `<div class="laughter-composition"><div class="laugh-sun" aria-hidden="true">${icon('sun')}<span>:)</span></div><span class="small-label">ЛАБОРАТОРИЯ ХОРОШЕГО НАСТРОЕНИЯ</span><p class="game-instruction">${escape(content.laughter.intro)}</p><div class="bubble-garden">${content.laughter.words.map((word, i) => `<button class="joy-bubble bubble-${i} ${popped.has(i) || completed() ? 'popped' : ''}" data-action="pop" data-bubble="${i}" ${popped.has(i) || completed() ? 'disabled' : ''} aria-label="${escape(word)}${popped.has(i) || completed() ? ', улыбка найдена' : ', лопнуть пузырь'}">${popped.has(i) || completed() ? icon('spark') : `<span>${escape(word)}</span>`}</button>`).join('')}</div><p class="bubble-count"><strong>${completed() ? 5 : popped.size}</strong> / 5 улыбок доставлено</p></div>${gameFooter()}`;
}

function lotusDrawing() {
  const count = completed() ? 3 : intentions.size;
  return `<div class="growing-lotus petals-${count}" role="img" aria-label="Лотос: раскрыто ${count} из 3 шагов"><span class="lotus-pond"></span><img src="./assets/lotus-generated.png" class="lotus-generated" alt=""><span class="lotus-light light-one">${icon('spark')}</span><span class="lotus-light light-two">${icon('spark')}</span><span class="lotus-light light-three">${icon('spark')}</span></div>`;
}

function sanghaGame() {
  return `<div class="sangha-composition"><span class="small-label">ПУСТЬ ДОБРОЕ РАСКРЫВАЕТСЯ</span>${lotusDrawing()}<p class="lotus-instruction">Выбери три пожелания для себя.<br>И посмотри, что расцветёт.</p><div class="intention-list">${content.sangha.intentions.map((intention, i) => `<button class="intention ${intentions.has(i) ? 'selected' : ''}" data-action="intention" data-intention="${i}" aria-pressed="${intentions.has(i)}" ${completed() ? 'disabled' : ''}>${icon(intentions.has(i) ? 'check' : 'spark')}<span>${escape(intention)}</span></button>`).join('')}</div></div>${gameFooter()}`;
}

function finaleGame() {
  if (!letterOpen) return `<div class="envelope-scene"><span class="small-label">ЛИЧНО В РУКИ. САШЕ.</span><button class="envelope" data-action="letter" aria-label="Открыть письмо для Саши"><span class="envelope-paper"><span>Тебе, с теплом.</span></span><span class="envelope-flap"></span><span class="wax-seal">${icon('lotus')}</span><span class="envelope-label">нажми, чтобы открыть</span></button><span class="handwritten">Иногда самые важные слова<br>нужно просто сказать.</span></div>`;
  const letter = renderLetter(content.finale, letterExpanded);
  if (!letterExpanded) return letter;
  return `${letter}
    <div class="birthday-ritual"><span class="small-label">А ТЕПЕРЬ — ЗАГАДАЙ ЖЕЛАНИЕ</span><div class="candle-scene">${[0, 1, 2].map(i => `<button class="candle-target ${candles.has(i) ? 'out' : ''}" data-action="candle" data-candle="${i}" aria-pressed="${candles.has(i)}" aria-label="${candles.has(i) ? 'Свеча погашена' : `Погасить свечу ${i + 1}`}" ${candles.has(i) ? 'disabled' : ''}><span class="candle-status">${icon(candles.has(i) ? 'check' : 'spark')}</span></button>`).join('')}</div><p class="candle-caption">${candles.size === 3 ? 'Пусть сбудется. С днём рождения, Саша!' : 'Нажми на каждую свечу. Желание останется твоим секретом.'}</p></div>
    <div class="wish-pocket"><span class="small-label">КАРМАШЕК ТЁПЛЫХ СЛОВ</span><p id="wish-text">${wishIndex < 0 ? 'Есть вещи, которых много не бывает. Добрые пожелания — одна из них.' : escape(content.finale.wishes[wishIndex])}</p><button class="primary magic-shimmer" data-action="wish">${wishIndex < 0 ? 'Достать пожелание' : 'И ещё одно, пожалуйста'} ${icon('gift')}</button></div><button class="download-button" data-action="download">${icon('download')} Сохранить письмо на память</button>`;
}

function renderGame(focusSelector) {
  const renderers = [null, danceGame, italyGame, laughterGame, sanghaGame, finaleGame];
  document.querySelector('#game').innerHTML = renderers[progress.chapter]();
  if (progress.chapter === 5 && letterExpanded) attachCandles(document.querySelector('.candle-scene'), candles);
  if (focusSelector) {
    const target = document.querySelector(focusSelector);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function render(focus = false) {
  const chapter = content.chapters[progress.chapter];
  story.dataset.chapter = progress.chapter;
  story.classList.remove('page-enter');
  if (progress.chapter === 0) {
    story.innerHTML = `<section class="cover"><div class="cover-art" aria-hidden="true"><img src="./assets/moonlit-garden.png" alt="" fetchpriority="high" width="1536" height="1024"></div><div class="cover-copy"><p class="eyebrow">${icon('lotus')} С ЛЮБОВЬЮ, ЧЕРЕЗ РАССТОЯНИЯ</p><h1 id="chapter-title" tabindex="-1"><span>Саша,</span><em class="magic-aurora">с днём<br>рождения.</em></h1><p class="cover-description">Пусть всё самое светлое<br>танцует в твою сторону.</p><button class="primary cover-cta magic-shimmer" data-action="start"><span>Открыть свою историю</span> ${icon('arrow')}</button><span class="cover-aside">Немного волшебства. Несколько загадок. Всё для тебя.</span></div><div class="cover-dedication" aria-hidden="true"><span>LA DOLCE VITA</span><i>in your own rhythm</i></div><div class="cover-footnote"><span class="little-line"></span><p>Индия в движениях. Италия за окном.<br>И целый мир тепла — для тебя.</p></div><span class="cover-margin-note" aria-hidden="true">ЭТА ИСТОРИЯ НАЧИНАЕТСЯ С УЛЫБКИ</span></section>`;
  } else {
    const title = chapter.title.split('\n').map((line, i) => `<${i ? 'em' : 'span'}>${escape(line)}</${i ? 'em' : 'span'}>`).join('');
    story.innerHTML = `<section class="chapter-layout ${progress.chapter === 5 && letterOpen ? 'letter-open' : ''}"><div class="chapter-intro"><p class="eyebrow">${escape(chapter.eyebrow)}</p><h1 id="chapter-title" tabindex="-1">${title}</h1><p class="chapter-description">${escape(chapter.description)}</p><div class="chapter-ornament" aria-hidden="true">${icon(['','lotus','cup','sun','lotus','heart'][progress.chapter])}<span></span></div><button class="back-button" data-action="back">${icon('arrow-left')} Назад, на страничку</button><span class="chapter-side-note">${['','Танцуй так, как радуется сердце.','Счастье прекрасно на любом языке.','Смех — тоже способ обнять.','Рядом. Даже если далеко.','С днём рождения, родная Сангха.'][progress.chapter]}</span></div><div id="game" class="game-area"></div></section>`;
    renderGame();
  }
  renderNav();
  document.body.dataset.chapter = progress.chapter;
  document.dispatchEvent(new CustomEvent('birthday:chapter', { detail: { chapter: progress.chapter } }));
  requestAnimationFrame(() => story.classList.add('page-enter'));
  if (focus) {
    document.querySelector('#chapter-title').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function downloadLetter() {
  const text = `Саша, с днём рождения!\n\n${content.finale.letter.join('\n\n')}\n\n${content.finale.signature}\n`;
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'Саша — с днём рождения.txt';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  announce('Письмо сохранено. Пусть тепло останется с тобой.');
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const { action } = button.dataset;
  if (['cover', 'sound'].includes(action)) event.preventDefault();
  if (action === 'cover') return goTo(0);
  if (action === 'chapter') return goTo(Number(button.dataset.chapter));
  if (action === 'back') return goTo(progress.chapter - 1);
  if (action === 'sound') { sound = !sound; updateSound(); if (sound) tone(7); else audio?.suspend().catch(() => {}); return; }
  if (action === 'start') { progress = completeChapter(progress, 0); return goTo(1); }
  if (action === 'next' && completed()) return goTo(progress.chapter + 1);
  if (action === 'skip') { progress = completeChapter(progress, progress.chapter); return goTo(progress.chapter + 1); }
  if (action === 'hint') { hint = !hint; renderGame('[data-action="hint"]'); if (hint) announce(document.querySelector('.hint-message').textContent); return; }
  if (action === 'memorized') { sequenceVisible = false; renderGame('[data-symbol="lotus"]'); return; }
  if (action === 'replay' || action === 'clear-dance') { attempt = []; sequenceVisible = action === 'replay'; feedback = ''; renderGame(sequenceVisible ? '[data-action="memorized"]' : '[data-symbol="lotus"]'); return; }
  if (action === 'dance' && !completed()) {
    attempt.push(button.dataset.symbol); tone(attempt.length * 2);
    if (attempt.length === 4) {
      if (matchesDance(attempt)) unlock(content.dance.success);
      else { attempt = []; feedback = content.dance.mistake; announce(feedback); }
    }
    renderGame(completed() ? '.next-button' : `[data-symbol="${button.dataset.symbol}"]`); return;
  }
  if (action === 'answer' && !completed()) {
    const option = content.italy.options.find(item => item.id === button.dataset.answer);
    if (option.id === 'happiness') unlock(content.italy.success);
    else { feedback = option.reply; announce(feedback); tone(2); }
    renderGame(completed() ? '.next-button' : `[data-answer="${option.id}"]`); return;
  }
  if (action === 'pop' && !completed()) {
    const i = Number(button.dataset.bubble);
    if (popped.has(i)) return;
    popped.add(i); tone(i * 2);
    feedback = content.laughter.replies[i];
    if (popped.size === 5) unlock(content.laughter.success); else announce(feedback);
    renderGame(completed() ? '.next-button' : '.joy-bubble:not(:disabled)'); return;
  }
  if (action === 'intention' && !completed()) {
    const i = Number(button.dataset.intention);
    if (intentions.has(i)) intentions.delete(i); else intentions.add(i);
    tone(intentions.size * 3);
    if (intentions.size === 3) unlock(content.sangha.success);
    else announce(`${intentions.size} из 3 пожеланий выбрано.`);
    renderGame(completed() ? '.next-button' : `[data-intention="${i}"]`); return;
  }
  if (action === 'letter') {
    tone(0, true);
    openEnvelope(button, () => {
      if (progress.chapter !== 5) return;
      letterOpen = true; render(false);
      const article = document.querySelector('.letter-paper');
      article.focus({ preventScroll: true });
      article.scrollIntoView({ block: 'start', behavior: 'instant' });
      announce('Конверт открыт. Разверни письмо — дальше ещё больше тепла.');
    });
    return;
  }
  if (action === 'unfold') {
    letterExpanded = true; renderGame();
    const article = document.querySelector('.letter-paper');
    unfoldLetter(article);
    article.focus({ preventScroll: true });
    announce('Письмо развёрнуто. Всё тепло — для тебя.');
    return;
  }
  if (action === 'candle') {
    const i = Number(button.dataset.candle); if (candles.has(i)) return; candles.add(i); tone(4 + i * 3);
    renderGame(candles.size === 3 ? '[data-action="wish"]' : '.candle-target:not(:disabled)');
    if (candles.size === 3) { startPetalWind(); tone(0, true); announce('Все свечи погашены. Ветер подхватил цветочные лепестки. Пусть желание сбудется!'); }
    else announce(`Погашено ${candles.size} из 3 свечей.`);
    return;
  }
  if (action === 'wish') { wishIndex = (wishIndex + 1) % content.finale.wishes.length; renderGame('[data-action="wish"]'); tone(7); announce(content.finale.wishes[wishIndex]); return; }
  if (action === 'download') downloadLetter();
});

render();
