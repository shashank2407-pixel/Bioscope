export interface PreparedImage {
  /** Sent to the identification API. */
  dataUrl: string;
  /** Smaller copy stored with the saved scan. */
  thumbUrl: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file couldn’t be opened as an image. Use a JPEG, PNG or WebP photo.'));
    };
    img.src = url;
  });
}

function encode(img: HTMLImageElement, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser couldn’t process this image.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Downscales a photo so uploads stay fast and scans fit in localStorage. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('That file isn’t an image. Choose a JPEG, PNG or WebP photo.');
  }
  const img = await loadImage(file);
  try {
    return { dataUrl: encode(img, 1280, 0.86), thumbUrl: encode(img, 640, 0.8) };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}
