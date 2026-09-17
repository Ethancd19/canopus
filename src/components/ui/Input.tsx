import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid = false, className = "", ...rest }: Props) {
  return (
    <input
      {...rest}
      className={`w-full h-9 rounded-sm bg-navy-mid border ${
        invalid ? "border-danger/60" : "border-text/10"
      } px-3 font-mono text-[13px] text-text placeholder:text-faint focus:border-ice/60 focus:outline-none ${className}`}
    />
  );
}
