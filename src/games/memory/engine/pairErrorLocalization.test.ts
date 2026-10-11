import { describe, expect, it } from 'vitest';
import { localizePairError } from './pairErrorLocalization';
import { useLanguage } from '../../../shared/i18n';

type Translator = ReturnType<typeof useLanguage>['t'];
const t = ((key: string, vars?: Record<string, string | number>) => key + (vars?.line ? ':' + vars.line : '')) as Translator;

describe('vocabulary validation localization adapter', () => {
  it('preserves line numbers while translating format and length messages', () => {
    expect(localizePairError('Zeile 4: Bitte LINKS | RECHTS | KATEGORIE verwenden.',t)).toBe('badPairFormat:4');
    expect(localizePairError('Zeile 12: Maximal 80 Zeichen pro Kartenseite.',t)).toBe('pairTooLong:12');
  });
  it('maps pair-count and unrecognized messages safely', () => {
    expect(localizePairError('Für Online-Spiele sind 2 bis 16 Paare erforderlich.',t)).toBe('pairCount');
    expect(localizePairError('arbitrary backend detail',t)).toBe('actionFailed');
  });
});
