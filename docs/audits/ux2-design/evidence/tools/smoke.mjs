import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

// Browser smoke for UX-2. Local dev server only; no hosted Memory rooms, no backend writes.
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = path.resolve(process.env.OUT || 'shots-smoke');
const FIX = 'd:/Local Files/Apps_Websites/learning-games/tests/fixtures/wave-f/corpus/valid';
const BIG_SORT = path.resolve('big-sort.json');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok: !!ok, extra });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
};
async function newPage(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') p.errors.push(m.text() + ' @' + m.location().url); });
  return p;
}
const overflowX = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function importFile(p, route, file) {
  await p.goto(BASE + route);
  await p.getByRole('button', { name: /Aktivität importieren/ }).click();
  await p.locator('input[type=file]').setInputFiles(file);
  await p.getByText('Datei gültig').waitFor();
  await p.getByRole('button', { name: 'Im Editor öffnen' }).click();
}
async function importAndPlay(p, route, file, mode = 'Ausprobieren') {
  await importFile(p, route, file);
  await p.getByRole('button', { name: mode }).first().click();
  await p.locator('.activity-ux-play').waitFor({ timeout: 5000 });
}

// 1. Four-game viewport matrix (play screen) ----------------------------------------
const VIEWPORTS = [[1440, 900, 'desk'], [1024, 768, 'tab-l'], [768, 1024, 'tab'], [390, 844, 'm390'], [360, 740, 'm360'], [1280, 560, 'short']];
const GAMES = [
  ['/games/sort', 'sort/01-artikel-im-alltag.json', 'sort'],
  ['/games/sequence', 'sequence/01-termin-vereinbaren.json', 'sequence'],
  ['/games/language-detective', 'language-detective/06-drei-kurze-saetze.json', 'detective'],
];
for (const [w, h, vp] of VIEWPORTS) {
  for (const [route, file, game] of GAMES) {
    const p = await newPage(w, h);
    try {
      await importAndPlay(p, route, path.join(FIX, file));
      const over = await overflowX(p);
      check(`${game} play @${w}x${h} no horizontal scroll`, over <= 1, `overflow ${over}px`);
      check(`${game} play @${w}x${h} no page errors`, p.errors.length === 0, p.errors.join(' | '));
      await p.screenshot({ path: path.join(OUT, `matrix-${vp}-${game}.png`) });
    } catch (e) {
      check(`${game} play @${w}x${h} runs`, false, String(e.message).split('\n')[0]);
      await p.screenshot({ path: path.join(OUT, `matrix-${vp}-${game}-FAILED.png`) }).catch(() => {});
    }
    await p.context().close();
  }
}

