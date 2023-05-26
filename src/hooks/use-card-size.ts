import { useEffect, useState } from "react";
import { getCssVarValue } from "../utils/get-css-var-value";

export function useCardSize(): [number, number] {
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    // TODO: remove "/ 2"
    setCardWidth(getCssVarValue("--card-width") / 2);
    setCardHeight(getCssVarValue("--card-height") / 2);
  }, []);

  return [cardWidth, cardHeight];
}
