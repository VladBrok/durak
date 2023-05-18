import { CARDS_PER_PLAYER, IPlayer } from "./config";

export function takeAvailableCardsFor(
  player: IPlayer,
  indexesOfAvailableCards: number[]
): number[] {
  const needed = Math.max(0, CARDS_PER_PLAYER - player.cardIndexes.length);

  if (!needed) {
    return [];
  }

  return indexesOfAvailableCards.splice(-needed, needed);
}
