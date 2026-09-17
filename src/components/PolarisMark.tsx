// ─── Polaris mark — color-aware ───────────────────────────────────────────────

export function PolarisMarkIcon({
  size = 22,
  color = "#A8C5DA",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-80 -80 160 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(0)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(90)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(180)"
      />
      <path
        fill={color}
        d="M0,-66 C11,-38 11,-15 0,0 C-11,-15 -11,-38 0,-66 Z"
        transform="rotate(270)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(45)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(135)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(225)"
      />
      <path
        fill={color}
        d="M0,-37 C4.5,-21 4.5,-9 0,0 C-4.5,-9 -4.5,-21 0,-37 Z"
        transform="rotate(315)"
      />
      <circle fill="transparent" cx="0" cy="0" r="10" />
      <circle fill={color} cx="0" cy="0" r="5" />
    </svg>
  );
}
