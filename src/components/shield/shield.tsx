import styles from "./shield.module.css";
import Image from "next/image";
import assert from "assert";
import { useRef, useEffect } from "react";
import { getShieldCssClass } from "../../utils/get-shield-css-class";
import { useCardSize } from "../../hooks/use-card-size";
import { IPlayer } from "../../utils/config";

export interface IShieldProps {
  isGameStarted: boolean;
  isRoundLost: boolean;
  defendingPlayer: IPlayer;
}

export default function Shield(props: IShieldProps) {
  const [cardWidth, cardHeight] = useCardSize();
  const shieldRef = useRef<HTMLDivElement | null>(null);

  const imageWidth = cardWidth / 2;
  const imageHeight = cardHeight / 2.5;

  useEffect(() => {
    if (!props.isGameStarted) {
      return;
    }

    assert(shieldRef.current);

    shieldRef.current.className = "";
    shieldRef.current.classList.add(
      getShieldCssClass(props.defendingPlayer.cardCssClassName)
    );
  }, [props.defendingPlayer.cardCssClassName, props.isGameStarted]);

  return (
    <div ref={shieldRef} className={styles.hidden}>
      <Image
        src={
          props.isRoundLost
            ? "/images/shield-broken.png"
            : "/images/shield-regular.png"
        }
        width={imageWidth}
        height={imageHeight}
        alt=""
      />
    </div>
  );
}
