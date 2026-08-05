type CompressionOptions = {
  maxDimension: number;
  quality: number;
};

async function loadImage(file: File) {
  if ("createImageBitmap" in window) return createImageBitmap(file);

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível processar a fotografia."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressObjectImage(file: File, options: CompressionOptions) {
  const image = await loadImage(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const scale = Math.min(1, options.maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível preparar a fotografia.");
  context.drawImage(image, 0, 0, width, height);
  if ("close" in image && typeof image.close === "function") image.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (output) => (output ? resolve(output) : reject(new Error("Falha ao comprimir fotografia."))),
      "image/webp",
      options.quality,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "objeto";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

export function validateObjectImage(file: File) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) return "Use fotografias JPG, PNG ou WebP.";
  if (file.size > 12 * 1024 * 1024)
    return "Cada fotografia deve ter no máximo 12 MB antes da compressão.";
  return null;
}
