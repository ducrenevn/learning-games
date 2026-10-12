import type { SortActivity } from '../../src/games/sort/model';
import type { SequenceActivity } from '../../src/games/sequence/model';
import type { DetectiveActivity } from '../../src/games/language-detective/model';

/** Fresh, valid activities for each game. Every call returns new objects so tests may mutate them freely. */
export function sortFixture(): SortActivity {
  return {
    format: 'learning-games.activity', schemaVersion: 1, activityType: 'sort',
    id: 'artikel-sortieren', title: 'Artikel sortieren', targetLanguage: 'de', instructions: 'Ordne die Nomen dem Artikel zu.',
    content: {
      categories: [{ id: 'der', label: 'der' }, { id: 'die', label: 'die' }, { id: 'das', label: 'das' }],
      items: [
        { id: 'tisch', text: 'Tisch', categoryId: 'der', explanation: 'Maskulin: der Tisch.' },
        { id: 'lampe', text: 'Lampe', categoryId: 'die', explanation: 'Feminin: die Lampe.' },
        { id: 'buch', text: 'Buch', categoryId: 'das' },
        { id: 'stuhl', text: 'Stuhl', categoryId: 'der' },
      ],
    },
  };
}
export function sequenceFixture(): SequenceActivity {
  return {
    format: 'learning-games.activity', schemaVersion: 1, activityType: 'sequence',
    id: 'gespraech-ordnen', title: 'Gespräch ordnen', targetLanguage: 'de', instructions: 'Bringe die Sätze in Reihenfolge.',
    content: {
      prompt: 'Ordne ein Telefongespräch beim Arzt.',
      items: [
        { id: 'step-1', text: 'Guten Tag, Praxis Müller.' },
        { id: 'step-2', text: 'Ich möchte einen Termin.' },
        { id: 'step-3', text: 'Wann haben Sie Zeit?' },
        { id: 'step-4', text: 'Am Dienstag um zehn Uhr.' },
      ],
      explanation: 'Begrüßung, Anliegen, Terminfrage, Antwort.',
    },
  };
}
export function detectiveFixture(): DetectiveActivity {
  return {
    format: 'learning-games.activity', schemaVersion: 1, activityType: 'language-detective',
    id: 'finde-den-fehler', title: 'Finde den Fehler', targetLanguage: 'de', instructions: 'Markiere die Fehler.',
    content: {
      prompt: 'Lies den Satz und markiere Fehler.',
      segments: ['Ich', 'haben', 'gestern', 'dem', 'Film', 'gesehen.'].map((text, i) => ({ id: 's' + (i + 1), text })),
      issues: [
        { segmentId: 's2', correction: 'habe', explanation: 'Verb mit ich: habe.' },
        { segmentId: 's4', correction: 'den', explanation: 'Akkusativ: den Film.' },
      ],
      summary: 'Achte auf Verbendung und Kasus.',
    },
  };
}
export function detectiveCleanFixture(): DetectiveActivity {
  const a = detectiveFixture();
  a.content.issues = [];
  delete a.content.summary;
  return a;
}
