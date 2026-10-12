import { describe, expect, it } from 'vitest';
import { MAX_BYTES, parseJson, type Issue } from '../src/shared/activities/contract';
import { messages, issueText } from '../src/shared/activities/i18n';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';
import { validateSort } from '../src/games/sort/model';
import { validateSequence } from '../src/games/sequence/model';
import { validateDetective } from '../src/games/language-detective/model';
import { detectiveCleanFixture, detectiveFixture, sequenceFixture, sortFixture } from './helpers/fixtures';

const codes = (issues: Issue[]) => issues.map(i => i.code);
const hasIssue = (issues: Issue[], path: string, code?: string) => issues.some(i => i.path === path && (!code || i.code === code));

describe('shared text safety', () => {
  it('rejects control characters but allows tab and newlines in authored text', () => {
    const a = sortFixture();
    a.title = 'A\u0000B';
    expect(hasIssue(validateSort(a).issues, 'title', 'control')).toBe(true);
    for (const bad of ['\u0007', '\u001b[31m', '\u007f', '\u0085', '\u009f']) {
      const s = sequenceFixture(); s.content.prompt = 'x' + bad + 'y';
      expect(hasIssue(validateSequence(s).issues, 'content.prompt', 'control'), JSON.stringify(bad)).toBe(true);
    }
    const ok = sequenceFixture(); ok.content.prompt = 'Zeile 1\nZeile 2\tTab\r\nZeile 3';
    expect(validateSequence(ok).issues).toEqual([]);
  });
  it('rejects unpaired surrogates but keeps emoji, ZWJ sequences and decomposed accents', () => {
    const lone = sortFixture(); lone.title = 'x\ud800y';
    expect(hasIssue(validateSort(lone).issues, 'title', 'control')).toBe(true);
    const lone2 = sortFixture(); lone2.title = 'x\udc00y';
    expect(hasIssue(validateSort(lone2).issues, 'title', 'control')).toBe(true);
    const fine = sortFixture();
    fine.content.items[0].text = 'Äpfel 🍎 👩‍👩‍👧 Bär Straße';
    expect(validateSort(fine).issues).toEqual([]);
  });
  it('treats invisible-only strings as blank', () => {
    for (const blank of ['​​', ' ', '⁠', '﻿', '­', '‎', ' \t\n ']) {
      const a = sequenceFixture(); a.content.items[0].text = blank;
      expect(hasIssue(validateSequence(a).issues, 'content.items[0].text', 'length'), JSON.stringify(blank)).toBe(true);
    }
  });
  it('rejects markup and script-like text in every authored field', () => {
    const payloads = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', 'x</p>', 'javascript:alert(1)', 'JaVaScRiPt :alert(1)', 'data:text/html,<b>'];
    for (const p of payloads) {
      const s = sortFixture(); s.content.items[1].explanation = p;
      expect(hasIssue(validateSort(s).issues, 'content.items[1].explanation', 'markup'), p).toBe(true);
      const d = detectiveFixture(); d.content.issues[0].correction = p;
      expect(hasIssue(validateDetective(d).issues, 'content.issues[0].correction', 'markup'), p).toBe(true);
    }
    const harmless = sortFixture(); harmless.content.items[0].text = 'a < b und c > d, 5<6, 3 > 2';
    expect(validateSort(harmless).issues).toEqual([]);
  });
  it('validates a worst-case "<a<a<a…" string in linear time', () => {
    const a = sortFixture();
    a.title = '<a'.repeat(60000);
    const start = performance.now();
    const result = validateSort(a);
    const elapsed = performance.now() - start;
    expect(codes(result.issues)).toContain('length');
    expect(elapsed).toBeLessThan(150);
  });
});

