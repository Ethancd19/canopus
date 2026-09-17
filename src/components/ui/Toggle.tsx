type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Track color when checked. Defaults to "ice"; "copper" is reserved for publish state. */
  tone?: "copper" | "ice";
};

const TONE_ON = {
  copper: "bg-copper",
  ice: "bg-ice",
} as const;

export function Toggle({ checked, onChange, label, disabled = false, tone = "ice" }: Props) {
  return (
    <label className="inline-flex items-center gap-2 font-mono text-[12px] text-text select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? TONE_ON[tone] : "bg-faint"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-navy transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
