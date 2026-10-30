export class FeatureError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function errorText(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e?.code === "23P01")
    return "DATE_CONFLICT: These dates overlap another reservation.";
  return e?.message || "Could not complete the operation. Try again.";
}
export function requireText(value: string, label: string) {
  if (!value.trim())
    throw new FeatureError("VALIDATION", `${label} is required.`);
  return value.trim();
}
export function imageExtension(file: File) {
  const ext: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!ext[file.type])
    throw new FeatureError("VALIDATION", "Choose a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw new FeatureError("VALIDATION", "Images must be 5 MB or smaller.");
  return ext[file.type];
}
