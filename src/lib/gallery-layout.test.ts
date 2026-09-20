import { it, expect } from "vitest";
import { GALLERY_SIZES } from "@/lib/gallery-layout";

it("orders the sizes hint from narrowest to widest with a 33vw default", () => {
  expect(GALLERY_SIZES).toBe("(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (min-width: 1600px) 25vw, 33vw");
});
