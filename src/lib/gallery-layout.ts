/** Column counts and breakpoints shared by the grid CSS and the `sizes` hint. */
export const GALLERY_COLUMNS = { wide: 4, desktop: 3, tablet: 2, phone: 1 } as const;
export const GALLERY_BREAKPOINTS = { wide: 1600, tablet: 1024, phone: 640 } as const;
export const GALLERY_GAP = "6px";
export const GALLERY_SIZES =
  `(max-width: ${GALLERY_BREAKPOINTS.phone}px) 100vw, ` +
  `(max-width: ${GALLERY_BREAKPOINTS.tablet}px) 50vw, ` +
  `(min-width: ${GALLERY_BREAKPOINTS.wide}px) 25vw, 33vw`;
