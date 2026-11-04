export const STORAGE_KEY = 'sasha-sunshine-v1';
export const DANCE_SEQUENCE = ['lotus', 'sun', 'heart', 'lotus'];

export function initialProgress() {
  return { chapter: 0, unlocked: 0, completed: [] };
}

export function restoreProgress(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!value || !Number.isInteger(value.unlocked) || value.unlocked < 0 || value.unlocked > 5 || !Number.isInteger(value.chapter) || value.chapter < 0 || value.chapter > value.unlocked || !Array.isArray(value.completed)) return initialProgress();
    return { chapter: value.chapter, unlocked: value.unlocked, completed: [...new Set(value.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 4 && n < value.unlocked))] };
  } catch { return initialProgress(); }
}

export function saveProgress(storage, progress) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* Private browsing can keep progress in memory. */ }
}

export function completeChapter(progress, chapter) {
  if (chapter < 0 || chapter > 4 || chapter > progress.unlocked) return progress;
  return {
    ...progress,
    unlocked: Math.max(progress.unlocked, chapter + 1),
    completed: chapter === 0 ? progress.completed : [...new Set([...progress.completed, chapter])],
  };
}

export function matchesDance(sequence) {
  return sequence.length === DANCE_SEQUENCE.length && sequence.every((symbol, index) => symbol === DANCE_SEQUENCE[index]);
}
