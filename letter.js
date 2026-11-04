const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

export function renderLetter(finale, expanded = false) {
  const greetingEnd = finale.letter[0].indexOf('!') + 1;
  const greeting = finale.letter[0].slice(0, greetingEnd);
  const paragraphs = finale.letter.map((paragraph, index) => `<p>${escape(index === 0 ? paragraph.slice(greetingEnd).trim() : paragraph)}</p>`);
  return `<article class="letter-paper${expanded ? ' is-expanded' : ''}" tabindex="-1" aria-label="Письмо для Саши">
    <div class="letter-fold letter-fold--top">
      <div class="letter-illustration" aria-hidden="true"><img src="./assets/letter-garden.png" alt="" width="1536" height="1024"></div>
      <h2 class="letter-salutation">${escape(greeting)}</h2>
      ${paragraphs[0]}
      ${expanded ? '' : `<button class="letter-unfold-action" data-action="unfold" aria-expanded="false"><span>Развернуть письмо</span><span class="icon icon-download" aria-hidden="true"></span></button>`}
    </div>
    ${expanded ? `<div class="letter-fold letter-fold--middle">${paragraphs[1]}</div>
    <div class="letter-fold letter-fold--bottom">${paragraphs.slice(2).join('')}<p class="letter-signature">${escape(finale.signature)}</p><span class="letter-end-mark" aria-hidden="true"><span class="icon icon-heart" aria-hidden="true"></span></span></div>` : ''}
  </article>`;
}

export function openEnvelope(button, onOpen) {
  if (!button || button.disabled) return;
  button.disabled = true;
  button.classList.add('opening');
  button.setAttribute('aria-busy', 'true');
  if (reducedMotion()) onOpen();
  else setTimeout(onOpen, 760);
}

export function unfoldLetter(article, onDone) {
  if (!article || reducedMotion()) {
    onDone?.();
    return;
  }
  article.classList.add('is-unfolding');
  setTimeout(() => {
    article.classList.remove('is-unfolding');
    onDone?.();
  }, 1150);
}
