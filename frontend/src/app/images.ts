export function validateImageFile(file: Pick<File, "size" | "type">) {
  // Reject image formats outside JPEG, PNG, and WebP.
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  // Reject an empty image file before attempting to decode it.
  if (file.size === 0) throw new Error("This image file is empty.");
  // Reject source images larger than five megabytes.
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
}
export async function prepareImage(file: File): Promise<string> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("This image could not be opened. Try another file."));
      image.src = url;
    });
    // Reject images whose decoded dimensions are unavailable.
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("This image has no usable dimensions.");
    const scale = Math.min(
      1,
      1200 / image.naturalWidth,
      1200 / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    // Stop when the browser cannot create the canvas needed for resizing.
    if (!context) throw new Error("This browser cannot process image uploads.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.75);
    // Reject an encoded image that still exceeds the domain's size limit.
    if (data.length > 2_000_000)
      throw new Error(
        "This photo is too large to save. Choose a smaller image.",
      );
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
