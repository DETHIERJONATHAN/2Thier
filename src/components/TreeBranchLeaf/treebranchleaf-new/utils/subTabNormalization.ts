export const normalizeSubTabValues = (value: unknown): string[] => {
  const camelBoundary = /[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/;
  const isLowercase = (char: string) => /[a-zà-ÿ]/.test(char);

  const splitCamelCase = (input: string): string[] => {
    if (!input) return [];
    let segments: string[] = [];
    let current = input[0] ?? '';
    for (let i = 1; i < input.length; i++) {
      const prev = input[i - 1];
      const char = input[i];
      if (isLowercase(prev) && camelBoundary.test(char)) {
        segments.push(current.trim());
        current = char;
      } else {
        current += char;
      }
    }
    segments.push(current.trim());
    segments = segments.filter(Boolean);
    const noSplit = segments.length === 1 && segments[0] === input;
    return noSplit ? [input] : segments;
  };

  const cleanAndSplit = (raw: string): string[] => {
    if (!raw) return [];
    const trimmedRaw = raw.trim();
    if (!trimmedRaw) return [];
    const parts = trimmedRaw.includes(',') ? trimmedRaw.split(',') : [trimmedRaw];
    return parts
      .map(part => part.trim())
      .filter(Boolean)
      .flatMap(splitCamelCase);
  };

  const dedupe = (list: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of list) {
      if (!entry) continue;
      if (seen.has(entry)) continue;
      seen.add(entry);
      result.push(entry);
    }
    return result;
  };

  const collected: string[] = [];
  const collect = (input: unknown) => {
    if (input === null || input === undefined) return;
    if (Array.isArray(input)) {
      input.forEach(collect);
      return;
    }
    if (typeof input === 'string') {
      collected.push(...cleanAndSplit(input));
      return;
    }
    collected.push(String(input));
  };

  collect(value);
  return dedupe(collected);
};
