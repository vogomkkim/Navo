import DiffMatchPatch from 'diff-match-patch';
// Support both CJS and ESM typings quirks
const DMP: typeof DiffMatchPatch = (DiffMatchPatch as any).default || DiffMatchPatch;

export interface TextPatchResult {
  updatedText: string;
  applied: boolean;
}

export interface TextPatchOptions {
  ignoreWhitespace?: boolean; // Treat any whitespace runs as equivalent when searching
}

export type PatchObject = {
  find: string;
  replace: string;
  isRegex?: boolean;
  flags?: string; // e.g., 'm', 's', 'i'
};

function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWhitespaceInsensitivePattern(source: string): string {
  // Escape regex meta, then replace any whitespace run with a generic matcher
  const escaped = escapeRegex(source);
  // Collapse any escaped whitespace (space, tab, newline, carriage return) into \\s+
  return escaped
    .replace(/\s+/g, '\\s+') // already escaped whitespace runs
    .replace(/\n/g, '\\s+')
    .replace(/\r/g, '\\s+')
    .replace(/\t/g, '\\s+')
    .replace(/\f/g, '\\s+');
}

export function applyTextPatch(
  originalText: string,
  patchPayload: string | PatchObject,
  options?: TextPatchOptions
): TextPatchResult {
  if (typeof patchPayload === 'object' && patchPayload != null) {
    const { find, replace, isRegex, flags } = patchPayload as PatchObject;
    if (typeof find === 'string') {
      if (isRegex || options?.ignoreWhitespace) {
        const pattern = isRegex
          ? find
          : buildWhitespaceInsensitivePattern(find);
        const re = new RegExp(pattern, flags ?? '');
        const updatedText = originalText.replace(re, replace);
        const applied = updatedText !== originalText;
        return { updatedText, applied };
      } else {
        const idx = originalText.indexOf(find);
        if (idx === -1) return { updatedText: originalText, applied: false };
        const updatedText =
          originalText.slice(0, idx) + replace + originalText.slice(idx + find.length);
        return { updatedText, applied: true };
      }
    }
  }

  const dmp = new DMP();
  try {
    const patches = dmp.patch_fromText(String(patchPayload));
    const [updated, results] = dmp.patch_apply(patches, originalText);
    const applied = results.some(Boolean);
    return { updatedText: updated, applied };
  } catch {
    return { updatedText: originalText, applied: false };
  }
}

export function createPatchFromTexts(oldText: string, newText: string): string {
  const dmp = new DMP();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  const patches = dmp.patch_make(oldText, diffs);
  return dmp.patch_toText(patches);
}
