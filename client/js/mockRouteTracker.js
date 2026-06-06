// js/mockRouteTracker.js
// Simulated volunteer movement toward user location (demo)

function simulateRoute(volunteer, userLoc, onUpdate, onFinish) {
  let steps = 10; // number of simulated movements
  let count = 0;

  let interval = setInterval(() => {
    count++;

    // Simulated decreasing distance
    let progress = (steps - count) / steps;
    let distance = (volunteer.distance * progress).toFixed(2);

    onUpdate({
      name: volunteer.name,
      distance: distance,
      step: count,
      totalSteps: steps
    });

    if (count >= steps) {
      clearInterval(interval);
      onFinish({
        name: volunteer.name
      });
    }
  }, 1000); // update every second
}
