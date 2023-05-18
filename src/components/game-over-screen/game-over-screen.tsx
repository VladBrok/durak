import assert from "assert";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { IPlayer } from "../../utils/config";
import { getDurakHatCssClass } from "../../utils/get-durak-hat-css-class";
import TextButton from "../text-button/text-button";
import RemountContext from "../../context/remount-context";
import Image from "next/image";
import styles from "./game-over-screen.module.css";
import { useCardSize } from "../../hooks/use-card-size";
import { gsap } from "gsap";

export interface IGameOverScreenProps {
  lostPlayer: IPlayer | null;
}

export default function GameOverScreen(props: IGameOverScreenProps) {
  const [isShow, setIsShow] = useState(false);
  const [cardWidth] = useCardSize();
  const remount = useContext(RemountContext);
  const durakHatRef = useRef<HTMLDivElement | null>(null);

  const durakHatWidth = cardWidth * 2;
  const durakHatHeight = cardWidth;

  const gameOver = useCallback((lostPlayer: IPlayer) => {
    const timeline = gsap.timeline();

    assert(durakHatRef.current);

    durakHatRef.current.className = "";
    durakHatRef.current.classList.add(
      getDurakHatCssClass(lostPlayer?.cardCssClassName)
    );

    timeline.fromTo(
      durakHatRef.current.querySelector("img"),
      {
        scale: 0,
      },
      { scale: 1, ease: "elastic.out(1, 0.3)", duration: 2 }
    );

    timeline.fromTo(
      `.${styles.overlay}`,
      {
        display: "block",
        opacity: 0,
      },
      {
        opacity: 0.4,
        onComplete: () => {
          setTimeout(() => {
            setIsShow(true);
          }, 500);
        },
      }
    );
  }, []);

  useEffect(() => {
    if (!props.lostPlayer) {
      return;
    }

    gameOver(props.lostPlayer);
  }, [gameOver, props.lostPlayer]);

  return (
    <>
      {isShow && (
        <div className={styles.container}>
          <div className={styles.content}>
            <TextButton text="Game Over" disabled scale={1.6} />
            <TextButton text="Play again" onClick={remount} />
          </div>
        </div>
      )}

      <div className={styles.overlay}></div>

      <div ref={durakHatRef} className={styles.hidden}>
        <Image
          src="/images/durak-hat.png"
          width={durakHatWidth}
          height={durakHatHeight}
          alt=""
        />
      </div>
    </>
  );
}
