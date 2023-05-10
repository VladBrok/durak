"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { gsap } from "gsap";
import { Flip } from "gsap/all";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(Flip);

const CARD_COUNT = 80;

// TODO: extract card width and card height from css and ts into constants

export default function GameScene() {
  const [cards, setCards] = useState(Array(CARD_COUNT).fill(null));
  const startedAnimation = useRef(false);

  useEffect(() => {
    if (startedAnimation.current) {
      return;
    }

    startedAnimation.current = true;

    gsap.set(`.${styles.card}`, {
      y: 0,
      x: () => document.documentElement.clientWidth,
    });

    const tl = gsap.timeline({ defaults: { duration: 2 } });

    tl.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight + 123,
      zIndex: 0,
    });
    tl.to(
      `.${styles.card}`,
      {
        x: () => -79,
        zIndex: 0,
      },
      "<95%"
    );
    tl.to(
      `.${styles.card}`,
      {
        y: 0,
        zIndex: 0,
      },
      "<95%"
    );
    tl.to(
      `.${styles.card}`,
      {
        x: () => document.documentElement.clientWidth + 79,
        zIndex: 0,
      },
      "<95%"
    );

    let cardsAtCenterCount = 0;

    gsap.to(`.${styles.card}`, {
      y: () => document.documentElement.clientHeight / 2 + 123 / 2,
      x: () => document.documentElement.clientWidth / 2 - 79 / 2,
      zIndex: -5,
      duration: 1.5,
      stagger: {
        each: 0.1,
        onComplete: () => {
          cardsAtCenterCount++;

          gsap.set(`.${styles["card-center"]}`, { opacity: 1 });

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
        gsap.set(`.${styles.card}`, { opacity: 0 });
      },
    });
  }, []);

  return (
    <>
      {cards.map((_, i) => (
        <div className={`${styles.card}`} key={i}>
          <Image
            src="/images/cards/card-back.png"
            width={79}
            height={123}
            alt="card-back"
          />
        </div>
      ))}

      <div className={styles["card-container"]}>
        <div className={`${styles["card-center"]}`}>
          <Image
            src="/images/cards/card-back.png"
            width={79}
            height={123}
            alt="card-back"
          />
        </div>
      </div>
    </>
  );
}
