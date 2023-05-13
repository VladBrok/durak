export function getCardIndexesForPlayer(
  playerIdx: number,
  playerCount: number,
  cardsPerPlayer: number
): number[] {
  if (playerIdx < 0 || playerIdx >= playerCount) {
    throw new Error("Invalid player index.");
  }

  if (playerCount < 2) {
    throw new Error("Invalid player count.");
  }

  if (cardsPerPlayer <= 0) {
    throw new Error("Invalid cards per player count.");
  }

  return Array(cardsPerPlayer)
    .fill(0)
    .map((_, i) => playerIdx + playerCount * i);
}
