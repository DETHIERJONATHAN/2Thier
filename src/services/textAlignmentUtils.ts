export function calculateVerticalCenterOffset(actualHeight: number, textHeight: number): number {
  if (!Number.isFinite(actualHeight) || !Number.isFinite(textHeight)) {
    return 0;
  }
  return Math.max(0, (actualHeight - textHeight) / 2);
}
