// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// THIS IS THE PART TO CHANGE:
export const metadata: Metadata = {
  title: "Pylkoors Darts",
  description: "The ultimate home bar darts experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050505]`}>
        {children}
      </body>
    </html>
  );
}