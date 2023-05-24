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
  makeDeck,
} from "../../../utils/card";
import assert from "assert";
import {
  CARDS_PER_PLAYER,
  CARD_COUNT_FOR_ANIMATION,
  CARD_MOVEMENT_DURATION_IN_SECONDS,
  ControlButton,
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
import { useCheckGameOver } from "../../../hooks/use-check-game-over";
import { useGiveCardsToEachPlayer } from "../../../hooks/use-give-cards-to-each-player";
import { userPlayer } from "../../../utils/user-player";
import { useHandleFailedDefence } from "../../../hooks/use-handle-failed-defence";
import { useDiscardCards } from "../../../hooks/use-discard-cards";
import { getRandomInteger } from "../../../utils/random-integer";
import CardImagesPreloader from "../../../components/card-images-preloader/card-images-preloader";
import MobileControls from "../../../components/mobile-controls/mobile-controls";
import { isMobile } from "../../../utils/is-mobile";

const DECK = makeDeck({ isShuffled: false });

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
  const [mobile, setMobile] = useState(false);
  const prevActivePlayerIdx = useRef<null | number>(null);

  const suitWidth = cardWidth / 2;
  const suitHeight = cardHeight / 2.5;

  const [selectedCardIdx, setSelectedCardIdx] = useSelectedCardIdx(
    cardRefs,
    () => userPlayer(players.current)
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
        userPlayer(players.current).cardIndexes.some((idx) => i === idx)
          ? { ...card, isFaceUp: true }
          : card
      )
    );
  }

  const discardCards = useDiscardCards(
    styles["card-discarded"],
    cardRefs.current,
    setCards,
    attackCardIndexes,
    defendCardIndexes,
    discardedCardIndexes
  );

  const checkGameOver = useCheckGameOver(players.current, activePlayerIdx);

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

    if (players.current[attackingIdx] === userPlayer(players.current)) {
      setSelectedCardIdx(0);
    } else {
      setForceBotAttack(true);
    }
  }, [attackingPlayerIdx, defendingPlayerIdx, setSelectedCardIdx]);

  const getIndexesOfCardsInUse = useCallback(() => {
    return [
      ...attackCardIndexes.current,
      ...defendCardIndexes.current,
      ...discardedCardIndexes.current,
      ...players.current.flatMap((player) => player.cardIndexes),
    ];
  }, []);

  const giveCardsToEachPlayer = useGiveCardsToEachPlayer(
    players,
    cardRefs.current,
    getIndexesOfCardsInUse,
    attackingPlayerIdx,
    defendingPlayerIdx,
    setCards
  );

  const nextRound = useCallback(() => {
    const loser = checkGameOver();
    if (loser) {
      setLostPlayer(loser);
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

  const failedDefenceHandler = useHandleFailedDefence(
    players,
    defendingPlayerIdx,
    setCards,
    cardRefs.current,
    attackCardIndexes,
    defendCardIndexes,
    nextRound
  );

  const handleFailedDefence = useCallback(() => {
    setIsRoundLost(true);
    failedDefenceHandler();
  }, [failedDefenceHandler]);

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
      if (players.current[nextActiveIdx] === userPlayer(players.current)) {
        setSelectedCardIdx(0);
      }
    }
  }, [
    setSelectedCardIdx,
    activePlayerIdx,
    defendingPlayerIdx,
    attackingPlayerIdx,
    handleSuccessfulDefence,
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

      if (player === userPlayer(players.current)) {
        assert(selectedCardIdx !== null);
        assert(selectedCardIdx >= 0);
        assert(
          selectedCardIdx < userPlayer(players.current).cardIndexes.length
        );
        cardIdx = userPlayer(players.current).cardIndexes[selectedCardIdx];
      } else {
        const idx = attackCardIndexes.current.length
          ? player.cardIndexes.find((idx) =>
              canAttackWith(
                cards[idx],
                attackCardIndexes.current.map((x) => cards[x]),
                defendCardIndexes.current.map((x) => cards[x])
              )
            )
          : player.cardIndexes[getRandomInteger(0, player.cardIndexes.length)];

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
        duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
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

      if (players.current[defendingPlayerIdx] === userPlayer(players.current)) {
        assert(selectedCardIdx !== null);
        const def = userPlayer(players.current).cardIndexes[selectedCardIdx];
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
          duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
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
      cards,
      selectedCardIdx,
      handleFailedDefence,
      cardWidth,
    ]
  );

  const handleButtonPress = useCallback(
    (button: ControlButton) => {
      console.log(activePlayerIdx, prevActivePlayerIdx.current);
      if (selectedCardIdx === null || selectedCardIdx < 0) {
        return;
      }

      switch (button) {
        case "ArrowUp":
          if (
            players.current[defendingPlayerIdx] !==
              userPlayer(players.current) &&
            isMaxAttackCardsReached()
          ) {
            return;
          }

          const func = activePlayerIdx === defendingPlayerIdx ? defend : attack;
          let newSelectedCardIdx: number | null = null;
          const selectedCardIdxBackup = selectedCardIdx;
          setSelectedCardIdx(null);

          const isSuccess = func(() => {
            newSelectedCardIdx =
              isDefended &&
              attackCardIndexes.current.length ===
                defendCardIndexes.current.length
                ? null
                : Math.min(
                    selectedCardIdxBackup,
                    userPlayer(players.current).cardIndexes.length -
                      (isDefended ? 2 : 1)
                  );

            setSelectedCardIdx(newSelectedCardIdx);

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
          });

          const isDefended = isSuccess && func === defend;

          if (!isSuccess) {
            newSelectedCardIdx =
              isDefended &&
              attackCardIndexes.current.length ===
                defendCardIndexes.current.length
                ? null
                : Math.min(
                    selectedCardIdxBackup,
                    userPlayer(players.current).cardIndexes.length -
                      (isDefended ? 2 : 1)
                  );

            setSelectedCardIdx(newSelectedCardIdx);
          }

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

            if (
              players.current[defendingPlayerIdx] ===
              userPlayer(players.current)
            ) {
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
              ? userPlayer(players.current).cardIndexes.length - 1
              : selectedCardIdx - 1;
          setSelectedCardIdx(nextIdx);
          break;
        }
        case "ArrowRight": {
          const nextIdx =
            (selectedCardIdx + 1) %
            userPlayer(players.current).cardIndexes.length;
          setSelectedCardIdx(nextIdx);
          break;
        }
        default:
          break;
      }
    },
    [
      activePlayerIdx,
      selectedCardIdx,
      defendingPlayerIdx,
      isMaxAttackCardsReached,
      defend,
      attack,
      setSelectedCardIdx,
      handleFailedDefence,
      handleFailedAttack,
    ]
  );

  useEffect(() => {
    if (mobile) {
      return;
    }

    const handler = (e: KeyboardEvent) =>
      handleButtonPress(e.key as ControlButton);

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [handleButtonPress, mobile]);

  // Bot attack/defence
  useEffect(() => {
    console.log(
      "bot 0",
      !isGameStarted,
      prevActivePlayerIdx.current === activePlayerIdx && !forceBotAttack,
      players.current[activePlayerIdx] === userPlayer(players.current)
    );

    if (
      !isGameStarted ||
      (prevActivePlayerIdx.current === activePlayerIdx && !forceBotAttack) ||
      players.current[activePlayerIdx] === userPlayer(players.current)
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
        if (players.current[prevIdx] === userPlayer(players.current)) {
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
        if (
          players.current[defendingPlayerIdx] === userPlayer(players.current)
        ) {
          setSelectedCardIdx(0);
        }
      });
    }
  }, [
    activePlayerIdx,
    attack,
    isGameStarted,
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

  const typeofWindow = typeof window;
  useEffect(() => {
    if (typeofWindow === "undefined") {
      return;
    }

    setMobile(isMobile());
  }, [typeofWindow]);

  return (
    <>
      <CardImagesPreloader />

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
                priority
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
            priority
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

      {mobile && <MobileControls onClick={handleButtonPress} />}
    </>
  );
}
