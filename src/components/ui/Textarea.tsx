import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid = false, className = "", ...rest }: Props) {
  return (
    <textarea
      {...rest}
      className={`w-full min-h-24 py-2 rounded-sm bg-navy-mid border ${
        invalid ? "border-danger/60" : "border-text/10"
      } px-3 font-mono text-[13px] text-text placeholder:text-faint focus:border-ice/60 focus:outline-none ${className}`}
    />
  );
}
