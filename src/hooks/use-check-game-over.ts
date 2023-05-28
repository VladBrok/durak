import { useCallback } from "react";
import { IPlayer } from "../utils/config";

export function useCheckGameOver(players: IPlayer[], activePlayerIdx: number) {
  const checkGameOver = useCallback((): IPlayer | null => {
    const playersWithCards = players.filter(
      (player) => player.cardIndexes.length
    );

    if (playersWithCards.length === 1) {
      return playersWithCards[0];
    }

    if (playersWithCards.length === 0) {
      return players[activePlayerIdx];
    }

    return null;
  }, [activePlayerIdx, players]);

  return checkGameOver;
}
