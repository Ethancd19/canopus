import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canopus",
  description: "Photography by Ethan Duval",
  openGraph: {
    title: "Canopus",
    description: "Photography by Ethan Duval",
    url: "https://bycanopus.com",
    siteName: "Canopus",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
