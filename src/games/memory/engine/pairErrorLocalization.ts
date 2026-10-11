import type { useLanguage } from '../../../shared/i18n';

type Translate = ReturnType<typeof useLanguage>['t'];

// Keep engine validation independent of UI language. Convert only its display text.
export function localizePairError(message: string, t: Translate): string {
  const format = /^Zeile (\d+): Bitte LINKS \| RECHTS \| KATEGORIE verwenden\.$/.exec(message);
  if (format) return t('badPairFormat', { line: format[1] });
  const length = /^Zeile (\d+): Maximal 80 Zeichen pro Kartenseite\.$/.exec(message);
  if (length) return t('pairTooLong', { line: length[1] });
  if (message === 'Für Online-Spiele sind 2 bis 16 Paare erforderlich.') return t('pairCount');
  return t('actionFailed');
}
