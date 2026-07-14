import { createSlice } from "@reduxjs/toolkit";

const userFromStorage = localStorage.getItem("sc_user");
const tokenFromStorage = localStorage.getItem("sc_token");

const initialState = {
  user: userFromStorage ? JSON.parse(userFromStorage) : null,
  token: tokenFromStorage || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("sc_user", JSON.stringify(action.payload.user));
      localStorage.setItem("sc_token", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("sc_user");
      localStorage.removeItem("sc_token");
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;