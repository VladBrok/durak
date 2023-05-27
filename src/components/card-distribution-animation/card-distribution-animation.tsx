import styles from "./card-distribution-animation.module.css";
import { useEffect, useRef, useState } from "react";
import { useCardSize } from "../../hooks/use-card-size";
import {
  CARDS_PER_PLAYER,
  CARD_COUNT_FOR_ANIMATION,
  CARD_MOVEMENT_DURATION_IN_SECONDS,
  PLAYER_COUNT,
} from "../../utils/config";
import assert from "assert";
import TextButton from "../text-button/text-button";
import { gsap } from "gsap";
import { screenHeight, screenWidth } from "../../utils/screen";

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
  const [showSkipAnimationButton, setShowSkipAnimationButton] = useState(
    // process.env.NODE_ENV === "production"
    true
  ); // TODO

  const startedAnimation = useRef(false);

  useEffect(() => {
    if (startedAnimation.current || !cardWidth || !cardHeight) {
      return;
    }

    startedAnimation.current = true;

    const cardElements = [
      ...document.querySelectorAll(`.${props.styles.card}`),
    ];

    gsap.set(cardElements, {
      y: 0,
      x: () => screenWidth(),
    });

    const cornerMovementTl = gsap.timeline({ defaults: { duration: 1.7 } });

    cornerMovementTl.to(cardElements, {
      y: () => screenHeight() + cardHeight,
    });
    cornerMovementTl.to(
      cardElements,
      {
        x: () => -cardWidth,
      },
      "<95%"
    );
    cornerMovementTl.to(
      cardElements,
      {
        y: 0,
      },
      "<95%"
    );
    cornerMovementTl.to(
      cardElements,
      {
        x: () => screenWidth() + cardWidth,
      },
      "<95%"
    );

    setTweens((prev) => [...prev, cornerMovementTl]);

    let cardsAtCenterCount = 0;

    const tw = gsap.to(cardElements, {
      y: () => screenHeight() / 2 + cardHeight / 2,
      x: () => screenWidth() / 2 - cardWidth / 2,
      duration: 1.5,
      stagger: {
        each: 0.14,
        onComplete: () => {
          cardsAtCenterCount++;

          if (CARD_COUNT_FOR_ANIMATION - cardsAtCenterCount < 10) {
            return;
          }

          const el = cardElements[cardsAtCenterCount - 1];
          assert(el);
          gsap.set(el, { opacity: 0 });
          gsap.killTweensOf(el);
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
            duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
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
              y: () => -screenHeight() / 2,
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
                x: () => screenWidth() / 2,
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
              y: () => screenHeight() / 2 - cardHeight / 2,
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
                x: () => -screenWidth() / 2,
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

        const remainingCards = [
          ...document.querySelectorAll(
            `.${props.styles["card-static-center"]}:nth-child(n+${
              PLAYER_COUNT * CARDS_PER_PLAYER + 1
            })`
          ),
        ];
        gsap.set(remainingCards.slice(2), { opacity: 0 });

        tl.to(remainingCards[0], {
          x: () =>
            -screenWidth() / 2 + cardWidth / 2 + (cardHeight - cardWidth) / 2,
          y: () => -screenHeight() / 2 + cardHeight / 2,
          duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
          delay: 0.5,
          ease: "none",
        });

        tl.to(
          remainingCards[1],
          {
            x: () => -screenWidth() / 2 + cardWidth / 2,
            y: () => -screenHeight() / 2 + cardHeight / 2,
            duration: CARD_MOVEMENT_DURATION_IN_SECONDS,
            ease: "none",
            onComplete: () => {
              remainingCards.forEach((el, i) => {
                el.classList.remove(`${props.styles["card-static-center"]}`);
                el.classList.add(
                  `${
                    i === 0
                      ? props.styles["card-top-left-trump"]
                      : props.styles["card-top-left"]
                  }`
                );
                gsap.set(el, { opacity: 1, x: 0, y: 0 });
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
  }, [cardWidth, cardHeight, props]);

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
            text="Skip"
            onClick={() => setShowSkipAnimationButton(false)}
          />
        </div>
      )}
    </>
  );
}
