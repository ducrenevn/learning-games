/**
 * Word alignment for the Detective editor. When the teacher edits a sentence, each marked word must either follow its
 * word to the new text or be sent to "Needs review". It never lands on a different word silently.
 *
 * The rule is deliberately strict. A mark follows a word only when the word is unchanged apart from surrounding
 * punctuation. Case stays significant ("machen" and "Machen" differ), and an edited ending is not the same word
 * ("habe" → "habt", "Haus" → "Hauses", "Haus" → "Haustür", "machen" → "Macht" all send the mark to review).
 * Recovery is one click: the teacher attaches the held mark to the intended word.
 */

/** The word without surrounding or inner punctuation, case kept: "Haus," → "Haus". A token with no letters or digits keeps itself. */
const key = (word: string) => word.replace(/[^\p{L}\p{N}]/gu, '') || word;

/** True when two tokens are the same word, ignoring punctuation only. */
export function sameWord(oldWord: string, newWord: string): boolean {
  return key(oldWord) === key(newWord);
}

function counts(keys: readonly string[]): Map<string, number> {
  const seen = new Map<string, number>();
  for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  return seen;
}

/** Longest common subsequence of identical keys, as [oldIndex, newIndex] pairs in reading order. */
function anchors(oldKeys: readonly string[], newKeys: readonly string[]): Array<[number, number]> {
  const n = oldKeys.length, m = newKeys.length;
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      best[i][j] = oldKeys[i] === newKeys[j] ? best[i + 1][j + 1] + 1 : Math.max(best[i + 1][j], best[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (oldKeys[i] === newKeys[j]) { pairs.push([i, j]); i++; j++; }
    else if (best[i + 1][j] >= best[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

export interface Alignment {
  /** For each new word, the old word index it inherits from, or null for a genuinely new word. */
  carried: Array<number | null>;
  /** Old word indexes that no new word inherited. */
  unmatched: number[];
}

/**
 * Matches identical words first. Between two matched words, an unmatched run is paired word by word only when the lengths
 * are equal and each pair is the same word. A word that occurs more than once in either sentence is trusted only when the
 * sentence is identical up to that word or from it to the end, because an insertion or deletion in the middle can move it
 * onto a different occurrence. Everything else (a deleted word, a split, a different word, a repeated word that moved) is left
 * unmatched, so the caller holds its mark for review.
 */
export function alignWords(oldWords: readonly string[], newWords: readonly string[]): Alignment {
  const oldKeys = oldWords.map(key), newKeys = newWords.map(key);
  const oldCount = counts(oldKeys), newCount = counts(newKeys);
  // A repeated word is the same occurrence when it sits in an identical head (same index from the start) or an identical
  // tail (same distance from the end). Anywhere else, the occurrence cannot be known from the text alone.
  let head = 0;
  while (head < oldKeys.length && head < newKeys.length && oldKeys[head] === newKeys[head]) head++;
  let tail = 0;
  while (tail < oldKeys.length - head && tail < newKeys.length - head
    && oldKeys[oldKeys.length - 1 - tail] === newKeys[newKeys.length - 1 - tail]) tail++;
  const reliable = (i: number, j: number) => {
    if ((oldCount.get(oldKeys[i]) ?? 0) === 1 && (newCount.get(newKeys[j]) ?? 0) === 1) return true;
    return (i === j && i < head) || (oldWords.length - i === newWords.length - j && oldWords.length - i <= tail);
  };

  const carried: Array<number | null> = newWords.map(() => null);
  const all = anchors(oldKeys, newKeys);
  for (const [i, j] of all) if (reliable(i, j)) carried[j] = i;

  let fromOld = 0, fromNew = 0;
  for (const [i, j] of [...all, [oldWords.length, newWords.length] as [number, number]]) {
    const oldRun = range(fromOld, i), newRun = range(fromNew, j);
    if (oldRun.length === newRun.length) {
      newRun.forEach((newIndex, k) => {
        const oldIndex = oldRun[k];
        if (sameWord(oldWords[oldIndex], newWords[newIndex]) && reliable(oldIndex, newIndex)) carried[newIndex] = oldIndex;
      });
    }
    fromOld = i + 1; fromNew = j + 1;
  }
  const taken = new Set(carried);
  return { carried, unmatched: oldWords.map((_, i) => i).filter(i => !taken.has(i)) };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);
}
