import DiffMatchPatch from 'diff-match-patch';
// Support both CJS and ESM typings quirks
const DMP: typeof DiffMatchPatch = (DiffMatchPatch as any).default || DiffMatchPatch;

export interface TextPatchResult {
  updatedText: string;
  applied: boolean;
}

export function applyTextPatch(
  originalText: string,
  patchPayload: string | { find: string; replace: string }
): TextPatchResult {
  if (typeof patchPayload === 'object' && patchPayload != null) {
    const { find, replace } = patchPayload as { find: string; replace: string };
    if (typeof find === 'string') {
      const idx = originalText.indexOf(find);
      if (idx === -1) return { updatedText: originalText, applied: false };
      const updatedText =
        originalText.slice(0, idx) + replace + originalText.slice(idx + find.length);
      return { updatedText, applied: true };
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
