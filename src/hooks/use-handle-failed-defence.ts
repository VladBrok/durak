import assert from "assert";
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";
import { CARD_MOVEMENT_DURATION_IN_SECONDS, IPlayer } from "../utils/config";
import { userPlayer } from "../utils/user-player";
import { ICard } from "../utils/card";
import { gsap } from "gsap";
import { Flip } from "gsap/all";

export function useHandleFailedDefence(
  players: MutableRefObject<IPlayer[]>,
  defendingPlayerIdx: number,
  setCards: Dispatch<SetStateAction<ICard[]>>,
  cardRefs: (HTMLDivElement | null)[],
  attackCardIndexes: MutableRefObject<number[]>,
  defendCardIndexes: MutableRefObject<number[]>,
  onComplete: () => void
) {
  const handleFailedDefence = useCallback(() => {
    const defendingPlayer = players.current[defendingPlayerIdx];

    const attackAndDefendCardIndexes = [
      ...attackCardIndexes.current,
      ...defendCardIndexes.current,
    ];

    players.current = players.current.map((player) =>
      player === defendingPlayer
        ? {
            ...player,
            cardIndexes: [...player.cardIndexes, ...attackAndDefendCardIndexes],
          }
        : player
    );

    const attackAndDefendRefs = attackAndDefendCardIndexes.map(
      (idx) => cardRefs[idx]
    );

    setCards((prev) =>
      prev.map((card, i) =>
        attackAndDefendCardIndexes.includes(i)
          ? {
              ...card,
              isFaceUp:
                players.current[defendingPlayerIdx] ===
                userPlayer(players.current),
            }
          : card
      )
    );
    attackCardIndexes.current = [];
    defendCardIndexes.current = [];

    gsap.set(attackAndDefendRefs, {
      x: 0,
      y: 0,
      yPercent: 0,
      rotateZ: defendingPlayer.cardRotateZ,
    });

    const state = Flip.getState(attackAndDefendRefs);

    attackAndDefendRefs.forEach((ref) => {
      assert(ref);
      ref.className = "";
      ref.classList.add(defendingPlayer.cardCssClassName);
    });

    Flip.from(state, {
      duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
      onComplete: () => {
        onComplete();
      },
    });
  }, [
    attackCardIndexes,
    cardRefs,
    defendCardIndexes,
    defendingPlayerIdx,
    onComplete,
    players,
    setCards,
  ]);

  return handleFailedDefence;
}
