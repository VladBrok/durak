import { useEffect, useState } from "react";
import { getCssVarValue } from "../utils/get-css-var-value";
import { debounce } from "../utils/debounce";

export function useCardSize(): [number, number] {
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    const set = () => {
      setCardWidth(getCssVarValue("--card-width"));
      setCardHeight(getCssVarValue("--card-height"));
    };

    const setIfChanged = debounce(() => {
      if (
        cardWidth !== getCssVarValue("--card-width") ||
        cardHeight !== getCssVarValue("--card-height")
      ) {
        set();
      }
    });

    set();

    window.addEventListener("resize", setIfChanged);

    return () => window.removeEventListener("resize", setIfChanged);
  }, [cardHeight, cardWidth]);

  return [cardWidth, cardHeight];
}
