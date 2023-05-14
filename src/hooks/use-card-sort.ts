import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";
import { ICard, cardComparator } from "../utils/card";
import { PLAYER_COUNT, IPlayer } from "../utils/config";
import { useCardSize } from "./use-card-size";
import { gsap } from "gsap";

export function useCardSort(
  players: IPlayer[],
  setPlayers: Dispatch<SetStateAction<IPlayer[]>>,
  isGameStarted: boolean,
  onComplete: () => void,
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>,
  cards: ICard[]
): () => void {
  if (players.length !== PLAYER_COUNT) {
    throw new Error(`Invalid player count: ${players.length}.`);
  }

  const [cardWidth] = useCardSize();

  const cardSort = useCallback((): void => {
    const bottomPlayerIdx = PLAYER_COUNT > 2 ? 2 : 1;
    sort(cardRefsOf(players[bottomPlayerIdx]), "x", players[bottomPlayerIdx]);
    sort(cardRefsOf(players[0]), "x", players[0]);

    if (PLAYER_COUNT > 2) {
      sort(cardRefsOf(players[1]), "y", players[1]);
    }

    if (PLAYER_COUNT > 3) {
      sort(cardRefsOf(players[3]), "y", players[3]);
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
      setPlayers((prev) =>
        prev.map((item) =>
          item === player
            ? {
                ...item,
                cardIndexes: item.cardIndexes
                  .slice()
                  .sort((a, b) => cardComparator(cards[a], cards[b])),
              }
            : item
        )
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
            ...(!isGameStarted &&
              i === refs.length - 1 && {
                onComplete: () => {
                  onComplete();
                },
              }),
          });
        });
    }
  }, [
    cardRefs,
    cardWidth,
    cards,
    isGameStarted,
    onComplete,
    players,
    setPlayers,
  ]);

  return cardSort;
}
