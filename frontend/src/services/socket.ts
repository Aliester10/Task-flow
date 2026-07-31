/// <reference types="vite/client" />
import { io } from 'socket.io-client';

// Dev: konek langsung ke backend (:5000). Production: same-origin —
// nginx container frontend mem-proxy /socket.io/ ke backend.
const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
