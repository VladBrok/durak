import assert from "assert";
import { shuffle } from "./shuffle";

export const Suits = ["DIAMONDS", "CLUBS", "HEARTS", "SPADES"] as const;
export type Suit = (typeof Suits)[number];

export const Ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6] as const;
export type Rank = (typeof Ranks)[number];

export const CARD_COUNT = Suits.length * Ranks.length;

export interface ICard {
  suit: Suit;
  rank: Rank;
  isFaceUp: boolean;
  isTrump: boolean;
}

export function beats(a: ICard, b: ICard): boolean {
  if (a.suit === b.suit) {
    return a.rank > b.rank;
  }

  return a.isTrump;
}

export function getImageSrc(card: ICard, forceFaceUp = false): string {
  if (!card.isFaceUp && !forceFaceUp) {
    return "/images/cards/card-back.png";
  }

  return `/images/cards/${card.suit.toLowerCase()}-${card.rank}.png`;
}

export function getSuitImageSrc(card: ICard): string {
  return `/images/suits/${card.suit.toLowerCase()}.png`;
}

export function makeDeck({ isShuffled }: { isShuffled: boolean }): ICard[] {
  const cards: (ICard | null)[] = Array(CARD_COUNT).fill(null);
  let cardIdx = 0;

  for (let i = 0; i < Suits.length; i++) {
    for (let j = 0; j < Ranks.length; j++) {
      cards[cardIdx++] = {
        suit: Suits[i],
        rank: Ranks[j],
        isFaceUp: false,
        isTrump: false,
      };
    }
  }

  if (isShuffled) {
    shuffle(cards);
  }

  return cards.map((card) => {
    assert(card !== null);
    return card;
  });
}

export function cardComparator(a: ICard, b: ICard): number {
  if (a.rank === b.rank) {
    return a.suit > b.suit ? 1 : a.suit < b.suit ? -1 : 0;
  }

  return a.rank - b.rank;
}

export function canAttackWith(
  card: ICard,
  attackCards: ICard[],
  defendCards: ICard[]
): boolean {
  return (
    !attackCards.length ||
    attackCards.some((item) => item.rank === card.rank) ||
    defendCards.some((item) => item.rank === card.rank)
  );
}
