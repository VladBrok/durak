import { MutableRefObject, useEffect } from "react";
import { gsap } from "gsap";
import { IPlayer } from "../utils/config";

export function useCardSelectAnimation(
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>,
  selectedCardIdx: number | null,
  userPlayer: IPlayer
): void {
  useEffect(() => {
    if (!cardRefs.current.length) {
      return;
    }

    gsap.set(
      userPlayer.cardIndexes
        .filter((_, i) => i !== selectedCardIdx)
        .map((card) => cardRefs.current[card]),
      {
        yPercent: 0,
      }
    );

    if (selectedCardIdx === null) {
      return;
    }

    const refIdx = userPlayer.cardIndexes[selectedCardIdx];

    gsap.set(cardRefs.current[refIdx], {
      yPercent: -50,
    });
  }, [cardRefs, selectedCardIdx, userPlayer]);
}
