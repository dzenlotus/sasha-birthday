const toggle = document.querySelector('#music-toggle');
const panel = document.querySelector('#music-panel');
const close = document.querySelector('#music-close');
const status = document.querySelector('#music-status');
const watchLink = document.querySelector('#music-watch');
const volumeInput = document.querySelector('#music-volume');
const volumeValue = document.querySelector('#music-volume-value');
const VIDEO_ID = '2dBHTz6g5AM';

export let player;
let opened = false;
let ready = false;
let loading = false;
let needsFade = true;
let fade;
let loadTimer;
let targetVolume = Number(volumeInput.value);

function setStatus(state, message) {
  panel.dataset.state = state;
  status.textContent = message;
  toggle.classList.toggle('is-playing', state === 'playing');
}

function showError() {
  clearTimeout(loadTimer);
  clearInterval(fade);
  setStatus('error', 'Не удалось включить запись здесь. Её можно открыть на YouTube.');
  watchLink.hidden = false;
}

function fadeIn() {
  clearInterval(fade);
  player.setVolume(0);
  let volume = 0;
  fade = setInterval(() => {
    volume = Math.min(targetVolume, volume + Math.max(1, Math.ceil(targetVolume / 15)));
    player.setVolume(volume);
    if (volume === targetVolume) { needsFade = false; clearInterval(fade); }
  }, 80);
}

function createPlayer() {
  if (player || !opened) return;
  player = new window.YT.Player('music-video', {
    host: 'https://www.youtube-nocookie.com',
    width: '100%', height: 200, videoId: VIDEO_ID,
    playerVars: {
      autoplay: 0, controls: 1, playsinline: 1, hl: 'ru',
      origin: location.origin, loop: 1, playlist: VIDEO_ID,
    },
    events: {
      onReady: () => {
        clearTimeout(loadTimer);
        ready = true;
        player.getIframe().setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        player.getIframe().setAttribute('title', 'Chanakya — Rishab Rikhiram Sharma, Official Music Video');
        player.setVolume(0);
        if (opened) player.playVideo();
      },
      onStateChange: event => {
        if (!opened) {
          if (event.data === 1) player.pauseVideo();
          return;
        }
        if (event.data === 1) {
          setStatus('playing', 'Играет. Громкость можно изменить в плеере.');
          if (needsFade) fadeIn();
        } else if (event.data === 2 || event.data === 0) {
          clearInterval(fade);
          setStatus('paused', 'Музыка на паузе. Продолжить можно в плеере.');
        } else if (event.data === 3) {
          setStatus('loading', 'Загружаем музыку…');
        }
      },
      onAutoplayBlocked: () => {
        if (opened) setStatus('ready', 'Нажми Play в плеере, чтобы включить музыку.');
      },
      onError: showError,
    },
  });
}

function loadPlayer() {
  if (window.YT?.Player) return createPlayer();
  if (loading) return;
  loading = true;
  window.onYouTubeIframeAPIReady = () => { loading = false; createPlayer(); };
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.id = 'youtube-api';
  script.onerror = () => { loading = false; script.remove(); showError(); };
  document.head.append(script);
}

function closeMusic() {
  opened = false;
  clearInterval(fade);
  clearTimeout(loadTimer);
  if (ready) player.pauseVideo();
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Включить музыку Chanakya');
  toggle.classList.remove('is-playing');
  toggle.focus({ preventScroll: true });
}

export function startMusic() {
  if (opened) return;
  opened = true;
  needsFade = true;
  panel.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Выключить музыку и закрыть плеер');
  setStatus('loading', 'Загружаем музыку…');
  if (ready) { player.setVolume(0); player.playVideo(); }
  else {
    loadTimer = setTimeout(() => { if (opened && !ready) showError(); }, 12000);
    loadPlayer();
  }
}
toggle.addEventListener('click', () => opened ? closeMusic() : startMusic());
close.addEventListener('click', closeMusic);
volumeInput.addEventListener('input', () => {
  targetVolume = Number(volumeInput.value);
  volumeValue.textContent = `${targetVolume}%`;
  volumeInput.setAttribute('aria-valuetext', `${targetVolume}%`);
  if (ready) {
    clearInterval(fade);
    needsFade = false;
    player.setVolume(targetVolume);
  }
});
panel.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeMusic(); }
});
