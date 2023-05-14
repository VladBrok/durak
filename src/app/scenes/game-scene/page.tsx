"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CARD_COUNT,
  ICard,
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
  MAX_ATTACK_CARDS,
  PLAYERS,
  PLAYER_COUNT,
} from "../../../utils/config";
import { useCardSize } from "../../../hooks/use-card-size";
import CardDistributionAnimation from "../../../components/card-distribution-animation/card-distribution-animation";
import { useCardSort } from "../../../hooks/use-card-sort";
import { useSelectCard } from "../../../hooks/use-select-card";

// TODO: extract some animations to hooks/animations/
// TODO: compute some values (player cards) to simplify code ??

gsap.registerPlugin(Flip);

export default function GameScene() {
  const [cardWidth, cardHeight] = useCardSize();
  const [cards, setCards] = useState<ICard[]>(DECK);
  const [players, setPlayers] = useState<IPlayer[]>(PLAYERS);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [attackCardIndexes, setAttackCardIndexes] = useState<number[]>([]);
  const [defendCardIndexes, setDefendCardIndexes] = useState<number[]>([]);
  const [discardedCardIndexes, setDiscardedCardIndexes] = useState<number[]>(
    []
  );
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [attackingPlayerIdx, setAttackingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(
    PLAYER_COUNT > 2 ? 2 : 1
  );
  const [isGameStarted, setIsGameStarted] = useState(false);
  const prevActivePlayerIdx = useRef<null | number>(null);

  const userPlayer = players.find((pl) => pl.isUser)!;

  useSelectCard(cardRefs, selectedCardIdx, userPlayer);

  const sortCards = useCardSort(
    players,
    setPlayers,
    isGameStarted,
    () => {
      setActivePlayerIdx(2);
      setAttackingPlayerIdx(2);
      setDefendingPlayerIdx(0);

      setShowHelp(true);
      setIsGameStarted(true);
    },
    cardRefs,
    cards
  );

  function setTrump(): void {
    assert(cards.every((card) => !card.isTrump));

    const trump = cards[PLAYER_COUNT * CARDS_PER_PLAYER];

    setCards((prev) =>
      prev.map((card) =>
        card.suit === trump.suit
          ? { ...card, isTrump: true, isFaceUp: card === trump }
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

  const discardCards = useCallback(
    (onComplete?: () => void) => {
      setDiscardedCardIndexes((prev) => [
        ...prev,
        ...attackCardIndexes,
        ...defendCardIndexes,
      ]);

      const attackAndDefendRefs = [
        ...attackCardIndexes,
        ...defendCardIndexes,
      ].map((idx) => cardRefs.current[idx]);

      const attackAndDefendCards = [
        ...attackCardIndexes,
        ...defendCardIndexes,
      ].map((idx) => cards[idx]);

      setCards((prev) =>
        prev.map((card) =>
          attackAndDefendCards.includes(card)
            ? { ...card, isFaceUp: false }
            : card
        )
      );

      const state = Flip.getState(attackAndDefendRefs);

      gsap.set(attackAndDefendRefs, {
        x: 0,
        y: 0,
      });

      attackAndDefendRefs.forEach((el) => {
        assert(el);
        el.className = "";
        el.classList.add(styles["card-discarded"]);
      });

      Flip.from(state, {
        duration: 1,
        onComplete: () => {
          onComplete?.();
        },
      });

      setDefendCardIndexes([]);
      setAttackCardIndexes([]);
    },
    [attackCardIndexes, cards, defendCardIndexes]
  );

  const handleSuccessfulDefence = useCallback(() => {
    console.log("nice def");
    discardCards(() => {
      // TODO: give cards to each player
      sortCards();
    });
  }, [discardCards, sortCards]);

  const handleFailedAttack = useCallback(() => {
    let nextActiveIdx = (activePlayerIdx + 1) % PLAYER_COUNT;

    if (nextActiveIdx === defendingPlayerIdx) {
      nextActiveIdx = (nextActiveIdx + 1) % PLAYER_COUNT;
    }

    assert(nextActiveIdx !== defendingPlayerIdx);

    if (nextActiveIdx === attackingPlayerIdx) {
      handleSuccessfulDefence();
    } else {
      setActivePlayerIdx(nextActiveIdx);
    }
  }, [
    activePlayerIdx,
    defendingPlayerIdx,
    attackingPlayerIdx,
    handleSuccessfulDefence,
  ]);

  const attack = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(activePlayerIdx !== defendingPlayerIdx);

      if (attackCardIndexes.length === MAX_ATTACK_CARDS) {
        console.log("max attack cards reached");
        handleFailedAttack();
        return false;
      }

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
          console.log("no card to attack");
          handleFailedAttack();
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
      handleFailedAttack,
    ]
  );

  const defend = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(defendingPlayerIdx === activePlayerIdx);

      const cardIndexes = players[defendingPlayerIdx].cardIndexes
        .slice()
        .sort((a, b) => cardComparator(cards[a], cards[b]));
      const curDefendCardIndexes: number[] = [];

      if (players[defendingPlayerIdx] === userPlayer) {
        assert(selectedCardIdx !== null);
        const def = userPlayer.cardIndexes[selectedCardIdx];
        if (
          !beats(cards[def], cards[attackCardIndexes[defendCardIndexes.length]])
        ) {
          console.log("can't defend with this card");
          return false;
        }
        curDefendCardIndexes.push(def);
      } else {
        for (
          let i = defendCardIndexes.length;
          i < attackCardIndexes.length;
          i++
        ) {
          const cardThatBeats = cardIndexes.findIndex((idx) =>
            beats(cards[idx], cards[attackCardIndexes[i]])
          );

          if (cardThatBeats < 0) {
            console.log("lost");
            return false;
          }

          curDefendCardIndexes.push(cardIndexes[cardThatBeats]);
          cardIndexes.splice(cardThatBeats, 1);
        }
      }

      assert(
        curDefendCardIndexes.length ===
          attackCardIndexes.length - defendCardIndexes.length
      );

      for (let i = 0; i < curDefendCardIndexes.length; i++) {
        const defendCardIdx = curDefendCardIndexes[i];
        const cardRef = cardRefs.current[defendCardIdx];

        assert(cardRef);

        gsap.set(cardRef, { rotateZ: 0, zIndex: 10 });

        const state = Flip.getState(cardRef);

        cardRef.classList.remove(styles["card-top"]);
        cardRef.classList.add(
          styles[`card-attack-${defendCardIndexes.length + i}`]
        );
        gsap.set(cardRef, {
          x: cardWidth / 3,
          y: cardWidth / 3,
          yPercent: 0,
        });

        Flip.from(state, {
          duration: 1,
          onComplete: () => {
            if (defendCardIdx === curDefendCardIndexes.at(-1)) {
              onSuccess?.();
            }
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
      }

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
      userPlayer,
      selectedCardIdx,
    ]
  );

  const handleKeydown = useCallback(() => {
    return (e: KeyboardEvent) => {
      if (selectedCardIdx === null || selectedCardIdx < 0) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          const func = activePlayerIdx === defendingPlayerIdx ? defend : attack;

          func(() => {
            const newSelectedCard =
              func === defend &&
              attackCardIndexes.length === defendCardIndexes.length + 1
                ? null
                : Math.min(selectedCardIdx, userPlayer.cardIndexes.length - 2);

            if (newSelectedCard === null) {
              const prevIdx = prevActivePlayerIdx.current;
              prevActivePlayerIdx.current = activePlayerIdx;
              assert(prevIdx !== null);
              setActivePlayerIdx(prevIdx);
            }

            setSelectedCardIdx(newSelectedCard);
          });

          setShowHelp(false);
          break;
        case "ArrowDown":
          if (attackCardIndexes.length !== defendCardIndexes.length) {
            setSelectedCardIdx(null);
            prevActivePlayerIdx.current = activePlayerIdx;
            setActivePlayerIdx(defendingPlayerIdx);
          } else {
            handleFailedAttack();
            setSelectedCardIdx(null);
          }

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
    selectedCardIdx,
    activePlayerIdx,
    defendingPlayerIdx,
    defend,
    attack,
    attackCardIndexes.length,
    defendCardIndexes.length,
    userPlayer.cardIndexes.length,
    handleFailedAttack,
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

  useEffect(() => {
    if (
      !isGameStarted ||
      prevActivePlayerIdx.current === activePlayerIdx ||
      players[activePlayerIdx] !== userPlayer ||
      selectedCardIdx !== null
    ) {
      return;
    }

    setSelectedCardIdx(0);
  }, [players, activePlayerIdx, userPlayer, isGameStarted, selectedCardIdx]);

  const cardsToShow = useMemo<(ICard | null)[]>(
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
          <div className={styles.instruction}>Up arrow - use card</div>
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
