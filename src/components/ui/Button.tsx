import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-mono whitespace-nowrap select-none " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-copper text-navy hover:bg-copper/90",
  secondary: "border border-text/15 text-text hover:border-text/40 bg-transparent",
  danger: "border border-danger/40 text-danger hover:bg-danger/10 bg-transparent",
  ghost: "text-muted hover:text-text bg-transparent",
} as const;

const sizes = { sm: "h-8 px-3 text-[12px]", md: "h-9 px-4 text-[13px]" } as const;

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <span aria-hidden className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
      {children}
    </button>
  );
}
