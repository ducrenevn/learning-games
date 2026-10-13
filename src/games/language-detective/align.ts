/**
 * Word alignment for the Detective editor. When the teacher edits a sentence, each marked word must either follow its
 * word to the new text or be sent to "Needs review". It never lands on a different word silently.
 */

/** Letters and digits only, lower case: "Haus," and "haus" share a core. */
const core = (word: string) => word.toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]/gu, '');

/**
 * True when a new word is the same word as the old one at its position: identical once punctuation and case are ignored,
 * or an edit of its ending that keeps a shared stem ("Haus" → "Hauses"). A different word ("Haus" → "Hund") is not.
 */
export function sameWord(oldWord: string, newWord: string): boolean {
  const a = core(oldWord), b = core(newWord);
  if (a === '' || b === '') return oldWord === newWord;
  if (a === b) return true;
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared++;
  return shared >= Math.min(3, a.length, b.length);
}

/** Longest common subsequence of identical tokens, as [oldIndex, newIndex] pairs in reading order. */
function anchors(oldWords: readonly string[], newWords: readonly string[]): Array<[number, number]> {
  const n = oldWords.length, m = newWords.length;
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      best[i][j] = oldWords[i] === newWords[j] ? best[i + 1][j + 1] + 1 : Math.max(best[i + 1][j], best[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (oldWords[i] === newWords[j]) { pairs.push([i, j]); i++; j++; }
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
 * are equal and each pair is the same word (sameWord). Any other change — a deleted word, a split, a different word — is
 * left unmatched, so the caller can hold its mark for review.
 */
export function alignWords(oldWords: readonly string[], newWords: readonly string[]): Alignment {
  const carried: Array<number | null> = newWords.map(() => null);
  const pairs = anchors(oldWords, newWords);
  for (const [i, j] of pairs) carried[j] = i;
  let fromOld = 0, fromNew = 0;
  for (const [i, j] of [...pairs, [oldWords.length, newWords.length] as [number, number]]) {
    const oldRun = range(fromOld, i), newRun = range(fromNew, j);
    if (oldRun.length === newRun.length) {
      newRun.forEach((newIndex, k) => { if (sameWord(oldWords[oldRun[k]], newWords[newIndex])) carried[newIndex] = oldRun[k]; });
    }
    fromOld = i + 1; fromNew = j + 1;
  }
  const taken = new Set(carried);
  return { carried, unmatched: oldWords.map((_, i) => i).filter(i => !taken.has(i)) };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);
}
