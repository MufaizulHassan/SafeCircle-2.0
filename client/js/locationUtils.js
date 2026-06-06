// js/locationUtils.js
// Haversine formula and browser geolocation helper

/**
 * Calculate distance (km) between two lat/lon using Haversine formula.
 * Returns distance in kilometers (float).
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371.0; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * getUserLocation - asks browser for current position.
 * Resolves { lat, lon } or rejects with error message.
 */
async function getUserLocation(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject("Geolocation not supported by this browser.");
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject("Location request timed out.");
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (timedOut) return;
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        // Provide friendly messages
        if (err.code === 1) reject("Location permission denied.");
        else if (err.code === 2) reject("Position unavailable.");
        else if (err.code === 3) reject("Location request timed out.");
        else reject("Unknown location error.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: timeoutMs }
    );
  });
}
