/**
 * Per-document figure/table/equation numbering style — continuous vs.
 * chapter-scoped ("2.1"). Session-only for now (localStorage, keyed by
 * document id), not a Supabase column. Kept behind these two functions so
 * swapping in real persistence later (mirroring how `christThesis` is
 * stored) only touches this file.
 */
export type NumberingStyle = 'continuous' | 'byChapter';

const keyFor = (docId: string) => `templytx-numbering-${docId}`;

export function getNumberingStyle(docId: string): NumberingStyle {
  const stored = localStorage.getItem(keyFor(docId));
  return stored === 'byChapter' ? 'byChapter' : 'continuous';
}

export function setNumberingStyle(docId: string, style: NumberingStyle) {
  localStorage.setItem(keyFor(docId), style);
}
