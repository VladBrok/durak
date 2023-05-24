import styles from "./card-images-preloader.module.css";
import Image from "next/image";
import { makeDeck, getImageSrc } from "../../utils/card";
import { useCardSize } from "../../hooks/use-card-size";
import { memo } from "react";

const DECK = makeDeck({ isShuffled: false });

export default memo(function CardImagesPreloader() {
  const [cardWidth, cardHeight] = useCardSize();

  return (
    <>
      {DECK.map((card, i) => {
        return (
          <Image
            className={styles.image}
            key={i}
            src={getImageSrc(card, true)}
            width={cardWidth}
            height={cardHeight}
            alt=""
            priority
          />
        );
      })}
    </>
  );
});
