import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canopus",
  description: "Photography portfolio. Digital and film. Ethan Duval.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
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
