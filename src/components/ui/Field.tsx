import type { ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, htmlFor, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-mono text-[12px] text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-faint text-[11px]">{hint}</p>}
      {error && <p className="text-danger text-[11px]">{error}</p>}
    </div>
  );
}
