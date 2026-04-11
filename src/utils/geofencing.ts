/**
 * Utility functions for geofencing and distance calculations.
 */

/**
 * Calculates the distance between two points in meters using the Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Checks if a location is potentially spoofed or mocked.
 * Note: Browser detection is limited. This is a basic check.
 */
export function detectMockLocation(position: GeolocationPosition): {
  isMocked: boolean;
  reason?: string;
} {
  // Check accuracy. Very high accuracy (e.g., < 1m) consistently can sometimes be a sign of mock locations,
  // but mostly we look for extremely low accuracy or specific flags.
  const { accuracy } = position.coords;

  // Most browsers don't expose 'mocked' flag directly anymore for privacy.
  // However, we can check if accuracy is exactly 0 or some other suspicious value.
  if (accuracy === 0) {
    return { isMocked: true, reason: "Invalid accuracy reading (0)" };
  }

  // Basic check for extreme accuracy which is rare for standard GPS
  if (accuracy < 0.1) {
    return { isMocked: true, reason: "Suspiciously high accuracy" };
  }

  return { isMocked: false };
}

/**
 * Gets the current location with proper promise handling.
 */
export function getCurrentLocation(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    });
  });
}
