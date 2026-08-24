import { store } from "../redux/store";
import { logout } from "../redux/slices/authSlice";

const BASE = import.meta.env.VITE_API_URL || "";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);

  // Auto-logout on expired/invalid token — any 401 means the stored
  // token is dead, so clear Redux + localStorage and redirect to login.
  if (res.status === 401) {
    const currentToken = store.getState().auth.token;
    if (currentToken) {
      store.dispatch(logout());
      // Small delay so Redux state clears before the redirect
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }

  return res;
}