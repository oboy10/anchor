import type { Metadata } from "next";
import { Geist, Instrument_Serif, Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: "normal",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://anchor.lahs.win"),
  title: {
    default: "Anchor — Verified reputation you own",
    template: "%s · Anchor",
  },
  description:
    "A resident-controlled verified reputation wallet. Portable, positive credentials you share on your own terms — not a credit score, not a background check.",
  applicationName: "Anchor",
  icons: {
    icon: "/anchor-logo.png",
    apple: "/anchor-logo.png",
  },
  openGraph: {
    title: "Anchor — Verified reputation you own",
    description:
      "Portable credentials for people rebuilding after homelessness. Cryptographically signed. Resident-controlled.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
