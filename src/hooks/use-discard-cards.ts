import assert from "assert";
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";
import { CARD_MOVEMENT_DURATION_IN_SECONDS } from "../utils/config";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { ICard } from "../utils/card";

export function useDiscardCards(
  discardedCardCssClass: string,
  cardRefs: (HTMLDivElement | null)[],
  setCards: Dispatch<SetStateAction<ICard[]>>,
  attackCardIndexes: MutableRefObject<number[]>,
  defendCardIndexes: MutableRefObject<number[]>,
  discardedCardIndexes: MutableRefObject<number[]>
) {
  const discardCards = useCallback(
    (onComplete?: () => void) => {
      discardedCardIndexes.current = [
        ...discardedCardIndexes.current,
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ];

      const attackAndDefendRefs = [
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ].map((idx) => cardRefs[idx]);

      const attackAndDefendCardIndexes = [
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ];

      setCards((prev) =>
        prev.map((card, i) =>
          attackAndDefendCardIndexes.includes(i)
            ? { ...card, isFaceUp: false }
            : card
        )
      );
      attackCardIndexes.current = [];
      defendCardIndexes.current = [];

      const state = Flip.getState(attackAndDefendRefs);

      gsap.set(attackAndDefendRefs, {
        x: 0,
        y: 0,
      });
      attackAndDefendRefs.forEach((el) => {
        assert(el);
        el.className = "";
        el.classList.add(discardedCardCssClass);
      });

      Flip.from(state, {
        duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
        onComplete: () => {
          onComplete?.();
        },
      });
    },
    [
      attackCardIndexes,
      cardRefs,
      defendCardIndexes,
      discardedCardCssClass,
      discardedCardIndexes,
      setCards,
    ]
  );

  return discardCards;
}
