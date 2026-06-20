// server/routes/route.js
const express = require("express");
const router = express.Router();

// Client sends two coordinate pairs, we call ORS server-side with the
// secret key (kept in .env, never sent to the browser) and return the route.
router.post("/", async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if ([lat1, lon1, lat2, lon2].some((v) => typeof v !== "number")) {
      return res.status(400).json({
        success: false,
        message: "lat1, lon1, lat2, lon2 must be numbers"
      });
    }

    const orsRes = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [[lon1, lat1], [lon2, lat2]]
        }),
      }
    );

    const data = await orsRes.json();

    if (!data.features || !data.features[0]) {
      return res.json({
        success: true,
        route: null
      });
    }

    const route = data.features[0].geometry.coordinates.map(
      (c) => [c[1], c[0]]
    );

    res.json({
      success: true,
      route
    });

  } catch (err) {
    console.error("Route proxy error:", err);

    // Client already has fallbackRoute()
    res.json({
      success: true,
      route: null
    });
  }
});

module.exports = router;