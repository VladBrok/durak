export function getRandomInteger(
  minInclusive: number,
  maxExclusive: number
): number {
  return Math.floor(
    minInclusive + Math.random() * (maxExclusive - minInclusive)
  );
}
