"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PolarisMarkIcon } from "@/components/PolarisMark";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/app/admin/actions";

const NAV_LINKS = [
  { label: "Library", href: "/admin" },
  { label: "Upload", href: "/admin/upload" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-navy text-text flex">
      <aside className="w-[200px] shrink-0 border-r border-text/10 flex flex-col p-5 gap-6">
        <div className="flex items-center gap-2">
          <PolarisMarkIcon size={18} color="#A8C5DA" />
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-text">
            Canopus
          </span>
        </div>

        <nav className="flex flex-col gap-3">
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`font-mono text-[12px] ${
                  active ? "text-text" : "text-muted hover:text-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] text-muted hover:text-text"
          >
            View site
          </a>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-8 py-7 max-w-[1400px]">
        {children}
      </main>
    </div>
  );
}
