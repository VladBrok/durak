import assert from "assert";
import { getCardIndexesForPlayer } from "./get-card-indexes-for-player";
import { CARD_COUNT, makeShuffledDeck } from "./card";
import styles from "../app/scenes/game-scene/page.module.css";

export interface IPlayer {
  isUser: boolean;
  cardIndexes: number[];
  cardCssClassName: string;
  cardRotateZ: number;
}

export const MAX_ATTACK_CARDS = 6;
export const CARD_COUNT_FOR_ANIMATION = CARD_COUNT + 44;
export const PLAYER_COUNT = 4;
export const CARDS_PER_PLAYER = 6;
export const DECK = makeShuffledDeck();
export const PLAYERS = Array(PLAYER_COUNT)
  .fill(null)
  .map<IPlayer>((_, i) => ({
    cardIndexes: getCardIndexesForPlayer(i, PLAYER_COUNT, CARDS_PER_PLAYER),
    isUser: (PLAYER_COUNT > 2 && i === 2) || (PLAYER_COUNT <= 2 && i === 1),
    cardCssClassName:
      i === 0
        ? styles["card-top"]
        : (i === 1 && PLAYER_COUNT < 3) || (i === 2 && PLAYER_COUNT > 2)
        ? styles["card-bottom"]
        : i === 1 && PLAYER_COUNT > 2
        ? styles["card-right"]
        : styles["card-left"],
    cardRotateZ: i === 3 || (i === 1 && PLAYER_COUNT > 2) ? 90 : 0,
  }));

assert(PLAYERS.filter((player) => player.isUser).length === 1);
