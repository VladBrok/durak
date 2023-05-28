import styles from "./mobile-controls.module.css";
import Image from "next/image";
import { ControlButton } from "../../utils/config";

export interface IMobileControlsProps {
  onClick: (button: ControlButton) => void;
}

const BUTTON_SIZE = 40;

export default function MobileControls(props: IMobileControlsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <Image
          className={styles.button}
          onClick={() => props.onClick("ArrowUp")}
          src={"/images/mobile-controls/arrow-up.png"}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          alt="up"
          priority
        />
      </div>
      <div className={styles.bottom}>
        <Image
          className={`${styles.button} ${styles["button-position-fixup"]}`}
          onClick={() => props.onClick("ArrowLeft")}
          src={"/images/mobile-controls/arrow-left.png"}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          alt="left"
          priority
        />
        <Image
          className={styles.button}
          onClick={() => props.onClick("ArrowDown")}
          src={"/images/mobile-controls/arrow-down.png"}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          alt="down"
          priority
        />
        <Image
          className={styles.button}
          onClick={() => props.onClick("ArrowRight")}
          src={"/images/mobile-controls/arrow-right.png"}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          alt="right"
          priority
        />
      </div>
    </div>
  );
}
