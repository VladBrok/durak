"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCssVarValue } from "../../../utils/get-css-var-value";
import TextButton from "../../../components/text-button/text-button";
import {
  CARD_COUNT,
  Card,
  cardComparator,
  getImageSrc,
  makeShuffledDeck,
} from "../../../utils/card";
import assert from "assert";
import { getCardIndexesForPlayer } from "../../../utils/get-card-indexes-for-player";
import { flushSync } from "react-dom";

interface IPlayer {
  isUser: boolean;
  cards: number[];
}

gsap.registerPlugin(Flip);

const CARD_COUNT_FOR_ANIMATION = CARD_COUNT + 44;
const PLAYER_COUNT = 4;
const CARDS_PER_PLAYER = 6;
const DECK = makeShuffledDeck();
const PLAYERS = Array(PLAYER_COUNT)
  .fill(null)
  .map((_, i) => ({
    cards: getCardIndexesForPlayer(i, PLAYER_COUNT, CARDS_PER_PLAYER),
    isUser: (PLAYER_COUNT > 2 && i === 2) || (PLAYER_COUNT <= 2 && i === 1),
  }));
assert(PLAYERS.filter((player) => player.isUser).length === 1);

export default function GameScene() {
  const [cards, setCards] = useState<Card[]>(DECK);
  const [startDistribution, setStartDistribution] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [showSkipAnimationButton, setShowSkipAnimationButton] = useState(true); // TODO: set to true
  const [tweens, setTweens] = useState<
    (gsap.core.Timeline | gsap.core.Tween)[]
  >([]);
  const [players, setPlayers] = useState<IPlayer[]>(PLAYERS);
  const startedAnimation = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  function sortCards(): void {
    const bottomCards = cardRefs.current.filter((_, i) =>
      players.find((pl) => pl.isUser)?.cards.some((idx) => idx === i)
    );
    sort(bottomCards, "x");

    const topCards = cardRefs.current.filter((_, i) =>
      players[0].cards.some((idx) => idx === i)
    );
    sort(topCards, "x");

    if (PLAYER_COUNT < 3) {
      return;
    }

    const rightCards = cardRefs.current.filter((_, i) =>
      players[1].cards.some((idx) => idx === i)
    );
    sort(rightCards, "y");

    if (PLAYER_COUNT < 4) {
      return;
    }

    const leftCards = cardRefs.current.filter((_, i) =>
      players[3].cards.some((idx) => idx === i)
    );
    sort(leftCards, "y");

    function sort(
      refs: (HTMLDivElement | null)[],
      translationDir: "x" | "y"
    ): void {
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
          const tl = gsap.timeline();
          tl.to(card, { [translationDir]: 0 });
          tl.to(card, {
            [translationDir]: translation,
          });
        });
    }
  }

  useEffect(() => {
    setCardWidth(getCssVarValue("--card-width"));
    setCardHeight(getCssVarValue("--card-height"));
  }, []);

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

        setStartDistribution(true);
      },
    });

    setTweens((prev) => [...prev, tw]);
  }, [cardWidth, cardHeight]);

  useEffect(() => {
    if (!startDistribution || !cardWidth || !cardHeight) {
      return;
    }

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
                `.${styles["card-static-center"]}:nth-child(${childIdx + 1})`
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
          y: () => document.documentElement.clientHeight / 2 - cardHeight / 2,
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
                `.${styles["card-static-center"]}:nth-child(${childIdx + 3})`
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
        y: () => -document.documentElement.clientHeight / 2 + cardHeight / 2,
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
        y: () => -document.documentElement.clientHeight / 2 + cardHeight / 2,
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
              players.find((p) => p.isUser)?.cards.some((idx) => i === idx)
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
  }, [startDistribution, cardHeight, cardWidth]);

  useEffect(() => {
    if (showSkipAnimationButton) {
      return;
    }

    tweens.forEach((tween) => {
      tween.progress(1);
    });
  }, [tweens, showSkipAnimationButton]);

  function skipAnimation(): void {
    setShowSkipAnimationButton(false);
  }

  const cardsToShow = useMemo<(Card | null)[]>(
    () =>
      startDistribution
        ? cards
        : [
            ...cards,
            ...Array(CARD_COUNT_FOR_ANIMATION - CARD_COUNT).fill(null),
          ],
    [cards, startDistribution]
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

      {showSkipAnimationButton && (
        <div className={styles["skip-button"]}>
          <TextButton onClick={skipAnimation} text="Skip" />
        </div>
      )}
    </>
  );
}
