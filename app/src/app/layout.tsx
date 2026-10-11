import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Munera — Enter the arena. Earn your reward.",
  description:
    "Content bounties with onchain escrow on Solana. Sponsors lock USDC, creators compete, approvals pay instantly.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
