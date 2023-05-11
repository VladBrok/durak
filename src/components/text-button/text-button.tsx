import { useEffect, useRef, useState } from "react";
import styles from "./text-button.module.css";
import assert from "assert";

export interface ITextButtonProps {
  onClick: () => void;
  text: string;
}

export default function TextButton(props: ITextButtonProps) {
  const textRef = useRef<SVGTextElement | null>(null);
  const [svgWidth, setSvgWidth] = useState(0);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    assert(textRef.current);

    const textBox = textRef.current.getBBox();

    setSvgWidth(textBox.width);
    setSvgHeight(textBox.height);
  }, [props.text]);

  return (
    <button className={styles["container"]} onClick={props.onClick}>
      <svg
        className={styles["text-svg"]}
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad2" y2="1" x2="1" x1="1" y1="0.1433">
            <stop stopColor="#FFD382" offset="0" />
            <stop stopColor="rgb(179, 149, 0)" offset="0.6817" />
            <stop stopColor="rgb(179, 149, 0)" offset="1" />
          </linearGradient>
        </defs>
        <text
          ref={textRef}
          fontFamily="arial"
          fontSize="40"
          id="svg_1"
          y="45"
          x="288"
          fill="url(#grad2)"
          fontWeight="bold"
        >
          <tspan x="0" y="36">
            {props.text}
          </tspan>
        </text>
      </svg>
    </button>
  );
}
