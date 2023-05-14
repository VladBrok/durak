"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARD_COUNT,
  Card,
  beats,
  canAttackWith,
  cardComparator,
  getImageSrc,
} from "../../../utils/card";
import assert from "assert";
import {
  CARDS_PER_PLAYER,
  CARD_COUNT_FOR_ANIMATION,
  DECK,
  IPlayer,
  PLAYERS,
  PLAYER_COUNT,
} from "../../../utils/config";
import { useCardSize } from "../../../hooks/use-card-size";
import CardDistributionAnimation from "../../../components/card-distribution-animation/card-distribution-animation";

// TODO: extract some animations to hooks/animations/
// TODO: compute some values (player cards) to simplify code

gsap.registerPlugin(Flip);

export default function GameScene() {
  const [cardWidth, cardHeight] = useCardSize();
  const [cards, setCards] = useState<Card[]>(DECK);
  const [players, setPlayers] = useState<IPlayer[]>(PLAYERS);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [attackCards, setAttackCards] = useState<number[]>([]);
  const [defendCards, setDefendCards] = useState<number[]>([]);
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(
    PLAYER_COUNT > 2 ? 2 : 1
  );
  const [isGameStarted, setIsGameStarted] = useState(false);

  const canMoveCards = selectedCardIdx !== null;
  const userPlayer = players.find((pl) => pl.isUser)!;

  function sortCards(): void {
    const bottomCards = cardRefs.current.filter((_, i) =>
      userPlayer.cardIndexes.some((idx) => idx === i)
    );
    sort(bottomCards, "x", userPlayer);

    const topCards = cardRefs.current.filter((_, i) =>
      players[0].cardIndexes.some((idx) => idx === i)
    );
    sort(topCards, "x", players[0]);

    if (PLAYER_COUNT < 3) {
      return;
    }

    const rightCards = cardRefs.current.filter((_, i) =>
      players[1].cardIndexes.some((idx) => idx === i)
    );
    sort(rightCards, "y", players[1]);

    if (PLAYER_COUNT < 4) {
      return;
    }

    const leftCards = cardRefs.current.filter((_, i) =>
      players[3].cardIndexes.some((idx) => idx === i)
    );
    sort(leftCards, "y", players[3]);

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
            ...(refs === bottomCards &&
              i === refs.length - 1 && {
                onComplete: () => {
                  setShowHelp(true);
                  setSelectedCardIdx(0);
                  setIsGameStarted(true);
                },
              }),
          });
        });
    }
  }

  function setTrump(): void {
    assert(cards.every((card) => !card.isTrump));

    setCards((prev) =>
      prev.map((card, i) =>
        i === PLAYER_COUNT * CARDS_PER_PLAYER
          ? { ...card, isTrump: true, isFaceUp: true }
          : card
      )
    );
  }

  function revealUserCards(): void {
    setCards((prev) =>
      prev.map((card, i) =>
        userPlayer.cardIndexes.some((idx) => i === idx)
          ? { ...card, isFaceUp: true }
          : card
      )
    );
  }

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
  }, [selectedCardIdx, userPlayer]);

  function handleKeydown(
    canMoveCards: boolean,
    selectedCardIdx: number | null
  ) {
    return (e: KeyboardEvent) => {
      if (
        !canMoveCards ||
        selectedCardIdx === null ||
        selectedCardIdx < 0 ||
        attackCards.length > 5
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          if (
            !canAttackWith(
              cards[userPlayer.cardIndexes[selectedCardIdx]],
              attackCards.map((x) => cards[x])
            )
          ) {
            return;
          }

          const el = cardRefs.current[userPlayer.cardIndexes[selectedCardIdx]];

          assert(el);

          const state = Flip.getState(el);

          el.classList.remove(styles["card-bottom"]);
          el.classList.add(styles[`card-attack-${attackCards.length}`]);
          gsap.set(el, {
            x: 0,
            y: 0,
            yPercent: 0,
          });

          Flip.from(state, {
            duration: 1,
          });

          setPlayers((prev) =>
            prev.map((player) =>
              player === userPlayer
                ? {
                    ...player,
                    cardIndexes: player.cardIndexes.filter(
                      (_, i) => i !== selectedCardIdx
                    ),
                  }
                : player
            )
          );

          setAttackCards((prev) => [
            ...prev,
            userPlayer.cardIndexes[selectedCardIdx],
          ]);

          setSelectedCardIdx(
            Math.min(selectedCardIdx, userPlayer.cardIndexes.length - 2)
          );

          setShowHelp(false);
          break;
        case "ArrowDown":
          setSelectedCardIdx(null);
          setActivePlayerIdx(defendingPlayerIdx);
          setShowHelp(false);
          break;
        case "ArrowLeft": {
          const nextIdx =
            selectedCardIdx <= 0
              ? userPlayer.cardIndexes.length - 1
              : selectedCardIdx - 1;
          setSelectedCardIdx(nextIdx);
          break;
        }
        case "ArrowRight": {
          const nextIdx = (selectedCardIdx + 1) % userPlayer.cardIndexes.length;
          setSelectedCardIdx(nextIdx);
          break;
        }
        default:
          break;
      }
    };
  }

  // TODO: refactor (handleKeydown depends on userPlayer and other, which is not obvious)
  useEffect(() => {
    const handler = handleKeydown(canMoveCards, selectedCardIdx);

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [
    canMoveCards,
    selectedCardIdx,
    userPlayer,
    attackCards,
    defendingPlayerIdx,
  ]);

  useEffect(() => {
    if (activePlayerIdx === defendingPlayerIdx) {
      const defendCard = players[defendingPlayerIdx].cardIndexes.find((idx) =>
        beats(cards[idx], cards[attackCards[defendCards.length]])
      );

      if (defendCard) {
        const el = cardRefs.current[defendCard];

        assert(el);

        const state = Flip.getState(el);

        el.classList.remove(styles["card-top"]);
        el.classList.add(styles["card-attack-first"]);
        gsap.set(el, {
          x: cardWidth / 3,
          y: cardWidth / 3,
          yPercent: 0,
        });

        Flip.from(state, {
          duration: 1,
        });

        setPlayers((prev) =>
          prev.map((player) =>
            player === players[defendingPlayerIdx]
              ? {
                  ...player,
                  cardIndexes: player.cardIndexes.filter(
                    (card) => card !== defendCard
                  ),
                }
              : player
          )
        );

        setCards((prev) =>
          prev.map((card, i) =>
            i === defendCard ? { ...card, isFaceUp: true } : card
          )
        );

        setDefendCards((prev) => [...prev, defendCard]);

        if (defendCards.length + 1 === attackCards.length) {
          setSelectedCardIdx(0);
        }
      } else {
        console.log("lost");
        setSelectedCardIdx(0);
      }
    }
  }, [
    activePlayerIdx,
    // defendCards,
    // defendingPlayerIdx,
    // players,
    // cards,
    // defendCards,
    // attackCards,
    // cardWidth,
  ]);

  const cardsToShow = useMemo<(Card | null)[]>(
    () =>
      isGameStarted
        ? cards
        : [
            ...cards,
            ...Array(CARD_COUNT_FOR_ANIMATION - CARD_COUNT).fill(null),
          ],
    [cards, isGameStarted]
  );

  return (
    <>
      <div>
        {cardWidth &&
          cardHeight &&
          cardsToShow.map((card, i) => (
            <div
              className={`${styles.card}`}
              key={i}
              ref={(el) => i < CARD_COUNT && (cardRefs.current[i] = el)}
            >
              <Image
                src={card ? getImageSrc(card) : "/images/cards/card-back.png"}
                width={cardWidth}
                height={cardHeight}
                alt="card-back"
              />
            </div>
          ))}
      </div>

      {showHelp && (
        <div className={styles.help}>
          <div className={styles.instruction}>Up arrow - attack</div>
          <div className={styles.instruction}>Down arrow - pass</div>
          <div className={styles.instruction}>
            Left arrow - select left card
          </div>
          <div className={styles.instruction}>
            Right arrow - select right card
          </div>
        </div>
      )}

      <CardDistributionAnimation
        styles={styles}
        sortCards={sortCards}
        setTrump={setTrump}
        revealUserCards={revealUserCards}
      />
    </>
  );
}
