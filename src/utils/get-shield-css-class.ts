import styles from "../app/scenes/game-scene/page.module.css";

export function getShieldCssClass(cardCssClass: string): string {
  return cardCssClass === styles["card-top"]
    ? styles["shield-top"]
    : cardCssClass === styles["card-bottom"]
    ? styles["shield-bottom"]
    : cardCssClass === styles["card-left"]
    ? styles["shield-left"]
    : styles["shield-right"];
}
