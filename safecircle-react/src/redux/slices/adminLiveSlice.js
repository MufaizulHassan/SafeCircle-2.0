import { createSlice } from "@reduxjs/toolkit";

// Same idea as volunteerLiveSlice — keeps AdminDashboard's live socket
// data outside the component so it survives you clicking to another
// page and back, instead of resetting to empty every time.
const initialState = {
  alerts: [],
  onlineVolunteers: [],
  liveAI: null,
  alertSeverities: {},
};

const adminLiveSlice = createSlice({
  name: "adminLive",
  initialState,
  reducers: {
    addAlert(state, action) {
      state.alerts.unshift(action.payload);
    },
    clearAlerts(state) {
      state.alerts = [];
    },
    setOnlineVolunteers(state, action) {
      state.onlineVolunteers = action.payload;
    },
    addOnlineVolunteer(state, action) {
      const exists = state.onlineVolunteers.find((v) => v.socketId === action.payload.socketId);
      if (!exists) state.onlineVolunteers.push(action.payload);
    },
    removeOnlineVolunteer(state, action) {
      state.onlineVolunteers = state.onlineVolunteers.filter((v) => v.socketId !== action.payload);
    },
    setLiveAI(state, action) {
      state.liveAI = action.payload;
    },
    setAlertSeverity(state, action) {
      const { victimSocketId, ...severity } = action.payload;
      state.alertSeverities[victimSocketId] = severity;
    },
    clearIncident(state) {
      state.alerts = [];
      state.liveAI = null;
      state.alertSeverities = {};
    },
  },
});

export const {
  addAlert,
  clearAlerts,
  setOnlineVolunteers,
  addOnlineVolunteer,
  removeOnlineVolunteer,
  setLiveAI,
  setAlertSeverity,
  clearIncident,
} = adminLiveSlice.actions;

export default adminLiveSlice.reducer;