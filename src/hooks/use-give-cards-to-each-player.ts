import assert from "assert";
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";
import { CARD_COUNT, ICard } from "../utils/card";
import {
  PLAYER_COUNT,
  CARD_MOVEMENT_DURATION_IN_SECONDS,
  IPlayer,
} from "../utils/config";
import { takeAvailableCardsFor } from "../utils/take-available-cards-for-player";
import { userPlayer } from "../utils/user-player";
import { gsap } from "gsap";
import { Flip } from "gsap/all";

export function useGiveCardsToEachPlayer(
  players: MutableRefObject<IPlayer[]>,
  cardRefs: (HTMLDivElement | null)[],
  indexesOfCardsInUse: number[],
  attackingPlayerIdx: number,
  defendingPlayerIdx: number,
  setCards: Dispatch<SetStateAction<ICard[]>>
) {
  const giveCardsToEachPlayer = useCallback(
    (onComplete?: () => void) => {
      const indexesOfAvailableCards = Array(CARD_COUNT)
        .fill(0)
        .map((_, i) => i)
        .filter((i) => !indexesOfCardsInUse.includes(i));

      assert(
        indexesOfAvailableCards.length + indexesOfCardsInUse.length ===
          CARD_COUNT
      );

      if (!indexesOfAvailableCards.length) {
        console.log("no cards available");
        onComplete?.();
        return;
      }

      const cardIndexesForAttacker = takeAvailableCardsFor(
        players.current[attackingPlayerIdx],
        indexesOfAvailableCards
      );

      const cardIndexesForDefender = takeAvailableCardsFor(
        players.current[defendingPlayerIdx],
        indexesOfAvailableCards
      );

      const additionalCardIndexes: number[][] = Array(PLAYER_COUNT)
        .fill(0)
        .map((_, i) =>
          i === attackingPlayerIdx
            ? cardIndexesForAttacker
            : i === defendingPlayerIdx
            ? cardIndexesForDefender
            : takeAvailableCardsFor(players.current[i], indexesOfAvailableCards)
        );

      const newPlayers = players.current.map((player, i) => {
        return {
          ...player,
          cardIndexes: [...player.cardIndexes, ...additionalCardIndexes[i]],
        };
      });
      players.current = newPlayers;

      animate(0, [
        attackingPlayerIdx,
        defendingPlayerIdx,
        ...Array(PLAYER_COUNT)
          .fill(0)
          .map((_, i) => i)
          .filter((i) => i !== attackingPlayerIdx && i !== defendingPlayerIdx),
      ]);

      function animate(cur: number, allPlayerIndexes: number[]): void {
        const playerIdx = allPlayerIndexes[cur];

        if (!additionalCardIndexes[playerIdx].length) {
          handleAnimationComplete();
          return;
        }

        setCards((prev) =>
          prev.map((card, i) =>
            additionalCardIndexes[playerIdx].includes(i)
              ? {
                  ...card,
                  isFaceUp:
                    players.current[playerIdx] === userPlayer(players.current),
                }
              : card
          )
        );

        const refs = additionalCardIndexes[playerIdx].map(
          (idx) => cardRefs[idx]
        );

        gsap.set(refs, {
          rotateZ: players.current[playerIdx].cardRotateZ,
        });

        const state = Flip.getState(refs);

        refs.forEach((ref) => {
          assert(ref);
          ref.className = "";
          ref.classList.add(players.current[playerIdx].cardCssClassName);
        });

        Flip.from(state, {
          duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
          stagger: 0.2,
          onComplete: handleAnimationComplete,
        });

        function handleAnimationComplete(): void {
          if (cur === allPlayerIndexes.length - 1) {
            onComplete?.();
          } else {
            animate(cur + 1, allPlayerIndexes);
          }
        }
      }
    },
    [
      attackingPlayerIdx,
      cardRefs,
      defendingPlayerIdx,
      indexesOfCardsInUse,
      players,
      setCards,
    ]
  );

  return giveCardsToEachPlayer;
}
