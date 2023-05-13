"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useMemo, useRef, useState } from "react";
import TextButton from "../../../components/text-button/text-button";
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

// TODO: extract some animations to utils/animations/
// TODO: compute some values (player cards) to simplify code

gsap.registerPlugin(Flip);

export default function GameScene() {
  const [cardWidth, cardHeight] = useCardSize();
  const [cards, setCards] = useState<Card[]>(DECK);
  const [showSkipAnimationButton, setShowSkipAnimationButton] = useState(true); // TODO: set to true
  const [tweens, setTweens] = useState<
    (gsap.core.Timeline | gsap.core.Tween)[]
  >([]);
  const [players, setPlayers] = useState<IPlayer[]>(PLAYERS);
  const startedAnimation = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [attackCards, setAttackCards] = useState<number[]>([]);
  const [defendCards, setDefendCards] = useState<number[]>([]);
  const [defendingPlayerIdx, setDefendingPlayerIdx] = useState(0);
  const [activePlayerIdx, setActivePlayerIdx] = useState(
    PLAYER_COUNT > 2 ? 2 : 1
  );

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
                },
              }),
          });
        });
    }
  }

  useEffect(() => {
    if (startedAnimation.current || !cardWidth || !cardHeight) {
      return;
    }

    startedAnimation.current = true;

    gsap.set(`.${styles.card}`, {
      y: 0,
      x: () => document.documentElement.clientWidth,
    });

    const cornerMovementTl = gsap.timeline({ defaults: { duration: 2 } });

    cornerMovementTl.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight + cardHeight,
      zIndex: 0,
    });
    cornerMovementTl.to(
      `.${styles.card}`,
      {
        x: () => -cardWidth,
        zIndex: 0,
      },
      "<95%"
    );
    cornerMovementTl.to(
      `.${styles.card}`,
      {
        y: 0,
        zIndex: 0,
      },
      "<95%"
    );
    cornerMovementTl.to(
      `.${styles.card}`,
      {
        x: () => document.documentElement.clientWidth + cardWidth,
        zIndex: 0,
      },
      "<95%"
    );

    setTweens((prev) => [...prev, cornerMovementTl]);

    let cardsAtCenterCount = 0;

    const tw = gsap.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight / 2 + cardHeight / 2,
      x: () => document.documentElement.clientWidth / 2 - cardWidth / 2,
      zIndex: -5,
      duration: 1.5,
      stagger: {
        each: 0.1,
        onComplete: () => {
          cardsAtCenterCount++;

          if (CARD_COUNT_FOR_ANIMATION - cardsAtCenterCount < 20) {
            return;
          }

          [...document.querySelectorAll(`.${styles.card}`)].forEach((el) => {
            const z = (el as HTMLElement).style.zIndex;
            if (z === "-5") {
              gsap.set(el, { opacity: 0 });
            }
          });
        },
      },
      onComplete: () => {
        [...document.querySelectorAll(`.${styles.card}`)].forEach((el) => {
          el.classList.remove(styles.card);
          el.classList.add(styles["card-static-center"]);
          gsap.set(el, { opacity: 1, x: 0, y: 0 });
        });

        const tl = gsap.timeline({
          defaults: {
            duration: 0.9,
            ease: "back.out(0.7)",
          },
          onComplete: () => {
            setShowSkipAnimationButton(false);
          },
        });

        const tlPosition = "<35%";

        const animate = (childIdx: number) => {
          if (childIdx > PLAYER_COUNT * CARDS_PER_PLAYER) {
            return;
          }

          tl.to(
            `.${styles["card-static-center"]}:nth-child(${childIdx})`,
            {
              y: () => -document.documentElement.clientHeight / 2,
              onComplete: () => {
                const el = document.querySelector(
                  `.${styles["card-static-center"]}:nth-child(${childIdx})`
                );
                assert(el);
                el.classList.remove(`${styles["card-static-center"]}`);
                el.classList.add(`${styles["card-top"]}`);
                gsap.set(el, { x: 0, y: 0 });
              },
            },
            tlPosition
          );
          if (PLAYER_COUNT > 2) {
            tl.to(
              `.${styles["card-static-center"]}:nth-child(${childIdx + 1})`,
              {
                x: () => document.documentElement.clientWidth / 2,
                onComplete: () => {
                  const el = document.querySelector(
                    `.${styles["card-static-center"]}:nth-child(${
                      childIdx + 1
                    })`
                  );
                  assert(el);
                  el.classList.remove(`${styles["card-static-center"]}`);
                  el.classList.add(`${styles["card-right"]}`);
                  gsap.set(el, { x: 0, y: 0 });
                },
              },
              tlPosition
            );
          }
          tl.to(
            `.${styles["card-static-center"]}:nth-child(${
              childIdx + (PLAYER_COUNT > 2 ? 2 : 1)
            })`,
            {
              y: () =>
                document.documentElement.clientHeight / 2 - cardHeight / 2,
              onComplete: () => {
                const el = document.querySelector(
                  `.${styles["card-static-center"]}:nth-child(${
                    childIdx + (PLAYER_COUNT > 2 ? 2 : 1)
                  })`
                );
                assert(el);
                el.classList.remove(`${styles["card-static-center"]}`);
                el.classList.add(`${styles["card-bottom"]}`);
                gsap.set(el, { x: 0, y: 0 });
              },
            },
            tlPosition
          );
          if (PLAYER_COUNT > 3) {
            tl.to(
              `.${styles["card-static-center"]}:nth-child(${childIdx + 3})`,
              {
                x: () => -document.documentElement.clientWidth / 2,
                onComplete: () => {
                  const el = document.querySelector(
                    `.${styles["card-static-center"]}:nth-child(${
                      childIdx + 3
                    })`
                  );
                  assert(el);
                  el.classList.remove(`${styles["card-static-center"]}`);
                  el.classList.add(`${styles["card-left"]}`);
                  gsap.set(el, { x: 0, y: 0 });
                },
              },
              tlPosition
            );
          }

          animate(childIdx + PLAYER_COUNT);
        };

        animate(1);

        tl.set(
          `.${styles["card-static-center"]}:nth-child(${
            PLAYER_COUNT * CARDS_PER_PLAYER + 1
          })`,
          {
            x: () => (cardHeight - cardWidth) / 2,
            rotateZ: 90,
          }
        );

        tl.to(
          `.${styles["card-static-center"]}:nth-child(${
            PLAYER_COUNT * CARDS_PER_PLAYER + 1
          })`,
          {
            x: () =>
              -document.documentElement.clientWidth / 2 +
              cardWidth / 2 +
              (cardHeight - cardWidth) / 2,
            y: () =>
              -document.documentElement.clientHeight / 2 + cardHeight / 2,
            duration: 1,
            delay: 0.5,
            ease: "none",
          }
        );

        tl.to(
          `.${styles["card-static-center"]}:nth-child(n+${
            PLAYER_COUNT * CARDS_PER_PLAYER + 2
          })`,
          {
            x: () => -document.documentElement.clientWidth / 2 + cardWidth / 2,
            y: () =>
              -document.documentElement.clientHeight / 2 + cardHeight / 2,
            duration: 1,
            ease: "none",
            onComplete: () => {
              const els = document.querySelectorAll(
                `.${styles["card-static-center"]}:nth-child(n+${
                  PLAYER_COUNT * CARDS_PER_PLAYER + 1
                })`
              );
              assert(els);
              els.forEach((el, i) => {
                el.classList.remove(`${styles["card-static-center"]}`);
                el.classList.add(
                  `${
                    i === 0
                      ? styles["card-top-left-trump"]
                      : styles["card-top-left"]
                  }`
                );
                gsap.set(el, { x: 0, y: 0 });
              });

              gsap.set(`.${styles["card-left"]},.${styles["card-right"]}`, {
                rotateZ: 90,
              });

              setCards((prev) =>
                prev.map((card, i) =>
                  userPlayer.cardIndexes.some((idx) => i === idx)
                    ? { ...card, isFaceUp: true }
                    : card
                )
              );

              sortCards();
            },
          },
          "<0%"
        );

        setTweens((prev) => [...prev, tl]);
        setCards((prev) =>
          prev.map((card, i) =>
            i === PLAYER_COUNT * CARDS_PER_PLAYER
              ? { ...card, isTrump: true, isFaceUp: true }
              : card
          )
        );
      },
    });

    setTweens((prev) => [...prev, tw]);
  }, [cardWidth, cardHeight]);

  useEffect(() => {
    if (showSkipAnimationButton) {
      return;
    }

    tweens.forEach((tween) => {
      tween.progress(1);
    });
  }, [tweens, showSkipAnimationButton]);

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
          el.classList.add(
            styles[
              attackCards.length === 0
                ? "card-attack-first"
                : attackCards.length === 1
                ? "card-attack-second"
                : attackCards.length === 2
                ? "card-attack-third"
                : attackCards.length === 3
                ? "card-attack-fourth"
                : attackCards.length === 4
                ? "card-attack-fifth"
                : "card-attack-sixth"
            ]
          );
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
      !showSkipAnimationButton
        ? cards
        : [
            ...cards,
            ...Array(CARD_COUNT_FOR_ANIMATION - CARD_COUNT).fill(null),
          ],
    [cards, showSkipAnimationButton]
  );

  return (
    <>
      <div>
        {cardWidth &&
          cardHeight &&
          cardsToShow.map((card, i) => (
            // TODO: extract card component
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

      {showSkipAnimationButton && (
        <div className={styles["skip-button"]}>
          <TextButton
            onClick={() => setShowSkipAnimationButton(false)}
            text="Skip"
          />
        </div>
      )}
    </>
  );
}
