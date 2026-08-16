const IDLE_WIDTH = 320;
const IDLE_HEIGHT = 939;

export function ruanActionVisualWidth(petSize: number, actionWidth: number, actionHeight: number): number {
  return petSize * (IDLE_HEIGHT / IDLE_WIDTH) * (actionWidth / actionHeight);
}

export function ruanActionShiftX(viewportWidth: number, anchorPercent: number, visualWidth: number, margin = 8): number {
  const desiredCenter = (viewportWidth * anchorPercent) / 100;
  const halfWidth = Math.min(visualWidth / 2, Math.max(0, viewportWidth / 2 - margin));
  const safeCenter = Math.min(viewportWidth - margin - halfWidth, Math.max(margin + halfWidth, desiredCenter));
  return safeCenter - desiredCenter;
}