describe('shared envelope rules', () => {
  const base = () => sortFixture();
  it('accepts BCP-47-like target languages and rejects malformed ones', () => {
    for (const ok of ['de', 'vi', 'en', 'de-DE', 'zh-Hans-CN', 'fil', 'es-419']) {
      const a = base(); a.targetLanguage = ok;
      expect(validateSort(a).issues, ok).toEqual([]);
    }
    for (const bad of ['d', 'german', 'de_DE', 'de-', '-de', 'de DE', 'de-<b>', '1234', 'de-DE-xxxxxxxxx-a-b-c-d', '']) {
      const a = base(); a.targetLanguage = bad;
      expect(validateSort(a).issues.length, JSON.stringify(bad)).toBeGreaterThan(0);
    }
  });
  it('enforces the id slug rule and 64 character limit', () => {
    for (const ok of ['a', 'a1', 'a-b-c', '0-9', 'x'.repeat(64)]) {
      const a = base(); a.id = ok; expect(validateSort(a).issues, ok).toEqual([]);
    }
    for (const bad of ['', 'A', 'a b', 'a_b', '-a', 'a-', 'a--b', 'ä', '__proto__', 'x'.repeat(65), 'a/b', '../etc']) {
      const a = base(); a.id = bad; expect(validateSort(a).issues.length, JSON.stringify(bad)).toBeGreaterThan(0);
    }
  });
  it('enforces title and instructions boundaries by code points, not UTF-16 units', () => {
    const a = base();
    a.title = '🍎'.repeat(120); a.instructions = '🍎'.repeat(2000);
    expect(validateSort(a).issues).toEqual([]);
    a.title = '🍎'.repeat(121);
    expect(hasIssue(validateSort(a).issues, 'title', 'length')).toBe(true);
    a.title = 'ok'; a.instructions = '🍎'.repeat(2001);
    expect(hasIssue(validateSort(a).issues, 'instructions', 'length')).toBe(true);
  });
  it('rejects wrong format, version, game type and non-object roots', () => {
    const wrong = (patch: object) => validateSort({ ...base(), ...patch }).issues;
    expect(hasIssue(wrong({ format: 'other' }), 'format', 'format')).toBe(true);
    expect(hasIssue(wrong({ schemaVersion: 2 }), 'schemaVersion', 'version')).toBe(true);
    expect(hasIssue(wrong({ schemaVersion: '1' }), 'schemaVersion', 'version')).toBe(true);
    expect(hasIssue(wrong({ activityType: 'sequence' }), 'activityType', 'kind')).toBe(true);
    for (const root of [null, undefined, 1, 'x', true, [], [base()]]) {
      expect(codes(validateSort(root).issues), String(root)).toEqual(['object']);
    }
    expect(hasIssue(wrong({ content: null }), 'content', 'object')).toBe(true);
    expect(hasIssue(wrong({ content: [] }), 'content', 'object')).toBe(true);
  });
  it('reports missing required fields as required, including arrays', () => {
    const d = detectiveFixture() as unknown as Record<string, unknown>;
    delete (d.content as Record<string, unknown>).issues;
    delete (d.content as Record<string, unknown>).segments;
    const found = validateDetective(d).issues;
    expect(hasIssue(found, 'content.issues', 'required')).toBe(true);
    expect(hasIssue(found, 'content.segments', 'required')).toBe(true);
    const s = sortFixture() as unknown as Record<string, unknown>;
    delete s.id; delete s.title;
    expect(codes(validateSort(s).issues)).toContain('required');
  });
  it('rejects every unknown key at envelope, content and item level', () => {
    const sort = (mut: (a: ReturnType<typeof sortFixture>) => void) => { const a = sortFixture(); mut(a); return validateSort(a).issues; };
    expect(hasIssue(sort(a => Object.assign(a, { extra: 1 })), 'extra', 'unknown')).toBe(true);
    expect(hasIssue(sort(a => Object.assign(a.content, { extra: 1 })), 'content.extra', 'unknown')).toBe(true);
    expect(hasIssue(sort(a => Object.assign(a.content.items[2], { score: 5 })), 'content.items[2].score', 'unknown')).toBe(true);
    expect(hasIssue(sort(a => Object.assign(a.content.categories[1], { color: 'red' })), 'content.categories[1].color', 'unknown')).toBe(true);
    const seq = sequenceFixture(); Object.assign(seq.content.items[0], { hint: 'x' });
    expect(hasIssue(validateSequence(seq).issues, 'content.items[0].hint', 'unknown')).toBe(true);
    const det = detectiveFixture(); Object.assign(det.content.issues[1], { points: 3 });
    expect(hasIssue(validateDetective(det).issues, 'content.issues[1].points', 'unknown')).toBe(true);
    // session / learner state must never be smuggled into a portable file
    for (const key of ['score', 'answers', 'attempts', 'roomCode', 'token', 'player', 'placements', 'selected']) {
      expect(hasIssue(sort(a => Object.assign(a, { [key]: 1 })), key, 'unknown'), key).toBe(true);
    }
  });
});

