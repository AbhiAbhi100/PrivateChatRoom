import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Private Chat Room - Secure Encrypted Communication",
  description:
    "Create secure, ephemeral chat rooms with end-to-end encryption. No sign-up required. Rooms auto-expire for your privacy.",
  keywords: [
    "private chat",
    "encrypted messaging",
    "secure video call",
    "ephemeral chat",
    "anonymous chat",
  ],
  authors: [{ name: "Private Chat Room" }],
  robots: "index, follow",
  openGraph: {
    title: "Private Chat Room - Secure Encrypted Communication",
    description:
      "Create secure, ephemeral chat rooms with end-to-end encryption.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
