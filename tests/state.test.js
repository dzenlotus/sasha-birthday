import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  initialProgress,
  restoreProgress,
  saveProgress,
  completeChapter,
  matchesDance,
} from '../state.js';

function memoryStorage(value = null) {
  const values = new Map(value === null ? [] : [[STORAGE_KEY, value]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, nextValue) => values.set(key, nextValue),
  };
}

test('a fresh postcard opens only the cover', () => {
  const expected = { chapter: 0, unlocked: 0, completed: [] };
  assert.deepEqual(initialProgress(), expected);
  assert.deepEqual(restoreProgress(memoryStorage()), expected);
});

test('cover and four tasks unlock chapters in order through the letter', () => {
  let progress = initialProgress();
  for (let chapter = 0; chapter <= 4; chapter++) {
    const before = structuredClone(progress);
    const completed = completeChapter(progress, chapter);
    assert.equal(completed.chapter, chapter, 'completion leaves navigation to the caller');
    assert.equal(completed.unlocked, chapter + 1);
    assert.deepEqual(completed.completed, Array.from({ length: chapter }, (_, i) => i + 1));
    assert.deepEqual(progress, before, 'completing a task does not mutate the previous state');
    progress = { ...completed, chapter: chapter + 1 };
  }
  assert.deepEqual(progress, { chapter: 5, unlocked: 5, completed: [1, 2, 3, 4] });
});

test('locked chapters cannot be completed', () => {
  const cover = initialProgress();
  assert.deepEqual(completeChapter(cover, 1), cover);
  const rhythm = { ...completeChapter(cover, 0), chapter: 1 };
  assert.deepEqual(completeChapter(rhythm, 2), rhythm);
});

test('returning to a completed task preserves access and does not duplicate completion', () => {
  const progress = { chapter: 1, unlocked: 5, completed: [1, 2, 3, 4] };
  assert.deepEqual(completeChapter(progress, 1), progress);
  assert.deepEqual(completeChapter(progress, 0), progress);
});

test('storage roundtrip preserves a returned-to chapter and all opened chapters', () => {
  const storage = memoryStorage();
  const progress = { chapter: 1, unlocked: 4, completed: [1, 2, 3] };
  saveProgress(storage, progress);
  assert.deepEqual(restoreProgress(storage), progress);
});

test('unavailable storage leaves navigation and task progress usable in memory', () => {
  const blockedStorage = {
    getItem() { throw new Error('Reading storage is blocked'); },
    setItem() { throw new Error('Writing storage is blocked'); },
  };
  let progress = restoreProgress(blockedStorage);
  assert.deepEqual(progress, initialProgress());
  for (let chapter = 0; chapter <= 4; chapter++) {
    progress = { ...completeChapter(progress, chapter), chapter: chapter + 1 };
    assert.doesNotThrow(() => saveProgress(blockedStorage, progress));
  }
  assert.deepEqual(progress, { chapter: 5, unlocked: 5, completed: [1, 2, 3, 4] });
});

test('throwing storage method accessors also fall back safely', () => {
  const storage = {
    get getItem() { throw new Error('Storage read accessor failed'); },
    get setItem() { throw new Error('Storage write accessor failed'); },
  };
  assert.deepEqual(restoreProgress(storage), initialProgress());
  assert.doesNotThrow(() => saveProgress(storage, initialProgress()));
});

test('unreadable or invalid saved progress falls back to the cover', () => {
  const invalidValues = [
    '{',
    'null',
    '{}',
    JSON.stringify({ chapter: 2, unlocked: 1, completed: [] }),
    JSON.stringify({ chapter: 0, unlocked: 6, completed: [] }),
    JSON.stringify({ chapter: -1, unlocked: 0, completed: [] }),
    JSON.stringify({ chapter: 0, unlocked: 1.5, completed: [] }),
    JSON.stringify({ chapter: 0, unlocked: 0, completed: 'none' }),
  ];
  for (const value of invalidValues) {
    assert.deepEqual(restoreProgress(memoryStorage(value)), initialProgress(), value);
  }
});

test('dance requires the exact four symbols in the specified order', () => {
  assert.equal(matchesDance(['lotus', 'sun', 'heart', 'lotus']), true);
  for (const sequence of [
    [],
    ['lotus', 'sun', 'heart'],
    ['lotus', 'sun', 'heart', 'lotus', 'sun'],
    ['sun', 'lotus', 'heart', 'lotus'],
    ['lotus', 'sun', 'heart', 'heart'],
  ]) {
    assert.equal(matchesDance(sequence), false, JSON.stringify(sequence));
  }
});
