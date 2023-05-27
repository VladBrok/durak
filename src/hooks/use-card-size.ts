import { useEffect, useState } from "react";
import { getCssVarValue } from "../utils/get-css-var-value";

export function useCardSize(): [number, number] {
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    setCardWidth(getCssVarValue("--card-width"));
    setCardHeight(getCssVarValue("--card-height"));
  }, []);

  return [cardWidth, cardHeight];
}
