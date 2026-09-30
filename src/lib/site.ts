/** Public-facing constants shared by the main site and the sports section. */

export const SITE_EMAIL = "ethan@bycanopus.com";

/** One-line credentials and availability, shown on the sports pages and the contact page. */
export const CREDENTIAL_LINE =
  "Former Virginia Tech Athletics photographer · DC area · Available for sports, motorsport, concerts and events";

/** Hub URL of the Sports & Events section. */
export const SPORTS_PATH = "/events";

/** Subject pill preselected when a visitor arrives from the sports section. */
export const BOOKING_SUBJECT = "Sports / events booking";

export type SportsGenre = {
  /** URL segment under /events and the admin collection slug that feeds it. */
  slug: string;
  title: string;
  /** Default one-line description; a published collection's description overrides it. */
  blurb: string;
};

/**
 * The genres of the Sports & Events section, in display order. The list lives
 * here rather than in the database so the hub renders every genre (as
 * "coming soon") before its collection exists.
 */
export const SPORTS_GENRES: readonly SportsGenre[] = [
  {
    slug: "sports",
    title: "Sports",
    blurb: "College and professional athletics, from the sideline to the locker room.",
  },
  {
    slug: "motorsport",
    title: "Motorsport",
    blurb: "Racing, paddock and track days.",
  },
  {
    slug: "live",
    title: "Live",
    blurb: "Concerts, club nights and festivals.",
  },
];

export function getSportsGenre(slug: string): SportsGenre | undefined {
  return SPORTS_GENRES.find((genre) => genre.slug === slug);
}

export function sportsGenrePath(slug: string): string {
  return `${SPORTS_PATH}/${slug}`;
}
