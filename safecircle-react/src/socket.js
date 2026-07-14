import { io } from "socket.io-client";
 
// Single shared connection for the whole app. Previously Home.jsx,
// VolunteerDashboard.jsx, and AdminDashboard.jsx each called `io("/")`
// separately. Using one shared instance means "identify" (joining a
// per-user room) actually applies no matter which page is mounted.
export const socket = io("/", { autoConnect: true });