describe('prototype pollution and hostile JSON', () => {
  it('rejects __proto__, constructor and prototype keys without polluting Object.prototype', () => {
    for (const where of ['', 'content', 'content.items.0', 'content.categories.0']) {
      for (const key of ['__proto__', 'constructor', 'prototype']) {
        const doc = JSON.parse(JSON.stringify(sortFixture())) as Record<string, any>;
        const target = where ? where.split('.').reduce((o, k) => o[k], doc) : doc;
        // defineProperty makes "__proto__" an OWN enumerable key, so it is serialized into the file text exactly as an attacker's file would carry it.
        Object.defineProperty(target, key, { value: { polluted: true }, enumerable: true, configurable: true, writable: true });
        const text = JSON.stringify(doc);
        expect(text).toContain('"' + key + '":{"polluted":true}');
        const parsed = validateImported(text, 'sort');
        expect(parsed.issues.some(i => i.code === 'unknown'), where + ' ' + key).toBe(true);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
      }
    }
  });
  it('accepts items whose ids collide with Object.prototype names without crashing', () => {
    const a = sortFixture();
    a.content.items[0].id = 'constructor';
    expect(validateSort(a).issues).toEqual([]);
    const text = serializeActivity(a, validateSort).value!;
    expect(validateImported(text, 'sort').issues).toEqual([]);
  });
  it('handles deeply nested and huge-array JSON within the size cap without throwing', () => {
    const deep = '['.repeat(60000) + ']'.repeat(60000);
    expect(deep.length).toBeLessThanOrEqual(MAX_BYTES);
    expect(() => validateImported(deep, 'sort')).not.toThrow();
    expect(validateImported(deep, 'sort').issues.length).toBeGreaterThan(0);
    const itemsFlood = JSON.stringify({ ...sortFixture(), content: { categories: [], items: new Array(60000).fill(0) } });
    expect(itemsFlood.length).toBeLessThanOrEqual(MAX_BYTES);
    const start = performance.now();
    const flood = validateImported(itemsFlood, 'sort');
    expect(performance.now() - start).toBeLessThan(500);
    expect(flood.issues.length).toBeGreaterThan(0);
    expect(flood.issues.length).toBeLessThan(400); // bounded error list, not one error per element
  });
  it('rejects non-JSON, truncated JSON and NaN/Infinity literals', () => {
    for (const text of ['', ' ', 'undefined', '{', '{"a":}', "{'a':1}", '{"a":NaN}', '{"a":Infinity}', '﻿{}']) {
      expect(parseJson(text).issues[0]?.code, JSON.stringify(text)).toBe('json');
    }
  });
});

describe('file size limit', () => {
  const pad = (bytes: number) => {
    const json = '{"x":""}';
    return json.slice(0, 6) + ' '.repeat(bytes - json.length) + json.slice(6);
  };
  it('accepts exactly 128 KiB of UTF-8 and rejects one byte more', () => {
    expect(new TextEncoder().encode(pad(MAX_BYTES)).byteLength).toBe(MAX_BYTES);
    expect(parseJson(pad(MAX_BYTES)).issues).toEqual([]);
    expect(parseJson(pad(MAX_BYTES + 1)).issues[0].code).toBe('size');
  });
  it('counts bytes, not characters', () => {
    const multibyte = '{"x":"' + 'ä'.repeat(MAX_BYTES / 2) + '"}'; // fewer than 128K chars, more than 128 KiB bytes
    expect(multibyte.length).toBeLessThan(MAX_BYTES);
    expect(parseJson(multibyte).issues[0].code).toBe('size');
  });
  it('refuses to export a valid activity whose canonical file would exceed 128 KiB', () => {
    const d = detectiveFixture();
    const emoji = (n: number) => '🍎'.repeat(n);
    d.title = emoji(120); d.instructions = emoji(2000); d.content.prompt = emoji(1000); d.content.summary = emoji(1000);
    d.content.segments = Array.from({ length: 80 }, (_, i) => ({ id: 's' + (i + 1), text: emoji(160) }));
    d.content.issues = Array.from({ length: 12 }, (_, i) => ({ segmentId: 's' + (i + 1), correction: emoji(300), explanation: emoji(1000) }));
    // distinct text is not required for detective segments
    expect(validateDetective(d).issues).toEqual([]);
    const out = serializeActivity(d, validateDetective);
    expect(out.value).toBeUndefined();
    expect(out.issues).toEqual([{ path: 'file', code: 'size' }]);
  });
});

