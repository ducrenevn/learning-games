import { describe, expect, it } from 'vitest';
import { fromMemoryPairs, legacyPairsToActivity, makeBlankMemory, memoryRoomIssue, toMemoryPairs, validateMemory } from '../src/games/memory/activity';
import { validateImported, serializeActivity } from '../src/shared/activities/portable';
import { makeLocalDeck } from '../src/games/memory/engine/local';

const sample = () => fromMemoryPairs([
  {left:'Haus',right:'house',category:'Substantive'},
  {left:'Tür',right:'door'},
  {left:'Tisch',right:'table'},
], 'Wortschatz');

describe('Memory frontend-only portable activity v1', () => {
  it('validates, exports and reimports exactly, without room/player state', () => {
    const a = sample();
    expect(validateMemory(a).issues).toEqual([]);
    const exported = serializeActivity(a,validateMemory);
    expect(exported.issues).toEqual([]);
    expect(validateImported(exported.value!, 'memory')).toEqual({value:a,issues:[]});
    expect(exported.value).not.toContain('hostToken');
    expect(exported.value).not.toContain('roomCode');
    expect(exported.value).not.toContain('score');
  });
  it('preserves legacy pair conversion and local engine without changing RPCs', () => {
    const converted = legacyPairsToActivity('Haus | house | Nomen\nTür | door\nTisch | table');
    expect(converted.issues).toEqual([]);
    const pairs = toMemoryPairs(converted.value!);
    expect(pairs).toEqual([{left:'Haus',right:'house',category:'Nomen'},{left:'Tür',right:'door'},{left:'Tisch',right:'table'}]);
    expect(makeLocalDeck(pairs,()=>0.25)).toHaveLength(6);
  });
  it('one pair works locally but requires a second pair for online room', () => {
    const a = sample();a.content.pairs=a.content.pairs.slice(0,1);
    expect(validateMemory(a).issues).toEqual([]);
    expect(memoryRoomIssue(a)).toBe('count');
    expect(memoryRoomIssue(sample())).toBeNull();
  });
  it('rejects unknown keys, malformed pair entries, duplicates and unsupported content', () => {
    const a = sample();
    expect(validateMemory({...a, hostToken:'secret'}).issues.map(x=>x.code)).toContain('unknown');
    expect(validateMemory({...a, content:{pairs:[...a.content.pairs, a.content.pairs[0]]}}).issues.map(x=>x.code)).toContain('duplicate');
    expect(validateMemory({...a, content:{pairs:[]}}).issues.map(x=>x.code)).toContain('count');
    expect(validateMemory({...a, content:{pairs: a.content.pairs.map(p=>({...p,roomCode:'SECRET'}))}}).issues.map(x=>x.code)).toContain('unknown');
    expect(validateImported(JSON.stringify(a),'sequence').issues.map(x=>x.code)).toContain('kind');
    expect(validateMemory({...a, schemaVersion:2}).issues.map(x=>x.code)).toContain('version');
  });
  it('fresh draft starts incomplete and cannot be exported without valid content', () => {
    expect(validateMemory(makeBlankMemory()).issues.length).toBeGreaterThan(0);
  });
});
