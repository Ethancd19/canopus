import type { Metadata } from "next";
import { CREDENTIAL_LINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sports & Events · Canopus",
  description: CREDENTIAL_LINE,
};

export default function SportsLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0E1824", minHeight: "100vh" }}>{children}</div>;
}
