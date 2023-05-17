"use client";

import { useState } from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { RemountContextProvider } from "../context/remount-context";

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
