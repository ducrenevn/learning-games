import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ActivityType } from '../src/shared/activities/contract';
import { validateSort } from '../src/games/sort/model';
import { validateSequence } from '../src/games/sequence/model';
import { validateDetective } from '../src/games/language-detective/model';
import { validateMemory } from '../src/games/memory/activity';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';

// Acceptance fixtures for owner testing. They are schema-validated (this test), NOT classroom-tested, and are not app presets.
const dir = join(__dirname, 'fixtures', 'wave-f');
const validators = { sort: validateSort, sequence: validateSequence, 'language-detective': validateDetective, memory: validateMemory };
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();

describe('Wave F acceptance fixtures', () => {
  it('ships one fixture per game plus a clean no-error passage', () => {
    expect(files).toEqual([
      'language-detective_alles-richtig.json', 'language-detective_finde-den-fehler.json',
      'sequence_gespraech-ordnen.json', 'sort_artikel-sortieren.json',
    ]);
  });
  for (const file of files) {
    it(file + ' validates and re-exports to the identical canonical file', () => {
      // Checkouts are CRLF on Windows (core.autocrlf); the canonical export is LF.
      const text = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
      const type = file.slice(0, file.indexOf('_')) as ActivityType;
      const parsed = validateImported(text, type);
      expect(parsed.issues).toEqual([]);
      const exported = serializeActivity(parsed.value as never, validators[type] as never);
      expect(exported.issues).toEqual([]);
      expect(exported.value).toBe(text);
      expect(JSON.parse(text).id).toBe(file.slice(file.indexOf('_') + 1, -'.json'.length)); // file name follows <type>_<id>.json
    });
  }
});
