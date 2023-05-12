export const Suits = ["DIAMONDS", "CLUBS", "HEARTS", "SPADES"] as const;
export type Suit = (typeof Suits)[number];

export const Ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6] as const;
export type Rank = (typeof Ranks)[number];

export const CARD_COUNT = Suits.length * Ranks.length;

export class Card {
  private readonly suit: Suit;
  private readonly rank: Rank;

  constructor(suit: Suit, rank: Rank) {
    this.suit = suit;
    this.rank = rank;
  }

  beats(that: Card, trump: Card): boolean {
    if (this.suit === that.suit) {
      return this.rank > that.rank;
    }

    return this.isTrump(this, trump);
  }

  hash(): string {
    return `${this.suit}_${this.rank}`;
  }

  toString(): string {
    return this.hash();
  }

  private isTrump(card: Card, trump: Card): boolean {
    return card.suit === trump.suit;
  }
}