describe('round trip stability', () => {
  it('export → import → export is byte-identical for every game, with Unicode and optional fields', () => {
    const sort = sortFixture(); sort.content.items[0].text = 'Äpfel 🍎 Straße'; sort.targetLanguage = 'de-DE';
    const cases = [
      [sort, validateSort, 'sort'],
      [sequenceFixture(), validateSequence, 'sequence'],
      [detectiveFixture(), validateDetective, 'language-detective'],
      [detectiveCleanFixture(), validateDetective, 'language-detective'],
    ] as const;
    for (const [activity, validator, type] of cases) {
      const first = serializeActivity(activity as never, validator as never);
      expect(first.issues).toEqual([]);
      const imported = validateImported(first.value!, type);
      expect(imported.issues).toEqual([]);
      expect(imported.value).toEqual(activity);
      const second = serializeActivity(imported.value as never, validator as never);
      expect(second.value).toBe(first.value);
    }
  });
  it('omits optional fields that were cleared instead of exporting empty strings', () => {
    const s = sortFixture(); delete s.content.items[0].explanation;
    expect(serializeActivity(s, validateSort).value).not.toContain('"explanation": ""');
    const e = sortFixture(); e.content.items[0].explanation = '';
    expect(hasIssue(validateSort(e).issues, 'content.items[0].explanation', 'length')).toBe(true);
  });
  it('preserves authored order of every array on export', () => {
    const seq = sequenceFixture();
    const out = validateImported(serializeActivity(seq, validateSequence).value!, 'sequence');
    expect((out.value as typeof seq).content.items.map(i => i.id)).toEqual(['step-1', 'step-2', 'step-3', 'step-4']);
  });
  it('rejects a file belonging to another game with a kind error', () => {
    const sortText = serializeActivity(sortFixture(), validateSort).value!;
    expect(validateImported(sortText, 'sequence').issues.some(i => i.code === 'kind')).toBe(true);
    expect(validateImported(sortText, 'language-detective').issues.some(i => i.code === 'kind')).toBe(true);
  });
});

describe('interface messages', () => {
  const locales = ['de', 'en', 'vi'] as const;
  it('has identical keys in every locale and no empty strings', () => {
    const keys = (l: typeof locales[number]) => Object.keys(messages[l]).sort();
    expect(keys('de')).toEqual(keys('en'));
    expect(keys('vi')).toEqual(keys('en'));
    for (const l of locales) for (const [k, v] of Object.entries(messages[l])) {
      if (typeof v === 'string') expect(v.trim().length, l + '.' + k).toBeGreaterThan(0);
    }
  });
  it('keeps the same {placeholders} in every locale', () => {
    const holders = (s: unknown) => (String(s).match(/\{[a-zA-Z]+\}/g) ?? []).sort().join();
    const flat = (l: typeof locales[number]) => messages[l] as unknown as Record<string, unknown>;
    for (const k of Object.keys(messages.en)) {
      if (k === 'problems') continue;
      for (const l of ['de', 'vi'] as const) expect(holders(flat(l)[k]), l + '.' + k).toBe(holders(flat('en')[k]));
    }
  });
  it('translates every validation code in every locale', () => {
    const all = Object.keys(messages.en.problems);
    for (const l of locales) {
      expect(Object.keys(messages[l].problems).sort()).toEqual([...all].sort());
      for (const code of all) expect(issueText({ path: 'x', code: code as never }, l).length).toBeGreaterThan(4);
    }
  });
});
