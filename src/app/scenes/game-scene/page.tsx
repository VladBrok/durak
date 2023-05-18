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
  getSuitImageSrc,
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
import GameOverScreen from "../../../components/game-over-screen/game-over-screen";
import Shield from "../../../components/shield/shield";

// TODO: extract some animations to hooks/animations/
// TODO: use more useRef ?

gsap.registerPlugin(Flip);

export default function GameScene() {
  const [cardWidth, cardHeight] = useCardSize();
  const [cards, setCards] = useState<ICard[]>(DECK);
  const players = useRef<IPlayer[]>(PLAYERS);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const attackCardIndexes = useRef<number[]>([]);
  const defendCardIndexes = useRef<number[]>([]);
  const discardedCardIndexes = useRef<number[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [attackingPlayerIdx, setAttackingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [lostPlayer, setLostPlayer] = useState<IPlayer | null>(null);
  const [forceBotAttack, setForceBotAttack] = useState(false);
  const [isRoundLost, setIsRoundLost] = useState(false);
  const prevActivePlayerIdx = useRef<null | number>(null);

  const suitWidth = cardWidth / 2;
  const suitHeight = cardHeight / 2.5;

  const userPlayer = useCallback(
    () => players.current.find((pl) => pl.isUser)!,
    []
  );
  const [selectedCardIdx, setSelectedCardIdx] = useSelectedCardIdx(
    cardRefs,
    userPlayer
  );
  const sortCards = useCardSort(players, cardRefs, cards);

  // TODO: set indexes differently
  function startGame(): void {
    sortCards(() => {
      setActivePlayerIdx(1);
      setAttackingPlayerIdx(1);
      setDefendingPlayerIdx(0);

      setSelectedCardIdx(0);

      setShowHelp(true);
      setIsGameStarted(true);
    });
  }

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
      discardedCardIndexes.current = [
        ...discardedCardIndexes.current,
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ];

      const attackAndDefendRefs = [
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ].map((idx) => cardRefs.current[idx]);

      const attackAndDefendCards = [
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
      ].map((idx) => cards[idx]);

      setCards((prev) =>
        prev.map((card) =>
          attackAndDefendCards.includes(card)
            ? { ...card, isFaceUp: false }
            : card
        )
      );
      attackCardIndexes.current = [];
      defendCardIndexes.current = [];

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
    [cards]
  );

  const checkGameOver = useCallback((): boolean => {
    const playersWithCards = players.current.filter(
      (player) => player.cardIndexes.length
    );

    if (playersWithCards.length === 1) {
      console.log("durak:", playersWithCards[0]);
      setLostPlayer(playersWithCards[0]);
      return true;
    }

    if (playersWithCards.length === 0) {
      console.log("durak:", players.current[activePlayerIdx]);
      setLostPlayer(players.current[activePlayerIdx]);
      return true;
    }

    return false;
  }, [activePlayerIdx]);

  const changeAttackingAndDefendingPlayers = useCallback(() => {
    assert(
      players.current.filter((player) => player.cardIndexes.length).length > 1
    );

    let attackingIdx = attackingPlayerIdx;
    do {
      attackingIdx = (attackingIdx + 1) % players.current.length;
    } while (!players.current[attackingIdx].cardIndexes.length);

    let defendingIdx = defendingPlayerIdx;
    do {
      defendingIdx = (defendingIdx + 1) % players.current.length;
    } while (
      !players.current[defendingIdx].cardIndexes.length ||
      defendingIdx === attackingIdx
    );

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
        ...attackCardIndexes.current,
        ...defendCardIndexes.current,
        ...discardedCardIndexes.current,
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

        if (!additionalCardIndexes[playerIdx].length) {
          handleAnimationComplete();
          return;
        }

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
    [attackingPlayerIdx, defendingPlayerIdx, userPlayer]
  );

  const nextRound = useCallback(() => {
    if (checkGameOver()) {
      return;
    }

    giveCardsToEachPlayer(() => {
      sortCards(() => {
        changeAttackingAndDefendingPlayers();
        setIsRoundLost(false);
      });
    });
  }, [
    changeAttackingAndDefendingPlayers,
    checkGameOver,
    giveCardsToEachPlayer,
    sortCards,
  ]);

  const handleSuccessfulDefence = useCallback(() => {
    console.log("nice def");
    setSelectedCardIdx(null);

    discardCards(() => {
      nextRound();
    });
  }, [discardCards, nextRound, setSelectedCardIdx]);

  const handleFailedDefence = useCallback(() => {
    setIsRoundLost(true);

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
      (idx) => cardRefs.current[idx]
    );

    setCards((prev) =>
      prev.map((card, i) =>
        attackAndDefendCardIndexes.includes(i)
          ? {
              ...card,
              isFaceUp: players.current[defendingPlayerIdx] === userPlayer(),
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
      duration: 1,
      onComplete: () => {
        nextRound();
      },
    });
  }, [defendingPlayerIdx, nextRound, userPlayer]);

  const handleFailedAttack = useCallback(() => {
    setSelectedCardIdx(null);

    const playersWithCards = players.current.filter(
      (player) => player.cardIndexes.length
    );
    if (
      !playersWithCards.length ||
      (playersWithCards.length === 1 &&
        playersWithCards[0] === players.current[defendingPlayerIdx])
    ) {
      handleSuccessfulDefence();
      return;
    }

    let nextActiveIdx = activePlayerIdx;
    do {
      nextActiveIdx = (nextActiveIdx + 1) % PLAYER_COUNT;
    } while (
      (!players.current[nextActiveIdx].cardIndexes.length ||
        nextActiveIdx === defendingPlayerIdx) &&
      nextActiveIdx !== attackingPlayerIdx
    );

    assert(nextActiveIdx !== defendingPlayerIdx);

    if (
      nextActiveIdx === attackingPlayerIdx ||
      nextActiveIdx === activePlayerIdx
    ) {
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

  const isMaxAttackCardsReached = useCallback(() => {
    return (
      attackCardIndexes.current.length ===
      Math.min(
        MAX_ATTACK_CARDS,
        players.current[defendingPlayerIdx].cardIndexes.length +
          defendCardIndexes.current.length
      )
    );
  }, [defendingPlayerIdx]);

  const attack = useCallback(
    (onSuccess?: () => void): boolean => {
      assert(activePlayerIdx !== defendingPlayerIdx);

      if (isMaxAttackCardsReached()) {
        console.log("max attack cards reached");
        handleFailedAttack();
        return false;
      }

      const player = players.current[activePlayerIdx];
      let cardIdx = 0;

      if (player === userPlayer()) {
        assert(selectedCardIdx !== null);
        assert(selectedCardIdx >= 0);
        assert(selectedCardIdx < userPlayer().cardIndexes.length);
        cardIdx = userPlayer().cardIndexes[selectedCardIdx];
      } else {
        const idx = player.cardIndexes.find((idx) =>
          canAttackWith(
            cards[idx],
            attackCardIndexes.current.map((x) => cards[x]),
            defendCardIndexes.current.map((x) => cards[x])
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
          attackCardIndexes.current.map((x) => cards[x]),
          defendCardIndexes.current.map((x) => cards[x])
        )
      ) {
        console.log("can't attack with this card");
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

      gsap.set(cardRef, { rotateZ: 0 });

      const state = Flip.getState(cardRef);

      cardRef.classList.add(
        styles[`card-attack-${attackCardIndexes.current.length}`]
      );
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

      attackCardIndexes.current = [...attackCardIndexes.current, cardIdx];

      return true;
    },
    [
      activePlayerIdx,
      defendingPlayerIdx,
      isMaxAttackCardsReached,
      userPlayer,
      cards,
      handleFailedAttack,
      selectedCardIdx,
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
          !beats(
            cards[def],
            cards[attackCardIndexes.current[defendCardIndexes.current.length]]
          )
        ) {
          console.log("can't defend with this card");
          return false;
        }
        curDefendCardIndexes.push(def);
      } else {
        for (
          let i = defendCardIndexes.current.length;
          i < attackCardIndexes.current.length;
          i++
        ) {
          const cardThatBeats = cardIndexes.findIndex((idx) =>
            beats(cards[idx], cards[attackCardIndexes.current[i]])
          );

          if (cardThatBeats < 0) {
            console.log("lost round");
            handleFailedDefence();
            return false;
          }

          curDefendCardIndexes.push(cardIndexes[cardThatBeats]);
          cardIndexes.splice(cardThatBeats, 1);
        }
      }

      assert(
        curDefendCardIndexes.length ===
          attackCardIndexes.current.length - defendCardIndexes.current.length
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

      for (let i = 0; i < curDefendCardIndexes.length; i++) {
        const defendCardIdx = curDefendCardIndexes[i];
        const cardRef = cardRefs.current[defendCardIdx];

        assert(cardRef);

        gsap.set(cardRef, { rotateZ: 0, zIndex: 10 });

        const state = Flip.getState(cardRef);

        cardRef.classList.add(
          styles[`card-attack-${defendCardIndexes.current.length + i}`]
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

      defendCardIndexes.current = [
        ...defendCardIndexes.current,
        ...curDefendCardIndexes,
      ];

      return true;
    },
    [
      defendingPlayerIdx,
      activePlayerIdx,
      userPlayer,
      cards,
      selectedCardIdx,
      handleFailedDefence,
      cardWidth,
    ]
  );

  const handleKeydown = useCallback(() => {
    return (e: KeyboardEvent) => {
      console.log(activePlayerIdx, prevActivePlayerIdx.current);
      if (selectedCardIdx === null || selectedCardIdx < 0) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          if (
            players.current[defendingPlayerIdx] !== userPlayer() &&
            isMaxAttackCardsReached()
          ) {
            return;
          }

          const func = activePlayerIdx === defendingPlayerIdx ? defend : attack;

          let newSelectedCardIdx: number | null = null;

          const isDefended =
            func(() => {
              console.log("newSelectedCardIdx:", newSelectedCardIdx);

              if (newSelectedCardIdx != null && newSelectedCardIdx < 0) {
                console.log("prev active idx:", activePlayerIdx);
                prevActivePlayerIdx.current = activePlayerIdx;
                setActivePlayerIdx(defendingPlayerIdx);
                return;
              }

              if (newSelectedCardIdx === null) {
                assert(prevActivePlayerIdx.current !== activePlayerIdx);
                const prevIdx = prevActivePlayerIdx.current;
                prevActivePlayerIdx.current = activePlayerIdx;
                assert(prevIdx !== null);
                setActivePlayerIdx(prevIdx);
              }
            }) && func === defend;

          newSelectedCardIdx =
            isDefended &&
            attackCardIndexes.current.length ===
              defendCardIndexes.current.length
              ? null
              : Math.min(
                  selectedCardIdx,
                  userPlayer().cardIndexes.length - (isDefended ? 2 : 1)
                );

          setSelectedCardIdx(newSelectedCardIdx);

          setShowHelp(false);
          break;
        case "ArrowDown":
          if (
            attackCardIndexes.current.length !==
            defendCardIndexes.current.length
          ) {
            setSelectedCardIdx(null);
            prevActivePlayerIdx.current = activePlayerIdx;
            setActivePlayerIdx(defendingPlayerIdx);

            if (players.current[defendingPlayerIdx] === userPlayer()) {
              console.log("lost round", "(player)");
              handleFailedDefence();
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
    isMaxAttackCardsReached,
    activePlayerIdx,
    defend,
    attack,
    setSelectedCardIdx,
    handleFailedDefence,
    handleFailedAttack,
  ]);

  useEffect(() => {
    const handler = handleKeydown();

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [handleKeydown]);

  // Bot attack/defence
  useEffect(() => {
    console.log(
      "bot 0",
      !isGameStarted,
      prevActivePlayerIdx.current === activePlayerIdx && !forceBotAttack,
      players.current[activePlayerIdx] === userPlayer()
    );

    if (
      !isGameStarted ||
      (prevActivePlayerIdx.current === activePlayerIdx && !forceBotAttack) ||
      players.current[activePlayerIdx] === userPlayer()
    ) {
      return;
    }

    console.log("bot 1");

    setSelectedCardIdx(null);
    setForceBotAttack(false);

    const prevIdx = prevActivePlayerIdx.current;
    prevActivePlayerIdx.current = activePlayerIdx;

    if (
      players.current[activePlayerIdx] === players.current[defendingPlayerIdx]
    ) {
      console.log("bot 2");
      defend(() => {
        console.log("bot 3");
        assert(prevIdx !== null);
        assert(prevIdx !== activePlayerIdx);
        setActivePlayerIdx(prevIdx);
        if (players.current[prevIdx] === userPlayer()) {
          if (!players.current[prevIdx].cardIndexes.length) {
            handleFailedAttack();
          } else {
            setSelectedCardIdx(0);
          }
        }
      });
    } else {
      attack(() => {
        assert(
          players.current[defendingPlayerIdx].cardIndexes.length >=
            attackCardIndexes.current.length - defendCardIndexes.current.length
        );
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
    handleFailedAttack,
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
      <GameOverScreen lostPlayer={lostPlayer} />

      <Shield
        isGameStarted={isGameStarted}
        isRoundLost={isRoundLost}
        defendingPlayer={players.current[defendingPlayerIdx]}
      />

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

      {isGameStarted && (
        <div className={styles["trump-suit"]}>
          <Image
            src={getSuitImageSrc(cards.find((card) => card.isTrump)!)}
            width={suitWidth}
            height={suitHeight}
            alt=""
          />
        </div>
      )}

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
        sortCards={startGame}
        setTrump={setTrump}
        revealUserCards={revealUserCards}
      />
    </>
  );
}
