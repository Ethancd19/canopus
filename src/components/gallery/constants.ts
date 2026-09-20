export type Format = "DIGITAL" | "FILM_35MM" | "FILM_120MM";

export const FORMAT_LABELS: Record<Format, string> = {
  DIGITAL: "Digital",
  FILM_35MM: "35mm",
  FILM_120MM: "120",
};

export const ALL_FORMATS = ["All", "Digital", "35mm", "120"] as const;
export const ALL_GENRES = [
  "All",
  "Landscape",
  "Astro",
  "Architecture",
  "Sports",
  "Underwater",
  "Street",
  "Portrait",
] as const;

export const EMPTY_MESSAGES = [
  "Nothing is here just yet... but something's coming!",
  "This category is still being developed. Literally.",
  "The shutter is closed on this one for now. Check back later!",
  "Blank frame. Give it some time to develop!",
  "Not yet captured. The light wasn't right.",
  "This one's still in the darkroom. Stay tuned!",
  "Filed under: soon™",
  "This category is still loading... must be a really long exposure.",
  "The film is still rolling on this one. Check back soon!",
  "This section is still being composed. Patience is a virtue!",
  "Patience, young padawan. This category is still being formed.",
  "Zero photos here yet. The photographer is aware and honestly a bit embarrassed.",
  "Even the tumbleweeds are taking a break here.",
  "Still loading... just kidding, there are actually no photos here yet. But soon!",
  "Lens cap was on... We don't talk about it.",
  "Currently vibes only. No photos have been captured here yet.",
  "Nothing to see here... Which is ironic, for a photography site.",
];

export const CHEEKY_MESSAGES = [
  "There's still nothing... Are you testing me?",
  "Yep, still nothing. The suspense is killing me too.",
  "You're really committed to finding something that isn't there, huh?",
  "I admire your dedication to this fruitless quest.",
  "At this point, you might as well just stare at the wall. It has about as much content as this section.",
  "Okay seriously, it's just empty. Maybe go outside or something?",
  "Okay at this point I'm starting to feel bad for you. There's really nothing here.",
  "The photographer has been notified of your persistence.",
  "Bold strategy. Still empty though.",
  "This is a test of willpower. You are doing... fine, I guess?",
  "I see you. Still nothing here, but I see you.",
  "Dang, you really want what I don't have...",
  "This is getting a bit awkward, isn't it?",
  "Okay fine... I'll tell the photographer to get out more.",
];

export function pickRandom(pool: string[], history: string[], avoidCount = 3): string {
  const recent = history.slice(-avoidCount);
  const available = pool.filter((m) => !recent.includes(m));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

// ─── Theme-aware color helper ─────────────────────────────────────────────────

export function tc(light: string, dark: string, theme: "light" | "dark") {
  return theme === "light" ? light : dark;
}

// Light theme uses very dark navy text on slate bg for maximum contrast
export const LIGHT = {
  text: "#0E1824",
  textMuted: "#2A3A4A",
  textFaint: "rgba(14,24,36,0.45)",
  border: "rgba(14,24,36,0.25)",
  borderFaint: "rgba(14,24,36,0.12)",
  activeBg: "rgba(14,24,36,0.08)",
};

export const DARK = {
  text: "#D4DCE8",
  textMuted: "rgba(212,220,232,0.6)",
  textFaint: "rgba(212,220,232,0.35)",
  border: "rgba(212,220,232,0.3)",
  borderFaint: "rgba(212,220,232,0.08)",
  activeBg: "rgba(212,220,232,0.08)",
};
