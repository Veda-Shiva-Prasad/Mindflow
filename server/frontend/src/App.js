import React, { useEffect, useState } from "react";
import Auth from "./Auth";
import Journal from "./Journal";
import { API } from "./api";
import "./App.css";

const TOKEN_KEY = "mindflow_token";
const THEME_KEY = "mindflow_theme";

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light",
  );
  const [checking, setChecking] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.title = "Mindflow — Make space for you";
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setChecking(false);
      return undefined;
    }

    let active = true;
    setChecking(true);

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Session expired.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setUser(data);
        if (data.preferences?.theme) setTheme(data.preferences.theme);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setUser(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const signIn = (value, userData) => {
    localStorage.setItem(TOKEN_KEY, value);
    setUser(userData);
    setToken(value);
    if (userData?.preferences?.theme) setTheme(userData.preferences.theme);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  if (checking) {
    return (
      <div className="boot-screen">
        <span className="brand-mark">M</span>
        <p>Preparing your space…</p>
      </div>
    );
  }

  return token ? (
    <Journal
      token={token}
      user={user}
      onUserUpdate={setUser}
      onLogout={logout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  ) : (
    <Auth onAuthenticated={signIn} theme={theme} onToggleTheme={toggleTheme} />
  );
}
