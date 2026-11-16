const configuredApiUrl = process.env.REACT_APP_API_URL;

export const API = (
  configuredApiUrl === undefined || configuredApiUrl.trim() === ""
    ? ""
    : configuredApiUrl.trim()
).replace(/\/+$/, "");
