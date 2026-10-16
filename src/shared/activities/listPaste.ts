/** One entry per line; a leading "1." "2)" "-" or bullet from a pasted list is not part of the entry. Shared by Sequence and Sort. */
export function splitLines(raw: string): string[] {
  return raw.split(/\r?\n/).map(line => line.trim().replace(/^(?:\d{1,2}[.)]|[-•*])\s+/, '').trim()).filter(Boolean);
}
