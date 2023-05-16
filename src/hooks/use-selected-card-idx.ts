import { MutableRefObject, useCallback, useState } from "react";
import { gsap } from "gsap";
import { IPlayer } from "../utils/config";
import assert from "assert";

export function useSelectedCardIdx(
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>,
  userPlayer: () => IPlayer
): [number | null, (newSelected: number | null) => void] {
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  const setter = useCallback(
    (newSelectedCardIdx: number | null): void => {
      assert(cardRefs.current.length);

      setSelectedCardIdx(newSelectedCardIdx);

      gsap.set(
        userPlayer()
          .cardIndexes.filter((_, i) => i !== newSelectedCardIdx)
          .map((card) => cardRefs.current[card]),
        {
          yPercent: 0,
        }
      );

      if (newSelectedCardIdx === null) {
        return;
      }

      const refIdx = userPlayer().cardIndexes[newSelectedCardIdx];

      gsap.set(cardRefs.current[refIdx], {
        yPercent: -50,
      });
    },
    [cardRefs, userPlayer]
  );

  return [selectedCardIdx, setter];
}
