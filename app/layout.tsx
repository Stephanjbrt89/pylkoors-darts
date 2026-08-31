import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Ensure this line exists and is correct!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pylkoors Darts Arcade",
  description: "The ultimate home bar darts experience.",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#050505]">
      <body className={`${inter.className} bg-[#050505] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}