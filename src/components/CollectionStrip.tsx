"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import imageLoader from "@/lib/image-loader";
import { photoAlt } from "@/lib/photo-alt";
import type { PublicCollectionSummary } from "@/lib/public-queries";

const ROW_HEIGHT = "clamp(140px, 22vw, 220px)";

export function CollectionStrip({ collections }: { collections: PublicCollectionSummary[] }) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "#B87333",
          opacity: 0.9,
          marginBottom: "0.5rem",
        }}
      >
        Collections
      </p>

      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          scrollSnapType: "x proximity",
          paddingBottom: "0.5rem",
        }}
      >
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/work/${collection.slug}`}
            style={{ textDecoration: "none", scrollSnapAlign: "start", flex: "0 0 auto" }}
          >
            <div style={{ height: ROW_HEIGHT }}>
              {collection.cover ? (
                <Image
                  loader={imageLoader}
                  src={collection.cover.storageKey}
                  alt={photoAlt(collection.cover)}
                  width={collection.cover.width}
                  height={collection.cover.height}
                  sizes={`${Math.ceil(220 * collection.cover.aspectRatio)}px`}
                  quality={80}
                  placeholder={collection.cover.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={collection.cover.blurDataUrl ?? undefined}
                  style={{ height: "100%", width: "auto" }}
                />
              ) : (
                <div style={{ height: "100%", aspectRatio: "3 / 2", background: "#111F2E" }} />
              )}
            </div>

            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.1rem",
                fontWeight: 300,
                color: "#D4DCE8",
                marginTop: "0.5rem",
                marginBottom: "0.15rem",
              }}
            >
              {collection.title}
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "rgba(212,220,232,0.4)",
              }}
            >
              {collection.count === 1 ? "1 photo" : `${collection.count} photos`}
            </p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
