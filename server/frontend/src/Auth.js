import React, { useState } from "react";
import { API } from "./api";

export default function Auth({ onAuthenticated, theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("error");

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (mode === "signup" && password !== confirm) {
      setKind("error");
      setMessage("Your passwords don't match.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setKind("error");
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setKind("success");

      setMessage(
        mode === "login"
          ? "Welcome back. Opening your space…"
          : "Your account is ready. Welcome to Mindflow.",
      );

      onAuthenticated(data.token, data.user);
    } catch (error) {
      setKind("error");
      setMessage(error.message || "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-top">
        <a className="brand" href="/" aria-label="Mindflow home">
          <span className="brand-mark">M</span>
          Mindflow
        </a>

        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
        >
          {theme === "light" ? "☾" : "☀"}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>

      <section className="auth-layout">
        <div className="auth-story">
          <div className="eyebrow">
            <span className="pulse-dot" />
            YOUR SPACE TO RESET
          </div>

          <h1>
            A little more
            <br />
            <em>you, every day.</em>
          </h1>

          <p className="story-copy">
            Make room for your thoughts. Notice your patterns. Celebrate the
            small steps that make a difference.
          </p>

          <div className="story-note">
            <span className="note-icon">✳</span>
            <div>
              <strong>There is no right way to feel.</strong>
              <small>Just start where you are.</small>
            </div>
          </div>

          <div className="decor-orbit orbit-one" />
          <div className="decor-orbit orbit-two" />
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="card-kicker">
              {mode === "login" ? "GOOD TO SEE YOU" : "A FRESH START"}
            </span>

            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>

            <p>
              {mode === "login"
                ? "Pick up where you left off."
                : "Your personal space is just a moment away."}
            </p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className={mode === "login" ? "selected" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "selected" : ""}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label>
              Your username
              <input
                required
                minLength="3"
                maxLength="30"
                autoComplete="username"
                placeholder="e.g. veda"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label>
              Password
              <div className="password-wrap">
                <input
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  maxLength="72"
                  type={show ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "signup"
                      ? "At least 6 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShow((value) => !value)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {mode === "signup" && (
              <label>
                Confirm password
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </label>
            )}

            <button
              className="primary-btn auth-submit"
              disabled={busy}
              type="submit"
            >
              {busy
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in to Mindflow"
                  : "Create my account"}

              <span>↗</span>
            </button>
          </form>

          {message && (
            <p role="alert" className={`form-message ${kind}`}>
              {message}
            </p>
          )}

          <p className="privacy-note">
            🔒 &nbsp;Your journal is private and personal.
          </p>
        </div>
      </section>

      <footer className="auth-footer">
        A calmer mind starts with a moment for yourself.
        <span>© {new Date().getFullYear()} Mindflow</span>
      </footer>
    </main>
  );
}
