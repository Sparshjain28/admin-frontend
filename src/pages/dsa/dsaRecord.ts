// Every field of a provider's record as label / value rows (nested objects and lists are flattened, empty values skipped).
export const recordRows = (obj: any, prefix = ''): [string, string][] => {
  const out: [string, string][] = [];
  const label = (k: string) => `${prefix}${k.replace(/_/g, ' ')}`.replace(/^./, (ch) => ch.toUpperCase());
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    if (Array.isArray(v)) {
      if (v.length === 0) return;
      if (v.every((x) => typeof x !== 'object')) out.push([label(k), v.join(', ')]);
      else v.forEach((x, i) => out.push(...recordRows(x, `${label(k)} ${i + 1}: `)));
    } else if (typeof v === 'object') {
      if (Object.keys(v as object).length === 0) return;
      out.push(...recordRows(v, `${label(k)}: `));
    } else out.push([label(k), String(v)]);
  });
  return out;
};
