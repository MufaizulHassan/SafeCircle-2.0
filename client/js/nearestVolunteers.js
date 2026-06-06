async function findNearestVolunteers(lat, lon, limit = 3) {
  const withDist = volunteerDatabase.map((v) => {
    const d = calculateDistance(lat, lon, v.lat, v.lon);
    return { ...v, distance: d };
  });
  withDist.sort((a, b) => a.distance - b.distance);
  return withDist.slice(0, limit);
}