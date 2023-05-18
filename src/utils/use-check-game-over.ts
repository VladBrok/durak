import { useCallback } from "react";
import { IPlayer } from "./config";

export function useCheckGameOver(players: IPlayer[], activePlayerIdx: number) {
  const checkGameOver = useCallback((): IPlayer | null => {
    const playersWithCards = players.filter(
      (player) => player.cardIndexes.length
    );

    if (playersWithCards.length === 1) {
      console.log("durak:", playersWithCards[0]);
      return playersWithCards[0];
    }

    if (playersWithCards.length === 0) {
      console.log("durak:", players[activePlayerIdx]);
      return players[activePlayerIdx];
    }

    return null;
  }, [activePlayerIdx, players]);

  return checkGameOver;
}
