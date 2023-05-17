import styles from "../app/scenes/game-scene/page.module.css";

export function getDurakHatCssClass(cardCssClass: string): string {
  return cardCssClass === styles["card-top"]
    ? styles["durak-hat-top"]
    : cardCssClass === styles["card-bottom"]
    ? styles["durak-hat-bottom"]
    : cardCssClass === styles["card-left"]
    ? styles["durak-hat-left"]
    : styles["durak-hat-right"];
}
