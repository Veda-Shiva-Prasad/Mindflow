const configuredApiUrl = (process.env.REACT_APP_API_URL || "").trim();

// Local `npm start` (port 3000) has no proxy, so default to the local backend.
// Production builds (Docker/nginx) keep "" so requests stay same-origin.
const developmentFallback =
  process.env.NODE_ENV === "development" ? "http://localhost:5000" : "";

export const API = (configuredApiUrl || developmentFallback).replace(
  /\/+$/,
  "",
);
