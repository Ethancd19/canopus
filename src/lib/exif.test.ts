import { describe, expect, it } from "vitest";
import { mapExif } from "@/lib/exif";

describe("mapExif", () => {
  it("combines make and model into camera", () => {
    expect(mapExif({ Make: "Sony", Model: "A7IV" })).toEqual({ camera: "Sony A7IV" });
  });

  it("formats sub-second exposures as a fraction", () => {
    expect(mapExif({ ExposureTime: 1 / 250 })).toEqual({ shutterSpeed: "1/250" });
  });

  it("formats exposures of a second or more with an 's' suffix", () => {
    expect(mapExif({ ExposureTime: 2 })).toEqual({ shutterSpeed: "2s" });
  });

  it("formats focal length rounded to the nearest mm", () => {
    expect(mapExif({ FocalLength: 50.4 })).toEqual({ focalLength: "50mm" });
  });

  it("formats aperture as a plain number string", () => {
    expect(mapExif({ FNumber: 2.8 })).toEqual({ aperture: "2.8" });
  });

  it("maps lens, iso and takenAt", () => {
    const takenAt = new Date("2024-05-01T12:00:00.000Z");
    expect(mapExif({ LensModel: "24-70mm f/2.8", ISO: 400, DateTimeOriginal: takenAt })).toEqual({
      lens: "24-70mm f/2.8",
      iso: "400",
      takenAt: takenAt.toISOString(),
    });
  });

  it("ignores missing fields", () => {
    expect(mapExif({})).toEqual({});
  });

  it("ignores unrelated keys", () => {
    expect(mapExif({ SomeRandomKey: "x" })).toEqual({});
  });

  it("does not throw and omits takenAt for an invalid Date", () => {
    expect(() => mapExif({ DateTimeOriginal: new Date("garbage") })).not.toThrow();
    expect(mapExif({ DateTimeOriginal: new Date("garbage") })).toEqual({});
  });
});
