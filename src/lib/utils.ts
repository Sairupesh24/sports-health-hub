import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Loads an image from a URL and returns its natural dimensions.
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Important for CORS
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
    img.onerror = (e) => reject(new Error("Failed to load image: " + url));
    img.src = url;
  });
}
