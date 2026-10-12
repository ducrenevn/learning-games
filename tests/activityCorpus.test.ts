import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateImported, serializeActivity } from '../src/shared/activities/portable';
import { parsePairs, validateForRoom } from '../src/games/memory/engine/pairs';
import type { ActivityType } from '../src/shared/activities/contract';

const root = fileURLToPath(new URL('./fixtures/wave-f/corpus/', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')) as {
  files: Array<{file:string;kind:ActivityType;expected:'valid'|'invalid';errorCode?:string}>;
};
const kinds:ActivityType[]=['sort','sequence','language-detective'];
const read=(file:string)=>readFileSync(resolve(root,file),'utf8');

describe('Wave F import corpus v1', () => {
  it('covers 5 accepted and 7 rejected fixtures per game',()=>{
    expect(new Set(manifest.files.map(x=>x.file)).size).toBe(36);
    for(const kind of kinds){
      expect(manifest.files.filter(x=>x.kind===kind && x.expected==='valid')).toHaveLength(5);
      expect(manifest.files.filter(x=>x.kind===kind && x.expected==='invalid')).toHaveLength(7);
    }
  });
  for(const fixture of manifest.files){
    it(fixture.expected+' '+fixture.file,()=>{
      const result=validateImported(read(fixture.file),fixture.kind);
      if(fixture.expected==='invalid'){
        expect(result.value).toBeUndefined();
        expect(result.issues.map(x=>x.code)).toContain(fixture.errorCode);
      } else {
        expect(result.issues).toEqual([]);
        const exported=serializeActivity(result.value,v=>validateImported(JSON.stringify(v),fixture.kind));
        expect(exported.issues).toEqual([]);
        const next=validateImported(exported.value!,fixture.kind);
        expect(next.issues).toEqual([]);
        expect(next.value).toEqual(result.value);
      }
    });
  }
  it('rejects all valid files in a wrong game',()=>{
    for(const f of manifest.files.filter(x=>x.expected==='valid')){
      for(const kind of kinds.filter(k=>k!==f.kind))
        expect(validateImported(read(f.file),kind).issues.map(x=>x.code)).toContain('kind');
    }
  });
  it('rejects malformed and >128-KiB inputs',()=>{
    for(const kind of kinds){
      expect(validateImported('{broken',kind).issues[0].code).toBe('json');
      expect(validateImported('x'.repeat(128*1024+1),kind).issues[0].code).toBe('size');
    }
  });
  it('parses Memory legacy pair text without JSON adapter',()=>{
    const r=parsePairs(read('memory-legacy/01-german-vocabulary.txt'));
    expect(r.errors).toEqual([]);
    expect(r.pairs).toHaveLength(6);
    expect(validateForRoom(r)).toBeNull();
  });
});
