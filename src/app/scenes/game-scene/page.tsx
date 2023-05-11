"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useRef, useState } from "react";
import { getCssVarValue } from "../../../utils/getCssVarValue";
import TextButton from "../../../components/text-button/text-button";

gsap.registerPlugin(Flip);

const CARD_COUNT = 80;
const PLAYER_COUNT = 4;
const CARDS_PER_PLAYER = 6;

export default function GameScene() {
  const [cards, setCards] = useState(Array(CARD_COUNT).fill(null));
  const [startDistribution, setStartDistribution] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [showSkipAnimationButton, setShowSkipAnimationButton] = useState(true);
  const [tweens, setTweens] = useState<
    (gsap.core.Timeline | gsap.core.Tween)[]
  >([]);
  const startedAnimation = useRef(false);

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

          if (CARD_COUNT - cardsAtCenterCount < 20) {
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

  // TODO: make this responsive (cards are at fixed positions after an animation ends)
  useEffect(() => {
    if (!startDistribution || !cardWidth || !cardHeight) {
      return;
    }

    const tl = gsap.timeline({
      defaults: {
        duration: 0.7,
        ease: "back.out(0.7)",
      },
      onComplete: () => {
        setShowSkipAnimationButton(false);
      },
    });

    const tlPosition = "<55%";

    const animate = (childIdx: number) => {
      if (childIdx > PLAYER_COUNT * CARDS_PER_PLAYER) {
        return;
      }

      tl.to(
        `.${styles["card-static-center"]}:nth-child(${childIdx})`,
        {
          y: () => -document.documentElement.clientHeight / 2,
        },
        tlPosition
      );
      if (PLAYER_COUNT > 2) {
        tl.to(
          `.${styles["card-static-center"]}:nth-child(${childIdx + 1})`,
          {
            x: () => document.documentElement.clientWidth / 2,
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
        },
        tlPosition
      );
      if (PLAYER_COUNT > 3) {
        tl.to(
          `.${styles["card-static-center"]}:nth-child(${childIdx + 3})`,
          {
            x: () => -document.documentElement.clientWidth / 2,
          },
          tlPosition
        );
      }

      animate(childIdx + PLAYER_COUNT);
    };

    animate(1);

    tl.to(
      `.${styles["card-static-center"]}:nth-child(n+${
        PLAYER_COUNT * CARDS_PER_PLAYER + 1
      })`,
      {
        x: () => -document.documentElement.clientWidth / 2 + cardWidth / 2,
        y: () => -document.documentElement.clientHeight / 2 + cardHeight / 2,
        duration: 1,
        ease: "none",
      }
    );

    setTweens((prev) => [...prev, tl]);
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

  return (
    <>
      <div>
        {cardWidth &&
          cardHeight &&
          cards.map((_, i) => (
            // TODO: extract card component
            <div className={`${styles.card}`} key={i}>
              <Image
                src="/images/cards/card-back.png"
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
