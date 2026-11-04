/* After a real click on the card's main start button, run this in the browser console. */
async function runMusicAcceptance() {
  const { player } = await import(new URL('./music.js?v=3.5', document.baseURI).href);
  const checks = [];
  const check = (name, condition) => {
    checks.push({ name, passed: Boolean(condition) });
    if (!condition) throw new Error(`Music acceptance failed: ${name}`);
  };
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const panel = document.querySelector('#music-panel');
  check('Official music recording replaces the concert', player.getVideoData().video_id === '2dBHTz6g5AM');
  check('Actually playing', player.getPlayerState() === 1 && panel.dataset.state === 'playing');
  const frame = panel.querySelector('iframe');
  const rect = frame.getBoundingClientRect();
  check('Player remains rendered and at least 200 by 200', !panel.hidden && rect.width >= 200 && rect.height >= 200);
  check('Player uses absolute positioning', getComputedStyle(panel).position === 'absolute');
  check('Video is entirely outside the viewport', panel.getBoundingClientRect().right < 0);
  check('Volume control stays in the compact dock', Boolean(document.querySelector('.ambient-controls #music-volume')) && !document.querySelector('.music-volume').hidden);
  check('Playback container is not display none', getComputedStyle(panel).display !== 'none');
  await wait(1400);
  check('Fade reaches the selected 70 percent', player.getVolume() === 70);
  const slider = document.querySelector('#music-volume');
  slider.value = '85';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(150);
  check('Volume slider changes the actual player', player.getVolume() === 85);
  check('Volume percentage is readable', document.querySelector('#music-volume-value').textContent === '85%');
  const before = player.getCurrentTime();
  document.querySelector('.chapter-link[data-chapter="0"]').click();
  document.querySelector('[data-action="start"]').click();
  await wait(800);
  check('Same iframe across chapters', panel.querySelector('iframe') === frame);
  check('Playback continues rather than restarts', player.getCurrentTime() > before);
  check('Chosen volume survives changing chapters', player.getVolume() === 85);
  document.querySelector('#music-toggle').click();
  await wait(400);
  check('Closing really pauses', player.getPlayerState() === 2);
  check('Music stopped and control reset', panel.hidden && document.querySelector('#music-toggle').getAttribute('aria-pressed') === 'false');
  check('Volume control hides when music is off', document.querySelector('.music-volume').hidden);
  check('Focus returns to music button', document.activeElement.id === 'music-toggle');
  document.querySelector('.chapter-link[data-chapter="0"]').click();
  await wait(100);
  check('Ordinary navigation does not restart disabled music', panel.hidden && player.getPlayerState() === 2);
  check('Card has no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
  return { passed: checks.length, checks };
}
