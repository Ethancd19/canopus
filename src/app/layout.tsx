import type { Metadata } from "next";
import { MotionConfig } from "motion/react";
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
      <body>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
