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

/**
 * Formats a client's full name, always including their middle name when present.
 */
export function formatClientName(
  client?: any,
  options: { includeHonorific?: boolean; fallback?: string } = {}
): string {
  if (!client) return options.fallback || "";
  if (typeof client === "string") return client.trim();

  const honorific = options.includeHonorific ? (client.honorific || client.client_honorific) : null;
  const first = client.first_name ?? client.firstName ?? client.client_first_name;
  const middle = client.middle_name ?? client.middleName ?? client.client_middle_name;
  const last = client.last_name ?? client.lastName ?? client.client_last_name;

  const parts = [honorific, first, middle, last]
    .filter(Boolean)
    .map(s => String(s).trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return client.client_name || client.full_name || client.name || options.fallback || "";
}

/**
 * Helper to join first, middle, and last name strings into a full name.
 */
export function formatFullName(
  first?: string | null,
  middle?: string | null,
  last?: string | null,
  honorific?: string | null
): string {
  return [honorific, first, middle, last]
    .filter(Boolean)
    .map(s => String(s).trim())
    .filter(Boolean)
    .join(" ");
}

