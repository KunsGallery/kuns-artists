export const AR_V2_GENERATOR_VERSION = "ar-v2.2";
export const AR_V2_LEGACY_GENERATOR_VERSION = "ar-v2.1";

export const DEFAULT_FRONT_BRIGHTNESS = 1.08;
export const LEGACY_FRONT_BRIGHTNESS = 1;
export const MIN_FRONT_BRIGHTNESS = 0.8;
export const MAX_FRONT_BRIGHTNESS = 1.25;

export const FRONT_BRIGHTNESS_PRESETS = [
  {
    value: 1,
    label: "원본 밝기",
    description: "100%",
  },
  {
    value: 1.08,
    label: "조금 밝게",
    description: "108% · 권장",
  },
  {
    value: 1.12,
    label: "밝게",
    description: "112%",
  },
] as const;

export function normalizeFrontBrightness(
  value: unknown,
  fallback = DEFAULT_FRONT_BRIGHTNESS,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    MAX_FRONT_BRIGHTNESS,
    Math.max(MIN_FRONT_BRIGHTNESS, parsed),
  );
}
