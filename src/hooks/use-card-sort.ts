import { MutableRefObject, useCallback } from "react";
import { ICard, cardComparator } from "../utils/card";
import { PLAYER_COUNT, IPlayer } from "../utils/config";
import { useCardSize } from "./use-card-size";
import { gsap } from "gsap";

export function useCardSort(
  players: MutableRefObject<IPlayer[]>,
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>,
  cards: ICard[]
) {
  if (players.current.length !== PLAYER_COUNT) {
    throw new Error(`Invalid player count: ${players.current.length}.`);
  }

  const [cardWidth] = useCardSize();

  const cardSort = useCallback(
    (onComplete: () => void): void => {
      const bottomPlayerIdx = PLAYER_COUNT > 2 ? 2 : 1;

      sort(
        cardRefsOf(players.current[bottomPlayerIdx]),
        "x",
        players.current[bottomPlayerIdx]
      );
      sort(cardRefsOf(players.current[0]), "x", players.current[0]);

      if (PLAYER_COUNT > 2) {
        sort(cardRefsOf(players.current[1]), "y", players.current[1]);
      }

      if (PLAYER_COUNT > 3) {
        sort(cardRefsOf(players.current[3]), "y", players.current[3]);
      }

      function cardRefsOf(player: IPlayer): (HTMLDivElement | null)[] {
        return cardRefs.current.filter((_, i) =>
          player.cardIndexes.some((idx) => idx === i)
        );
      }

      function sort(
        refs: (HTMLDivElement | null)[],
        translationDir: "x" | "y",
        player: IPlayer
      ): void {
        players.current = players.current.map((item) =>
          item === player
            ? {
                ...item,
                cardIndexes: item.cardIndexes
                  .slice()
                  .sort((a, b) => cardComparator(cards[a], cards[b])),
              }
            : item
        );

        refs
          .sort((a, b) =>
            cardComparator(
              cards[cardRefs.current.findIndex((ref) => ref === a)],
              cards[cardRefs.current.findIndex((ref) => ref === b)]
            )
          )
          .forEach((card, i) => {
            const translation =
              (i - Math.floor(refs.length / 2)) * (cardWidth / 3);

            gsap.set(card, { zIndex: i });

            const tl = gsap.timeline({ defaults: { duration: 0.7 } });
            tl.to(card, { [translationDir]: 0 });
            tl.to(card, {
              [translationDir]: translation,
              ...(i === refs.length - 1 && {
                onComplete: () => {
                  onComplete();
                },
              }),
            });
          });
      }
    },
    [cardRefs, cardWidth, cards, players]
  );

  return cardSort;
}
