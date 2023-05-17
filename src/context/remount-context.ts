import { createContext } from "react";

const RemountContext = createContext(() => {});

export default RemountContext;
export const RemountContextProvider = RemountContext.Provider;
