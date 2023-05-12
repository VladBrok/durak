import assert from "assert";
import { CARD_COUNT, Card, Ranks, Suits } from "./card";
import { shuffle } from "./shuffle";

export class Deck implements Iterable<Card> {
  private readonly cards: Card[];

  constructor() {
    this.cards = [];

    for (let i = 0; i < Suits.length; i++) {
      for (let j = 0; j < Ranks.length; j++) {
        this.cards.push(new Card(Suits[i], Ranks[j]));
      }
    }

    assert(this.cards.length === CARD_COUNT);

    shuffle(this.cards);
  }

  [Symbol.iterator]() {
    let idx = 0;

    return {
      next: () => {
        return {
          done: idx >= this.cards.length,
          value: this.cards[idx++],
        };
      },
    };
  }
}
