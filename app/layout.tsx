import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office Pool Ladder",
  description: "A fast, playful pool ladder for office matches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
