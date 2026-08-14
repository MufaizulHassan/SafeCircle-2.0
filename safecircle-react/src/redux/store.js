// import { configureStore } from "@reduxjs/toolkit";
// import authReducer from "./slices/authSlice";

// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//   },
// });

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import volunteerLiveReducer from "./slices/volunteerLiveSlice";
import adminLiveReducer from "./slices/adminLiveSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    volunteerLive: volunteerLiveReducer,
    adminLive: adminLiveReducer,
  },
});