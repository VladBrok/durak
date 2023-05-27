"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { RemountContextProvider } from "../context/remount-context";
import { debounce } from "../utils/debounce";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [remountKey, setRemountKey] = useState(Math.random());

  function remount(): void {
    setRemountKey(Math.random());
  }

  useEffect(() => {
    const setCustomVh = debounce(() => {
      const doc = document.documentElement;
      doc.style.setProperty("--vh", window.innerHeight * 0.01 + "px");
    }, 100);

    window.addEventListener("resize", setCustomVh);
    setCustomVh();

    return () => window.removeEventListener("resize", setCustomVh);
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Durak</title>
        <meta
          name="description"
          content="Durak is a traditional Russian card game that is popular in many post-Soviet states"
        />
      </head>
      <body className={inter.className}>
        <RemountContextProvider value={remount}>
          <div key={remountKey}>{children}</div>
        </RemountContextProvider>
      </body>
    </html>
  );
}
