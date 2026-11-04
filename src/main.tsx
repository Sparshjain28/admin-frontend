import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { api } from "./lib/api";
import axios from "axios";

// Pages that do their own 401 handling and must not be bounced to /login.
//
// /sso is the SSO landing page. A 401 there means the one-time ticket was
// expired, already used or malformed — it says nothing about the session the
// browser already holds. Letting the global handler run would wipe a
// perfectly good auth_token and redirect past the page's own error screen,
// so the user would be logged out of the web portal for clicking a stale
// link from the app.
const AUTH_EXEMPT_PATHS = ['/login', '/signup', '/sso'];

const handlesOwnAuthErrors = () =>
  AUTH_EXEMPT_PATHS.some((p) => window.location.pathname.startsWith(p));

const clearSessionAndRedirect = () => {
  if (handlesOwnAuthErrors()) return;
  localStorage.removeItem('auth_token');
  document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
};

// Intercept fetch calls globally to handle token expiration (401 Unauthorized)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    clearSessionAndRedirect();
  }
  return response;
};

// Intercept axios calls globally for the same reason
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

// Load persisted JWT token (if any) so every request is authenticated
api.setToken(localStorage.getItem('auth_token'));

createRoot(document.getElementById("root")!).render(<App />);
