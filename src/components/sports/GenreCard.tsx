import Link from "next/link";
import Image from "next/image";
import imageLoader from "@/lib/image-loader";
import { photoAlt } from "@/lib/photo-alt";
import { sportsGenrePath } from "@/lib/site";
import type { SportsGenreSummary } from "@/lib/public-queries";

const ROW_HEIGHT = "clamp(200px, 28vw, 340px)";

/** One genre's cover, title, blurb and photo count, linking to its page. */
export function GenreCard({ genre }: { genre: SportsGenreSummary }) {
  const countLabel =
    genre.count === 0 ? "Coming soon" : genre.count === 1 ? "1 photo" : `${genre.count} photos`;

  return (
    <Link
      href={sportsGenrePath(genre.slug)}
      style={{ textDecoration: "none", scrollSnapAlign: "start", flex: "0 0 auto" }}
    >
      <div style={{ height: ROW_HEIGHT }}>
        {genre.cover ? (
          <Image
            loader={imageLoader}
            src={genre.cover.storageKey}
            alt={photoAlt(genre.cover)}
            width={genre.cover.width}
            height={genre.cover.height}
            sizes={`${Math.ceil(340 * genre.cover.aspectRatio)}px`}
            quality={80}
            placeholder={genre.cover.blurDataUrl ? "blur" : "empty"}
            blurDataURL={genre.cover.blurDataUrl ?? undefined}
            style={{ height: "100%", width: "auto" }}
          />
        ) : (
          <div
            style={{
              height: "100%",
              aspectRatio: "3 / 2",
              background: "#111F2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(212,220,232,0.35)",
              }}
            >
              Coming soon
            </span>
          </div>
        )}
      </div>

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.4rem",
          fontWeight: 300,
          color: "#D4DCE8",
          marginTop: "0.75rem",
          marginBottom: "0.25rem",
        }}
      >
        {genre.title}
      </p>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "0.95rem",
          color: "rgba(212,220,232,0.6)",
          maxWidth: "34ch",
          marginBottom: "0.5rem",
        }}
      >
        {genre.description ?? genre.blurb}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.15em",
          color: "rgba(212,220,232,0.4)",
        }}
      >
        {countLabel}
      </p>
    </Link>
  );
}