// 2. Mobile Sort: categories left, scrollable bank right, info popover, tap-to-place --
for (const [w, h] of [[390, 844], [360, 740]]) {
  const p = await newPage(w, h);
  await importAndPlay(p, '/games/sort', path.join(FIX, 'sort/01-artikel-im-alltag.json'));
  const bins = await p.locator('.sort-bins').boundingBox();
  const bank = await p.locator('.sort-bank-chips').boundingBox();
  const bankOverflow = await p.locator('.sort-bank').evaluate(el => getComputedStyle(el).overflowY);
  check(`sort @${w} categories left of bank`, bins && bank && bins.x + bins.width <= bank.x + 1, `bins ${bins && Math.round(bins.x)}..${bins && Math.round(bins.x + bins.width)} bank x ${bank && Math.round(bank.x)}`);
  check(`sort @${w} bank is its own scroll column`, ['auto', 'scroll'].includes(bankOverflow), bankOverflow);
  const before = await p.locator('.sort-bank-chips .sort-chip').count();
  await p.getByRole('button', { name: 'Bedienungshinweis' }).click();
  const box = await p.getByText(/Karte antippen/).first().boundingBox();
  check(`sort @${w} info popover opens and stays on screen`, box && box.x >= 0 && box.x + box.width <= w + 1, box ? `x ${Math.round(box.x)} w ${Math.round(box.width)}` : 'not visible');
  await p.keyboard.press('Escape');
  const chip = p.locator('.sort-bank-chips .sort-chip').first();
  const word = (await chip.innerText()).trim();
  await chip.click();
  await p.locator('.sort-drop').first().click();
  const after = await p.locator('.sort-bank-chips .sort-chip').count();
  check(`sort @${w} tap-to-place moves "${word}" out of the bank`, after === before - 1, `${before} -> ${after}`);
  check(`sort @${w} placed card appears in a category`, (await p.locator('.sort-bin-chips').allInnerTexts()).some(t => t.includes(word)));
  check(`sort @${w} no horizontal scroll`, (await overflowX(p)) <= 1, `${await overflowX(p)}px`);
  await p.screenshot({ path: path.join(OUT, `sort-tap-${w}.png`) });
  await p.context().close();

  // 30 cards in 5 categories: the bank scrolls inside itself, the page does not move
  const big = await newPage(w, h);
  await importAndPlay(big, '/games/sort', BIG_SORT);
  const sizes = await big.locator('.sort-bank').evaluate(el => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  check(`sort @${w} 30 cards: bank overflows its column`, sizes.sh > sizes.ch, JSON.stringify(sizes));
  await big.locator('.sort-bank').evaluate(el => { el.scrollTop = 300; });
  const st = await big.locator('.sort-bank').evaluate(el => el.scrollTop);
  const pageY = await big.evaluate(() => window.scrollY);
  check(`sort @${w} 30 cards: bank scrolls, page stays put`, st > 0 && pageY === 0 && (await overflowX(big)) <= 1, `scrollTop ${st}, pageY ${pageY}`);
  check(`sort @${w} 30 cards: no page errors`, big.errors.length === 0, big.errors.join(' | '));
  await big.screenshot({ path: path.join(OUT, `sort-30cards-${w}.png`) });
  await big.context().close();
}

// 3. Detective v2: stacked sentences, separate marks, independent scoring, Vietnamese --
for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'm390']]) {
  const p = await newPage(w, h);
  await importAndPlay(p, '/games/language-detective', path.join(FIX, 'language-detective/06-drei-kurze-saetze.json'));
  const card = n => p.locator('.sent-card').nth(n - 1);
  check(`detective v2 @${w} one card per sentence`, (await p.locator('.sent-card').count()) === 3);
  await card(1).getByRole('button', { name: /^Gäste/ }).click();
  await p.getByLabel('Keine Fehler (Satz 2)').check();
  await card(3).getByRole('button', { name: /^ins/ }).click();   // wrong pick; the real error is "habe"
  check(`detective v2 @${w} Check enabled once all sentences answered`, await p.getByRole('button', { name: 'Prüfen' }).isEnabled());
  await p.getByRole('button', { name: 'Prüfen' }).click();
  const txt = await p.locator('body').innerText();
  check(`detective v2 @${w} aggregate counts sentences`, txt.includes('Ergebnis: 2 von 3 Sätzen richtig'));
  check(`detective v2 @${w} per-sentence badges`, (await card(1).locator('.sent-badge').innerText()).includes('Richtig') && (await card(3).locator('.sent-badge').innerText()).includes('Nicht ganz'));
  check(`detective v2 @${w} no answer key before reveal`, !/→|Singular: der Gast/.test(txt));
  check(`detective v2 @${w} no horizontal scroll`, (await overflowX(p)) <= 1, `${await overflowX(p)}px`);
  await p.screenshot({ path: path.join(OUT, `detective-checked-${tag}.png`), fullPage: true });
  if (tag === 'desk') {
    await p.getByRole('button', { name: /Lösung|Auflösung/ }).first().click().catch(() => {});
    const after = await p.locator('body').innerText();
    check('detective v2 reveal shows each correction inside its card', after.includes('habe → bin') && after.includes('Gäste → Gast'));
    await p.screenshot({ path: path.join(OUT, 'detective-revealed-desk.png'), fullPage: true });
    await p.getByRole('button', { name: 'Tiếng Việt' }).click();
    const vi = await p.locator('body').innerText();
    check('detective v2 Vietnamese interface, German authored text unchanged', vi.includes('Câu 1') && vi.includes('Gäste') && !/Keine Fehler|Prüfen|Satz \d/.test(vi));
    await p.screenshot({ path: path.join(OUT, 'detective-vi-desk.png'), fullPage: true });
  }
  check(`detective v2 @${w} no page errors`, p.errors.length === 0, p.errors.join(' | '));
  await p.context().close();
}

// 4. v1 compatibility: single passage, and the 80-segment / 12-error boundary file -----
{
  const p = await newPage(1440, 900);
  await importAndPlay(p, '/games/language-detective', path.join(FIX, 'language-detective/01-ich-habe-zeit.json'));
  check('detective v1 plays as one passage (no sentence chrome)', (await p.locator('.sent-card.single').count()) === 1 && (await p.locator('.sent-card header').count()) === 0);
  await p.context().close();
}
{
  const p = await newPage(1440, 900);
  await importAndPlay(p, '/games/language-detective', path.join(FIX, 'language-detective/05-eighty-segments-twelve-issues.json'));
  check('detective v1 80-segment, 12-error boundary file imports and plays', (await p.locator('.sent-card.single').count()) === 1, p.errors.join(' | '));
  await p.screenshot({ path: path.join(OUT, 'detective-v1-boundary-80.png') });
  await p.context().close();
}

// 5. Memory local play with ownership marks (no rooms, no hosted writes) -----------------
{
  const memFile = path.join(FIX, 'memory', fs.readdirSync(path.join(FIX, 'memory'))[0]);
  const p = await newPage(1440, 900);
  await importFile(p, '/games/memory', memFile);
  await p.getByRole('button', { name: 'Präsentieren' }).first().click();
  await p.getByRole('button', { name: 'Spiel starten' }).click();
  const cards = p.locator('button:has(.card-inner)');
  await cards.first().waitFor({ timeout: 5000 }).catch(() => {});
  const n = await cards.count();
  check('memory local play renders board', n >= 2, `${n} cards`);
  if (n >= 2) {
    await cards.nth(0).click();
    await cards.nth(1).click();
    await p.waitForTimeout(400);
  }
  check('memory local play has no page errors', p.errors.length === 0, p.errors.join(' | '));
  await p.screenshot({ path: path.join(OUT, 'memory-local-desk.png') });
  await p.context().close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
