"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(Flip);

const CARD_COUNT = 80;
const PLAYER_COUNT = 4;
const CARDS_PER_PLAYER = 6;

// TODO: extract card width and card height from css and ts into constants

export default function GameScene() {
  const [cards, setCards] = useState(Array(CARD_COUNT).fill(null));
  const startedAnimation = useRef(false);
  const [startDistribution, setStartDistribution] = useState(false);

  useEffect(() => {
    if (startedAnimation.current) {
      return;
    }

    startedAnimation.current = true;

    gsap.set(`.${styles.card}`, {
      y: 0,
      x: () => document.documentElement.clientWidth,
    });

    const cornerMovementTl = gsap.timeline({ defaults: { duration: 2 } });

    cornerMovementTl.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight + 123,
      zIndex: 0,
    });
    cornerMovementTl.to(
      `.${styles.card}`,
      {
        x: () => -79,
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
        x: () => document.documentElement.clientWidth + 79,
        zIndex: 0,
      },
      "<95%"
    );
    cornerMovementTl.progress(1);

    let cardsAtCenterCount = 0;

    const tw = gsap.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight / 2 + 123 / 2,
      x: () => document.documentElement.clientWidth / 2 - 79 / 2,
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
          setStartDistribution(true);
        });
      },
    });

    tw.progress(1);
  }, []);

  useEffect(() => {
    if (!startDistribution) {
      return;
    }

    const tl = gsap.timeline({
      defaults: {
        duration: 0.7,
        ease: "back.out(0.7)",
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
          y: () => document.documentElement.clientHeight / 2 - 123 / 2,
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
        x: () => -document.documentElement.clientWidth / 2 + 79 / 2,
        y: () => -document.documentElement.clientHeight / 2 + 123 / 2,
        duration: 1,
        ease: "none",
      }
    );

    tl.progress(1);
  }, [startDistribution]);

  return (
    <>
      {cards.map((_, i) => (
        // TODO: extract card component
        <div className={`${styles.card}`} key={i}>
          <Image
            src="/images/cards/card-back.png"
            width={79}
            height={123}
            alt="card-back"
          />
        </div>
      ))}
    </>
  );
}
