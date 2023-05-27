export function screenWidth(): number {
  return document.documentElement.clientWidth;
}

export function screenHeight(): number {
  return Math.max(
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
}
