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
import { useSelectedCardIdx } from "../../../hooks/use-selected-card-idx";

// TODO: extract some animations to hooks/animations/
// TODO: use more useRef ?

gsap.registerPlugin(Flip);

export default function GameScene() {
  const [cardWidth, cardHeight] = useCardSize();
  const [cards, setCards] = useState<ICard[]>(DECK);
  const players = useRef<IPlayer[]>(PLAYERS);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [attackCardIndexes, setAttackCardIndexes] = useState<number[]>([]);
  const [defendCardIndexes, setDefendCardIndexes] = useState<number[]>([]);
  const [discardedCardIndexes, setDiscardedCardIndexes] = useState<number[]>(
    []
  );
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [attackingPlayerIdx, setAttackingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [forceBotAttack, setForceBotAttack] = useState(false);
  const prevActivePlayerIdx = useRef<null | number>(null);

  const userPlayer = useCallback(
    () => players.current.find((pl) => pl.isUser)!,
    []
  );
  const [selectedCardIdx, setSelectedCardIdx] = useSelectedCardIdx(
    cardRefs,
    userPlayer
  );
  const sortCards = useCardSort(players, cardRefs, cards);

  function setTrump(): void {
    assert(cards.every((card) => !card.isTrump));

    const trump = cards[PLAYER_COUNT * CARDS_PER_PLAYER];

    setCards((prev) =>
      prev.map((card) =>
        card.suit === trump.suit
          ? {
              ...card,
              isTrump: true,
              isFaceUp: card === trump ? true : card.isFaceUp,
            }
          : card
      )
    );
  }

  function revealUserCards(): void {
    setCards((prev) =>
      prev.map((card, i) =>
        userPlayer().cardIndexes.some((idx) => i === idx)
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
      setDefendCardIndexes([]);
      setAttackCardIndexes([]);

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
    },
    [attackCardIndexes, cards, defendCardIndexes]
  );

  const checkForEndOfGame = useCallback((): boolean => {
    const playersWithCards = players.current.filter(
      (player) => player.cardIndexes.length
    );

    if (playersWithCards.length === 1) {
      console.log("durak:", playersWithCards[0]);
      return true;
    }

    if (playersWithCards.length === 0) {
      console.log("draw");
      return true;
    }

    return false;
  }, []);

  const changeAttackingAndDefendingPlayers = useCallback(() => {
    assert(
      players.current.filter((player) => player.cardIndexes.length).length > 1
    );

    let attackingIdx = 0;
    do {
      attackingIdx = (attackingPlayerIdx + 1) % players.current.length;
    } while (!players.current[attackingIdx].cardIndexes.length);

    let defendingIdx = 0;
    do {
      defendingIdx = (defendingPlayerIdx + 1) % players.current.length;
    } while (!players.current[defendingIdx].cardIndexes.length);

    assert(attackingIdx !== defendingIdx);

    setAttackingPlayerIdx(attackingIdx);
    setActivePlayerIdx(attackingIdx);
    setDefendingPlayerIdx(defendingIdx);

    if (players.current[attackingIdx] === userPlayer()) {
      setSelectedCardIdx(0);
    } else {
      setForceBotAttack(true);
    }
  }, [attackingPlayerIdx, defendingPlayerIdx, setSelectedCardIdx, userPlayer]);

  const giveCardsToEachPlayer = useCallback(
    (onComplete?: () => void) => {
      const indexesOfCardsInUse = [
        ...attackCardIndexes,
        ...defendCardIndexes,
        ...discardedCardIndexes,
        ...players.current.flatMap((player) => player.cardIndexes),
      ];
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
        players.current[attackingPlayerIdx]
      );

      const cardIndexesForDefender = takeAvailableCardsFor(
        players.current[defendingPlayerIdx]
      );

      const additionalCardIndexes: number[][] = Array(PLAYER_COUNT)
        .fill(0)
        .map((_, i) =>
          i === attackingPlayerIdx
            ? cardIndexesForAttacker
            : i === defendingPlayerIdx
            ? cardIndexesForDefender
            : takeAvailableCardsFor(players.current[i])
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

        setCards((prev) =>
          prev.map((card, i) =>
            additionalCardIndexes[playerIdx].includes(i)
              ? {
                  ...card,
                  isFaceUp: players.current[playerIdx] === userPlayer(),
                }
              : card
          )
        );

        const refs = additionalCardIndexes[playerIdx].map(
          (idx) => cardRefs.current[idx]
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
          duration: 1,
          stagger: 0.2,
          onComplete: () => {
            if (cur === allPlayerIndexes.length - 1) {
              onComplete?.();
            } else {
              animate(cur + 1, allPlayerIndexes);
            }
          },
        });
      }

      function takeAvailableCardsFor(player: IPlayer): number[] {
        const needed = Math.max(
          0,
          CARDS_PER_PLAYER - player.cardIndexes.length
        );

        if (!needed) {
          return [];
        }

        return indexesOfAvailableCards.splice(-needed, needed);
      }
    },
    [
      attackCardIndexes,
      attackingPlayerIdx,
      defendCardIndexes,
      defendingPlayerIdx,
      discardedCardIndexes,
      userPlayer,
    ]
  );

  const handleSuccessfulDefence = useCallback(() => {
    console.log("nice def");
    setSelectedCardIdx(null);

    discardCards(() => {
      if (checkForEndOfGame()) {
        return;
      }

      giveCardsToEachPlayer(() => {
        sortCards(() => {
          changeAttackingAndDefendingPlayers();
        });
      });
    });
  }, [
    changeAttackingAndDefendingPlayers,
    checkForEndOfGame,
    discardCards,
    giveCardsToEachPlayer,
    setSelectedCardIdx,
    sortCards,
  ]);

  const handleFailedAttack = useCallback(() => {
    setSelectedCardIdx(null);

    let nextActiveIdx = (activePlayerIdx + 1) % PLAYER_COUNT;

    if (nextActiveIdx === defendingPlayerIdx) {
      nextActiveIdx = (nextActiveIdx + 1) % PLAYER_COUNT;
    }

    assert(nextActiveIdx !== defendingPlayerIdx);

    if (nextActiveIdx === attackingPlayerIdx) {
      handleSuccessfulDefence();
    } else {
      setActivePlayerIdx(nextActiveIdx);
      if (players.current[nextActiveIdx] === userPlayer()) {
        setSelectedCardIdx(0);
      }
    }
  }, [
    setSelectedCardIdx,
    activePlayerIdx,
    defendingPlayerIdx,
    attackingPlayerIdx,
    handleSuccessfulDefence,
    userPlayer,
  ]);

  const attack = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(activePlayerIdx !== defendingPlayerIdx);

      if (attackCardIndexes.length === MAX_ATTACK_CARDS) {
        console.log("max attack cards reached");
        handleFailedAttack();
        return false;
      }

      const player = players.current[activePlayerIdx];
      let cardIdx = 0;

      if (player === userPlayer()) {
        assert(selectedCardIdx !== null);
        cardIdx = userPlayer().cardIndexes[selectedCardIdx];
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
      players.current = players.current.map((pl) => {
        return pl === player
          ? {
              ...pl,
              cardIndexes: pl.cardIndexes.filter((x) => x !== cardIdx),
            }
          : pl;
      });
      setAttackCardIndexes((prev) => [...prev, cardIdx]);

      gsap.set(cardRef, { rotateZ: 0 });

      const state = Flip.getState(cardRef);

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

      return true;
    },
    [
      activePlayerIdx,
      cards,
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

      const cardIndexes = players.current[defendingPlayerIdx].cardIndexes
        .slice()
        .sort((a, b) => cardComparator(cards[a], cards[b]));
      const curDefendCardIndexes: number[] = [];

      if (players.current[defendingPlayerIdx] === userPlayer()) {
        assert(selectedCardIdx !== null);
        const def = userPlayer().cardIndexes[selectedCardIdx];
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
            console.log("lost round");
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

      players.current = players.current.map((player) =>
        player === players.current[defendingPlayerIdx]
          ? {
              ...player,
              cardIndexes: player.cardIndexes.filter(
                (card) => !curDefendCardIndexes.includes(card)
              ),
            }
          : player
      );

      setCards((prev) =>
        prev.map((card, i) =>
          curDefendCardIndexes.includes(i) ? { ...card, isFaceUp: true } : card
        )
      );
      setDefendCardIndexes((prev) => [...prev, ...curDefendCardIndexes]);

      for (let i = 0; i < curDefendCardIndexes.length; i++) {
        const defendCardIdx = curDefendCardIndexes[i];
        const cardRef = cardRefs.current[defendCardIdx];

        assert(cardRef);

        gsap.set(cardRef, { rotateZ: 0, zIndex: 10 });

        const state = Flip.getState(cardRef);

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
      }

      return true;
    },
    [
      cards,
      cardWidth,
      defendCardIndexes,
      attackCardIndexes,
      defendingPlayerIdx,
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
          if (
            players.current[defendingPlayerIdx] !== userPlayer() &&
            attackCardIndexes.length === MAX_ATTACK_CARDS
          ) {
            return;
          }

          const func = activePlayerIdx === defendingPlayerIdx ? defend : attack;

          let newSelectedCardIdx: number | null = null;

          const isDefended = func(() => {
            if (newSelectedCardIdx === null) {
              assert(prevActivePlayerIdx.current !== activePlayerIdx);
              const prevIdx = prevActivePlayerIdx.current;
              prevActivePlayerIdx.current = activePlayerIdx;
              assert(prevIdx !== null);
              setActivePlayerIdx(prevIdx);
            }
          });

          newSelectedCardIdx =
            func === defend &&
            isDefended &&
            attackCardIndexes.length === defendCardIndexes.length + 1
              ? null
              : Math.min(
                  selectedCardIdx,
                  userPlayer().cardIndexes.length - (isDefended ? 2 : 1)
                );

          setSelectedCardIdx(newSelectedCardIdx);

          if (newSelectedCardIdx != null && newSelectedCardIdx < 0) {
            setActivePlayerIdx(defendingPlayerIdx);
          }

          setShowHelp(false);
          break;
        case "ArrowDown":
          if (attackCardIndexes.length !== defendCardIndexes.length) {
            setSelectedCardIdx(null);
            prevActivePlayerIdx.current = activePlayerIdx;
            setActivePlayerIdx(defendingPlayerIdx);

            if (players.current[defendingPlayerIdx] === userPlayer()) {
              console.log("lost round", "(player)");
            }
          } else {
            handleFailedAttack();
            setSelectedCardIdx(null);
          }

          setShowHelp(false);
          break;
        case "ArrowLeft": {
          const nextIdx =
            selectedCardIdx <= 0
              ? userPlayer().cardIndexes.length - 1
              : selectedCardIdx - 1;
          setSelectedCardIdx(nextIdx);
          break;
        }
        case "ArrowRight": {
          const nextIdx =
            (selectedCardIdx + 1) % userPlayer().cardIndexes.length;
          setSelectedCardIdx(nextIdx);
          break;
        }
        default:
          break;
      }
    };
  }, [
    selectedCardIdx,
    defendingPlayerIdx,
    userPlayer,
    attackCardIndexes.length,
    activePlayerIdx,
    defend,
    attack,
    defendCardIndexes.length,
    setSelectedCardIdx,
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
      (prevActivePlayerIdx.current === activePlayerIdx && !forceBotAttack) ||
      players.current[activePlayerIdx] === userPlayer()
    ) {
      return;
    }

    setSelectedCardIdx(null);
    setForceBotAttack(false);

    const prevIdx = prevActivePlayerIdx.current;
    prevActivePlayerIdx.current = activePlayerIdx;

    if (
      players.current[activePlayerIdx] === players.current[defendingPlayerIdx]
    ) {
      defend(() => {
        assert(prevIdx !== null);
        assert(prevIdx !== activePlayerIdx);
        setActivePlayerIdx(prevIdx);
        if (players.current[prevIdx] === userPlayer()) {
          setSelectedCardIdx(0);
        }
      });
    } else {
      attack(() => {
        setActivePlayerIdx(defendingPlayerIdx);
        if (players.current[defendingPlayerIdx] === userPlayer()) {
          setSelectedCardIdx(0);
        }
      });
    }
  }, [
    activePlayerIdx,
    attack,
    isGameStarted,
    userPlayer,
    defendingPlayerIdx,
    defend,
    forceBotAttack,
    setSelectedCardIdx,
  ]);

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
                alt=""
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
        sortCards={() =>
          sortCards(() => {
            setActivePlayerIdx(1);
            setAttackingPlayerIdx(1);
            setDefendingPlayerIdx(0);

            setSelectedCardIdx(0);

            setShowHelp(true);
            setIsGameStarted(true);
          })
        }
        setTrump={setTrump}
        revealUserCards={revealUserCards}
      />
    </>
  );
}
