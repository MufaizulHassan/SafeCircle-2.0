// js/mockPoliceApi.js
console.log("Mock Police API loaded (demo)");

/**
 * Simulates sending emergency payload to police control room.
 * In real deployment: replace with HTTPS API call using fetch()
 */

async function sendToPolice(payload) {
  return new Promise((resolve) => {
    console.log("Sending emergency alert to Police (demo)...", payload);

    // Show in UI (status feed)
    if (typeof pushStatus === "function") {
      pushStatus("📡 Sending alert to Police Control Room… (demo)");
    }

    setTimeout(() => {
      const reply = {
        status: "received",
        eta: "2–4 minutes",
        station: "Dwarka Sector-9 Police Station",
        timestamp: new Date().toLocaleTimeString()
      };

      console.log("Police API response (demo):", reply);

      if (typeof pushStatus === "function") {
        pushStatus(`🚓 Police notified — nearest patrol dispatched (ETA: ${reply.eta})`);
      }

      resolve(reply);
    }, 1500); // 1.5 sec fake delay
  });
}
