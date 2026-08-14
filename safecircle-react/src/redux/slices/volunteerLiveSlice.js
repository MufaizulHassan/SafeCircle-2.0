import { createSlice } from "@reduxjs/toolkit";

// This slice holds everything that used to live in VolunteerDashboard's
// useState. Redux state lives outside the React component tree, so
// navigating to another page (which unmounts VolunteerDashboard) no
// longer wipes it — it's still here exactly as you left it when you
// come back.
const initialState = {
  isOnline: false,
  volunteerName: "",
  activityLog: [],
  liveAlerts: [],
  activeDistance: null,
  liveAI: null,
  alertSeverities: {},
  // Active mission info — needed to redraw the victim marker + route
  // on the map when the component remounts mid-mission.
  activeMission: null, // { victimSocketId, lat, lon }
};

const volunteerLiveSlice = createSlice({
  name: "volunteerLive",
  initialState,
  reducers: {
    setOnline(state, action) {
      state.isOnline = action.payload;
    },
    setVolunteerName(state, action) {
      state.volunteerName = action.payload;
    },
    addActivityLog(state, action) {
      state.activityLog.unshift(action.payload);
    },
    addLiveAlert(state, action) {
      state.liveAlerts.unshift(action.payload);
    },
    removeLiveAlert(state, action) {
      state.liveAlerts = state.liveAlerts.filter((a) => a.id !== action.payload);
    },
    setActiveDistance(state, action) {
      state.activeDistance = action.payload;
    },
    setLiveAI(state, action) {
      state.liveAI = action.payload;
    },
    setAlertSeverity(state, action) {
      const { victimSocketId, ...severity } = action.payload;
      state.alertSeverities[victimSocketId] = severity;
    },
    setActiveMission(state, action) {
      state.activeMission = action.payload;
    },
    clearMission(state) {
      state.liveAlerts = [];
      state.activeDistance = null;
      state.liveAI = null;
      state.alertSeverities = {};
      state.activeMission = null;
    },
  },
});

export const {
  setOnline,
  setVolunteerName,
  addActivityLog,
  addLiveAlert,
  removeLiveAlert,
  setActiveDistance,
  setLiveAI,
  setAlertSeverity,
  setActiveMission,
  clearMission,
} = volunteerLiveSlice.actions;

export default volunteerLiveSlice.reducer;