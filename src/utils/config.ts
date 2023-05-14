import assert from "assert";
import { getCardIndexesForPlayer } from "./get-card-indexes-for-player";
import { CARD_COUNT, makeShuffledDeck } from "./card";

export interface IPlayer {
  isUser: boolean;
  cardIndexes: number[];
}

export const MAX_ATTACK_CARDS = 1;
export const CARD_COUNT_FOR_ANIMATION = CARD_COUNT + 44;
export const PLAYER_COUNT = 4;
export const CARDS_PER_PLAYER = 6;
export const DECK = makeShuffledDeck();
export const PLAYERS = Array(PLAYER_COUNT)
  .fill(null)
  .map<IPlayer>((_, i) => ({
    cardIndexes: getCardIndexesForPlayer(i, PLAYER_COUNT, CARDS_PER_PLAYER),
    isUser: (PLAYER_COUNT > 2 && i === 2) || (PLAYER_COUNT <= 2 && i === 1),
  }));

assert(PLAYERS.filter((player) => player.isUser).length === 1);
