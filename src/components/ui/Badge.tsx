import type { ReactNode } from "react";

type Props = {
  tone: "draft" | "published" | "featured";
  children: ReactNode;
};

const tones = {
  draft: "text-muted border-text/15",
  published: "text-copper border-copper/40",
  featured: "text-ice border-ice/40",
} as const;

export function Badge({ tone, children }: Props) {
  return (
    <span
      className={`text-[10px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
