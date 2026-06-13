import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
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
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trustwallet.example.com"),
  title: {
    default: "TrustWallet — a resident-controlled verified record",
    template: "%s · TrustWallet",
  },
  description:
    "TrustWallet is a resident-owned trust and reputation wallet. Shelters, landlords, employers, and caseworkers issue verified positive credentials. The resident decides what to share.",
  applicationName: "TrustWallet",
  openGraph: {
    title: "TrustWallet — a resident-controlled verified record",
    description:
      "Verified positive credentials, controlled by the resident. Not a score.",
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
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
