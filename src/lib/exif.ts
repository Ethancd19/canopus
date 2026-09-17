export type ExifFields = {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  takenAt?: string;
};

function toIsoString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value === "string" && value) {
    return Number.isNaN(new Date(value).getTime()) ? undefined : value;
  }
  return undefined;
}

/**
 * Maps raw `exifr` output (keyed by `Make`, `Model`, `LensModel`,
 * `FocalLength`, `FNumber`, `ExposureTime`, `ISO`, `DateTimeOriginal`) to the
 * display strings the Photo form fields use.
 */
export function mapExif(raw: Record<string, unknown>): ExifFields {
  const out: ExifFields = {};

  const camera = [raw.Make, raw.Model].filter((v) => typeof v === "string" && v).join(" ");
  if (camera) out.camera = camera;

  if (typeof raw.LensModel === "string" && raw.LensModel) out.lens = raw.LensModel;

  if (typeof raw.FocalLength === "number" && Number.isFinite(raw.FocalLength)) {
    out.focalLength = `${Math.round(raw.FocalLength)}mm`;
  }

  if (typeof raw.FNumber === "number" && Number.isFinite(raw.FNumber)) {
    out.aperture = String(raw.FNumber);
  }

  if (typeof raw.ExposureTime === "number" && Number.isFinite(raw.ExposureTime) && raw.ExposureTime > 0) {
    out.shutterSpeed =
      raw.ExposureTime < 1 ? `1/${Math.round(1 / raw.ExposureTime)}` : `${raw.ExposureTime}s`;
  }

  if (typeof raw.ISO === "number" || typeof raw.ISO === "string") {
    if (raw.ISO !== "" && raw.ISO !== 0) out.iso = String(raw.ISO);
  }

  const takenAt = toIsoString(raw.DateTimeOriginal);
  if (takenAt) out.takenAt = takenAt;

  return out;
}
