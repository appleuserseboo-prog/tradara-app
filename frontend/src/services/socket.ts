import { io } from "socket.io-client";
// Ensure this port matches your backend server.ts PORT
export const socket = io("http://localhost:5000");