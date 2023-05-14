"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [attackCardIndexes, setAttackCardIndexes] = useState<number[]>([]);
  const [defendCardIndexes, setDefendCardIndexes] = useState<number[]>([]);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(
    PLAYER_COUNT > 2 ? 2 : 1
  );
  const [isGameStarted, setIsGameStarted] = useState(false);
  const prevActivePlayerIdx = useRef<null | number>(null);

  const canMoveCards = selectedCardIdx !== null;
  const userPlayer = players.find((pl) => pl.isUser)!;

  function cardRefsOf(player: IPlayer): (HTMLDivElement | null)[] {
    return cardRefs.current.filter((_, i) =>
      player.cardIndexes.some((idx) => idx === i)
    );
  }

  function sortCards(): void {
    sort(cardRefsOf(userPlayer), "x", userPlayer);
    sort(cardRefsOf(players[0]), "x", players[0]);

    if (PLAYER_COUNT > 2) {
      sort(cardRefsOf(players[1]), "y", players[1]);
    }

    if (PLAYER_COUNT > 3) {
      sort(cardRefsOf(players[3]), "y", players[3]);
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
                  setActivePlayerIdx(1);
                  // setShowHelp(true);
                  // setSelectedCardIdx(0);
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

  // Select card
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

  const attack = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(activePlayerIdx !== defendingPlayerIdx);

      const player = players[activePlayerIdx];
      let cardIdx = 0;

      if (player === userPlayer) {
        assert(selectedCardIdx !== null);
        cardIdx = userPlayer.cardIndexes[selectedCardIdx];
      } else {
        const idx = player.cardIndexes.find((idx) =>
          canAttackWith(
            cards[idx],
            attackCardIndexes.map((x) => cards[x]),
            defendCardIndexes.map((x) => cards[x])
          )
        );

        if (idx == null) {
          console.log("cannot attack");
          return false;
        }

        cardIdx = idx;
      }

      if (
        !canAttackWith(
          cards[cardIdx],
          attackCardIndexes.map((x) => cards[x]),
          defendCardIndexes.map((x) => cards[x])
        )
      ) {
        return false;
      }

      const cardRef = cardRefs.current[cardIdx];

      assert(cardRef);

      setCards((prev) =>
        prev.map((item) =>
          item === prev[cardIdx] ? { ...item, isFaceUp: true } : item
        )
      );

      gsap.set(cardRef, { rotateZ: 0 });

      const state = Flip.getState(cardRef);

      cardRef.classList.remove(styles["card-bottom"]);
      cardRef.classList.add(styles[`card-attack-${attackCardIndexes.length}`]);
      gsap.set(cardRef, {
        x: 0,
        y: 0,
        yPercent: 0,
      });

      Flip.from(state, {
        duration: 1,
        onComplete: () => {
          onSuccess?.();
        },
      });

      setPlayers((prev) =>
        prev.map((pl) => {
          return pl === player
            ? {
                ...pl,
                cardIndexes: pl.cardIndexes.filter((x) => x !== cardIdx),
              }
            : pl;
        })
      );

      setAttackCardIndexes((prev) => [...prev, cardIdx]);

      return true;
    },
    [
      activePlayerIdx,
      cards,
      players,
      userPlayer,
      attackCardIndexes,
      defendCardIndexes,
      selectedCardIdx,
      defendingPlayerIdx,
    ]
  );

  const defend = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(defendingPlayerIdx === activePlayerIdx);

      const defendCardIdx = players[defendingPlayerIdx].cardIndexes.find(
        (idx) =>
          beats(cards[idx], cards[attackCardIndexes[defendCardIndexes.length]])
      );

      if (!defendCardIdx) {
        console.log("lost");
        return false;
      }

      const cardRef = cardRefs.current[defendCardIdx];

      assert(cardRef);

      gsap.set(cardRef, { rotateZ: 0 });

      const state = Flip.getState(cardRef);

      cardRef.classList.remove(styles["card-top"]);
      cardRef.classList.add(styles[`card-attack-${defendCardIndexes.length}`]);
      gsap.set(cardRef, {
        x: cardWidth / 3,
        y: cardWidth / 3,
        yPercent: 0,
      });

      Flip.from(state, {
        duration: 1,
        onComplete: () => {
          onSuccess?.();
        },
      });

      setPlayers((prev) =>
        prev.map((player) =>
          player === players[defendingPlayerIdx]
            ? {
                ...player,
                cardIndexes: player.cardIndexes.filter(
                  (card) => card !== defendCardIdx
                ),
              }
            : player
        )
      );

      setCards((prev) =>
        prev.map((card, i) =>
          i === defendCardIdx ? { ...card, isFaceUp: true } : card
        )
      );

      setDefendCardIndexes((prev) => [...prev, defendCardIdx]);

      return true;
    },
    [
      cards,
      cardWidth,
      defendCardIndexes,
      attackCardIndexes,
      defendingPlayerIdx,
      players,
      activePlayerIdx,
    ]
  );

  const handleKeydown = useCallback(() => {
    return (e: KeyboardEvent) => {
      if (
        !canMoveCards ||
        selectedCardIdx === null ||
        selectedCardIdx < 0 ||
        attackCardIndexes.length > 5
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          if (attack()) {
            setSelectedCardIdx(
              Math.min(selectedCardIdx, userPlayer.cardIndexes.length - 2)
            );
          }

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
  }, [
    attack,
    canMoveCards,
    attackCardIndexes,
    selectedCardIdx,
    defendingPlayerIdx,
    userPlayer,
  ]);

  useEffect(() => {
    const handler = handleKeydown();

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [handleKeydown]);

  // Bot attack/defence
  useEffect(() => {
    if (
      !isGameStarted ||
      prevActivePlayerIdx.current === activePlayerIdx ||
      players[activePlayerIdx] === userPlayer
    ) {
      return;
    }

    const prevIdx = prevActivePlayerIdx.current;

    prevActivePlayerIdx.current = activePlayerIdx;

    if (players[activePlayerIdx] === players[defendingPlayerIdx]) {
      defend(() => {
        assert(prevIdx !== null);
        setActivePlayerIdx(prevIdx);
      });
    } else {
      attack(() => {
        setActivePlayerIdx(defendingPlayerIdx);
      });
    }
  }, [
    activePlayerIdx,
    attack,
    isGameStarted,
    userPlayer,
    players,
    defendingPlayerIdx,
    defend,
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
