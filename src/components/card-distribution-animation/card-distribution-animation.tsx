import styles from "./card-distribution-animation.module.css";
import { useEffect, useRef, useState } from "react";
import { useCardSize } from "../../hooks/use-card-size";
import {
  CARDS_PER_PLAYER,
  CARD_COUNT_FOR_ANIMATION,
  PLAYER_COUNT,
} from "../../utils/config";
import assert from "assert";
import TextButton from "../text-button/text-button";
import { gsap } from "gsap";

export interface ICardDistributionAnimationProps {
  styles: Record<string, string>;
  sortCards: () => void;
  setTrump: () => void;
  revealUserCards: () => void;
}

export default function CardDistributionAnimation(
  props: ICardDistributionAnimationProps
) {
  const [cardWidth, cardHeight] = useCardSize();
  const [tweens, setTweens] = useState<
    (gsap.core.Timeline | gsap.core.Tween)[]
  >([]);
  const [showSkipAnimationButton, setShowSkipAnimationButton] = useState(false); // TODO: set to true

  const startedAnimation = useRef(false);

  useEffect(() => {
    if (startedAnimation.current || !cardWidth || !cardHeight) {
      return;
    }

    startedAnimation.current = true;

    gsap.set(`.${props.styles.card}`, {
      y: 0,
      x: () => document.documentElement.clientWidth,
    });

    const cornerMovementTl = gsap.timeline({ defaults: { duration: 2 } });

    cornerMovementTl.to(`.${props.styles.card}`, {
      y: () => document.documentElement.clientHeight + cardHeight,
      zIndex: 0,
    });
    cornerMovementTl.to(
      `.${props.styles.card}`,
      {
        x: () => -cardWidth,
        zIndex: 0,
      },
      "<95%"
    );
    cornerMovementTl.to(
      `.${props.styles.card}`,
      {
        y: 0,
        zIndex: 0,
      },
      "<95%"
    );
    cornerMovementTl.to(
      `.${props.styles.card}`,
      {
        x: () => document.documentElement.clientWidth + cardWidth,
        zIndex: 0,
      },
      "<95%"
    );

    setTweens((prev) => [...prev, cornerMovementTl]);

    let cardsAtCenterCount = 0;

    const tw = gsap.to(`.${props.styles.card}`, {
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

          [...document.querySelectorAll(`.${props.styles.card}`)].forEach(
            (el) => {
              const z = (el as HTMLElement).style.zIndex;
              if (z === "-5") {
                gsap.set(el, { opacity: 0 });
              }
            }
          );
        },
      },
      onComplete: () => {
        [...document.querySelectorAll(`.${props.styles.card}`)].forEach(
          (el) => {
            el.classList.remove(props.styles.card);
            el.classList.add(props.styles["card-static-center"]);
            gsap.set(el, { opacity: 1, x: 0, y: 0 });
          }
        );

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
            `.${props.styles["card-static-center"]}:nth-child(${childIdx})`,
            {
              y: () => -document.documentElement.clientHeight / 2,
              onComplete: () => {
                const el = document.querySelector(
                  `.${props.styles["card-static-center"]}:nth-child(${childIdx})`
                );
                assert(el);
                el.classList.remove(`${props.styles["card-static-center"]}`);
                el.classList.add(`${props.styles["card-top"]}`);
                gsap.set(el, { x: 0, y: 0 });
              },
            },
            tlPosition
          );
          if (PLAYER_COUNT > 2) {
            tl.to(
              `.${props.styles["card-static-center"]}:nth-child(${
                childIdx + 1
              })`,
              {
                x: () => document.documentElement.clientWidth / 2,
                onComplete: () => {
                  const el = document.querySelector(
                    `.${props.styles["card-static-center"]}:nth-child(${
                      childIdx + 1
                    })`
                  );
                  assert(el);
                  el.classList.remove(`${props.styles["card-static-center"]}`);
                  el.classList.add(`${props.styles["card-right"]}`);
                  gsap.set(el, { x: 0, y: 0 });
                },
              },
              tlPosition
            );
          }
          tl.to(
            `.${props.styles["card-static-center"]}:nth-child(${
              childIdx + (PLAYER_COUNT > 2 ? 2 : 1)
            })`,
            {
              y: () =>
                document.documentElement.clientHeight / 2 - cardHeight / 2,
              onComplete: () => {
                const el = document.querySelector(
                  `.${props.styles["card-static-center"]}:nth-child(${
                    childIdx + (PLAYER_COUNT > 2 ? 2 : 1)
                  })`
                );
                assert(el);
                el.classList.remove(`${props.styles["card-static-center"]}`);
                el.classList.add(`${props.styles["card-bottom"]}`);
                gsap.set(el, { x: 0, y: 0 });
              },
            },
            tlPosition
          );
          if (PLAYER_COUNT > 3) {
            tl.to(
              `.${props.styles["card-static-center"]}:nth-child(${
                childIdx + 3
              })`,
              {
                x: () => -document.documentElement.clientWidth / 2,
                onComplete: () => {
                  const el = document.querySelector(
                    `.${props.styles["card-static-center"]}:nth-child(${
                      childIdx + 3
                    })`
                  );
                  assert(el);
                  el.classList.remove(`${props.styles["card-static-center"]}`);
                  el.classList.add(`${props.styles["card-left"]}`);
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
          `.${props.styles["card-static-center"]}:nth-child(${
            PLAYER_COUNT * CARDS_PER_PLAYER + 1
          })`,
          {
            x: () => (cardHeight - cardWidth) / 2,
            rotateZ: 90,
            onComplete: () => {
              props.setTrump();
            },
          }
        );

        tl.to(
          `.${props.styles["card-static-center"]}:nth-child(${
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
          `.${props.styles["card-static-center"]}:nth-child(n+${
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
                `.${props.styles["card-static-center"]}:nth-child(n+${
                  PLAYER_COUNT * CARDS_PER_PLAYER + 1
                })`
              );
              assert(els);
              els.forEach((el, i) => {
                el.classList.remove(`${props.styles["card-static-center"]}`);
                el.classList.add(
                  `${
                    i === 0
                      ? props.styles["card-top-left-trump"]
                      : props.styles["card-top-left"]
                  }`
                );
                gsap.set(el, { x: 0, y: 0 });
              });

              gsap.set(
                `.${props.styles["card-left"]},.${props.styles["card-right"]}`,
                {
                  rotateZ: 90,
                }
              );

              props.revealUserCards();

              props.sortCards();
            },
          },
          "<0%"
        );

        setTweens((prev) => [...prev, tl]);
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

  return (
    <>
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
