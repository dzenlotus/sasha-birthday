/* After opening music with a real click, run this function in the browser console. */
async function runMusicAcceptance() {
  const { player } = await import(new URL('./music.js', document.baseURI).href);
  const checks = [];
  const check = (name, condition) => {
    checks.push({ name, passed: Boolean(condition) });
    if (!condition) throw new Error(`Music acceptance failed: ${name}`);
  };
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const panel = document.querySelector('#music-panel');
  check('Correct recording', player.getVideoData().video_id === 'KBYSpR8N6pc');
  check('Actually playing', player.getPlayerState() === 1 && panel.dataset.state === 'playing');
  const frame = panel.querySelector('iframe');
  const rect = frame.getBoundingClientRect();
  check('Player visible and at least 200 by 200', !panel.hidden && rect.width >= 200 && rect.height >= 200);
  check('Player above decorative petals', Number(getComputedStyle(panel).zIndex) > 25);
  await wait(1400);
  check('Quiet fade reaches 30 percent', player.getVolume() === 30);
  const before = player.getCurrentTime();
  document.querySelector('.chapter-link[data-chapter="0"]').click();
  document.querySelector('[data-action="start"]').click();
  await wait(800);
  check('Same iframe across chapters', panel.querySelector('iframe') === frame);
  check('Playback continues rather than restarts', player.getCurrentTime() > before);
  document.querySelector('#music-close').click();
  await wait(400);
  check('Closing really pauses', player.getPlayerState() === 2);
  check('Panel closed and control reset', panel.hidden && document.querySelector('#music-toggle').getAttribute('aria-expanded') === 'false');
  check('Focus returns to music button', document.activeElement.id === 'music-toggle');
  check('Card has no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
  return { passed: checks.length, checks };
}
