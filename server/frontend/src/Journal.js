import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "./api";

const MOODS = [
  { name: "Great", emoji: "🤩" },
  { name: "Good", emoji: "🙂" },
  { name: "Okay", emoji: "😐" },
  { name: "Low", emoji: "😔" },
  { name: "Anxious", emoji: "😟" },
  { name: "Neutral", emoji: "🌿" },
];

const PROMPTS = [
  "What felt lighter today than yesterday?",
  "What is one thing you did well today?",
  "What do you need more of this week?",
  "What is taking up space in your mind?",
  "What small moment made you smile?",
];

const dateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const sameMonth = (value, month) => {
  const date = new Date(value);

  return (
    date.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
};

const formatDate = (
  value,
  options = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) => new Date(value).toLocaleDateString(undefined, options);

const getMoodEmoji = (mood) =>
  MOODS.find((item) => item.name === mood)?.emoji || "🌿";

export default function Journal({
  token,
  user,
  onUserUpdate,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const [entries, setEntries] = useState([]);
  const [activeView, setActiveView] = useState("journal");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigateTo(view) {
    setActiveView(view);
    setMobileMenuOpen(false);
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("mindflow_sidebar_collapsed") === "true",
  );

  const [text, setText] = useState("");
  const [mood, setMood] = useState("Good");
  const [tagsText, setTagsText] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMood, setEditMood] = useState("Good");
  const [editTags, setEditTags] = useState("");

  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [toast, setToast] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));

  const [profileName, setProfileName] = useState(user?.username || "");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const username = user?.username || "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";

  const notify = useCallback((message) => {
    setToast(message);
  }, []);

  // AUTHENTICATED API REQUEST
  const request = useCallback(
    async (path, options = {}) => {
      const { skipLogoutOn401 = false, ...fetchOptions } = options;

      const response = await fetch(`${API}${path}`, {
        ...fetchOptions,
        headers: {
          ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...fetchOptions.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 && !skipLogoutOn401) {
        onLogout();
        throw new Error(
          data.error || "Your session expired. Please sign in again.",
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      return data;
    },
    [token, onLogout],
  );

  // LOAD REFLECTIONS
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request("/api/journals");
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setProfileName(user?.username || "");
  }, [user?.username]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 3200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  // SEARCH AND MOOD FILTER
  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const searchableText = `
          ${entry.entry || ""}
          ${entry.mood || ""}
          ${(entry.tags || []).join(" ")}
        `.toLowerCase();

        return (
          (filter === "All" || entry.mood === filter) &&
          searchableText.includes(search.toLowerCase())
        );
      }),
    [entries, filter, search],
  );

  // DASHBOARD STATISTICS
  const todayKey = dateKey(new Date());

  const todayCount = entries.filter(
    (entry) => dateKey(entry.date || entry.createdAt) === todayKey,
  ).length;

  const daysReflected = new Set(
    entries.map((entry) => dateKey(entry.date || entry.createdAt)),
  ).size;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const weeklyEntries = entries.filter(
    (entry) => new Date(entry.date || entry.createdAt) >= weekStart,
  );

  const monthlyEntries = entries.filter(
    (entry) => new Date(entry.date || entry.createdAt) >= monthStart,
  );

  const streak = useMemo(() => {
    const keys = new Set(
      entries.map((entry) => dateKey(entry.date || entry.createdAt)),
    );

    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!keys.has(dateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let count = 0;

    while (keys.has(dateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return count;
  }, [entries]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  // CREATE REFLECTION
  async function saveEntry(event) {
    event.preventDefault();

    if (!text.trim()) return;

    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSaving(true);
    setError("");

    try {
      const item = await request("/api/journals", {
        method: "POST",
        body: JSON.stringify({
          entry: text.trim(),
          mood,
          tags,
        }),
      });

      setEntries((previous) => [item, ...previous]);

      setText("");
      setTagsText("");

      notify("Your reflection has been saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // EDIT REFLECTION
  function beginEdit(item) {
    setEditing(item._id);
    setEditText(item.entry || "");
    setEditMood(item.mood || "Neutral");
    setEditTags((item.tags || []).join(", "));
  }

  async function updateEntry(event) {
    event.preventDefault();

    if (!editText.trim()) {
      setError("Reflection cannot be empty.");
      return;
    }

    try {
      const item = await request(`/api/journals/${editing}`, {
        method: "PUT",
        body: JSON.stringify({
          entry: editText.trim(),
          mood: editMood,
          tags: editTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      setEntries((previous) =>
        previous.map((entry) => (entry._id === editing ? item : entry)),
      );

      setEditing(null);
      notify("Reflection updated successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  // DELETE REFLECTION
  async function deleteReflection(id) {
    try {
      await request(`/api/journals/${id}`, {
        method: "DELETE",
      });

      setEntries((previous) => previous.filter((entry) => entry._id !== id));

      notify("Reflection deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmAction(null);
    }
  }

  // UPDATE PROFILE
  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);

    try {
      const data = await request("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          username: profileName,
        }),
      });

      onUserUpdate?.(data.user);
      notify("Your profile has been updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  // CHANGE PASSWORD
  async function changePassword(event) {
    event.preventDefault();
    setPasswordSaving(true);

    try {
      await request("/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");

      notify("Password changed. Please sign in again.");

      window.setTimeout(() => onLogout(), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  // DELETE ACCOUNT
  async function deleteAccount() {
    if (deletePassword.length < 6) {
      setDeleteAccountError("Please enter your complete account password.");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError("");

    try {
      await request("/auth/account", {
        method: "DELETE",
        skipLogoutOn401: true,
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      // Only log out after the server confirms successful deletion.
      localStorage.removeItem("mindflow_token");
      localStorage.removeItem("mindflow_sidebar_collapsed");

      setDeletePassword("");
      setDeleteAccountOpen(false);
      setDeleteAccountError("");

      notify("Your account has been deleted.");
      onLogout();
    } catch (err) {
      setDeleteAccountError(
        err.message || "Unable to delete account. Please try again.",
      );
    } finally {
      setDeleteAccountLoading(false);
    }
  }

  // THEME PREFERENCE
  // Theme is managed by the parent component and applied on this device.
  function toggleThemePreference() {
    onToggleTheme();
    notify("Appearance preference updated.");
  }

  // COLLAPSE / EXPAND SIDEBAR
  // This is a device-local layout preference and does not need an API request.
  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;

      localStorage.setItem("mindflow_sidebar_collapsed", String(next));

      return next;
    });
  }

  // Shared file download helper
  function downloadFile(contents, mimeType, filename) {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // CSV EXPORT
  function exportCSV() {
    const columns = ["Date", "Time", "Mood", "Tags", "Reflection"];

    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = entries.map((item) => {
      const dateValue = item.date || item.createdAt;
      const date = dateValue ? new Date(dateValue) : null;

      return [
        date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "",
        date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString() : "",
        item.mood || "Neutral",
        (item.tags || []).join(", "),
        item.entry || "",
      ];
    });

    const csv = [
      columns.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    // UTF-8 BOM helps Excel open the file with the correct encoding.
    downloadFile(
      "\uFEFF" + csv,
      "text/csv;charset=utf-8;",
      "mindflow-reflections.csv",
    );

    notify("CSV export downloaded successfully.");
  }

  // JSON BACKUP EXPORT
  function exportJSON() {
    downloadFile(
      JSON.stringify(entries, null, 2),
      "application/json;charset=utf-8;",
      "mindflow-reflections.json",
    );

    notify("JSON backup downloaded successfully.");
  }

  // PDF EXPORT
  // Opens a clean print-ready journal. Choose "Save as PDF" in the
  // browser's print destination to save it as a PDF file.
  function exportPDF() {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError(
        "Your browser blocked the PDF window. Allow pop-ups for this site and try again.",
      );
      return;
    }

    printWindow.opener = null;

    const escapeHTML = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[character];
      });

    const sortedEntries = [...entries].sort(
      (a, b) =>
        new Date(b.date || b.createdAt || 0) -
        new Date(a.date || a.createdAt || 0),
    );

    const entryMarkup = sortedEntries.length
      ? sortedEntries
          .map((item) => {
            const dateValue = item.date || item.createdAt;
            const date = dateValue ? new Date(dateValue) : null;
            const dateLabel =
              date && !Number.isNaN(date.getTime())
                ? date.toLocaleString()
                : "Date unavailable";

            const tags = (item.tags || [])
              .map((tag) => `<span class="tag">#${escapeHTML(tag)}</span>`)
              .join(" ");

            return `
              <article class="entry">
                <div class="entry-meta">
                  <strong>${escapeHTML(item.mood || "Neutral")}</strong>
                  <span>${escapeHTML(dateLabel)}</span>
                </div>
                <p>${escapeHTML(item.entry || "").replace(/\r?\n/g, "<br>")}</p>
                ${tags ? `<div class="tags">${tags}</div>` : ""}
              </article>
            `;
          })
          .join("")
      : '<p class="empty">No reflections have been saved yet.</p>';

    const generatedAt = new Date().toLocaleString();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mindflow - My Reflections</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 38px;
      color: #26332d;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
    }
    header {
      padding-bottom: 20px;
      margin-bottom: 26px;
      border-bottom: 2px solid #dce8df;
    }
    h1 { margin: 0 0 5px; font-size: 27px; }
    .subtitle, .generated { color: #68766e; font-size: 12px; }
    .summary {
      display: flex;
      gap: 24px;
      margin: 20px 0 28px;
      padding: 14px 16px;
      background: #f4f8f4;
      border-radius: 10px;
      font-size: 13px;
    }
    .entry {
      padding: 16px 0;
      border-bottom: 1px solid #e6ece7;
      break-inside: avoid;
    }
    .entry-meta {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      color: #42564a;
      font-size: 12px;
    }
    .entry-meta span { color: #78847d; }
    .entry p { margin: 10px 0; white-space: normal; overflow-wrap: anywhere; }
    .tag {
      display: inline-block;
      margin: 2px 5px 2px 0;
      color: #54725c;
      font-size: 11px;
    }
    .empty { color: #68766e; }
    footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e6ece7;
      color: #849087;
      font-size: 10px;
    }
    @page { size: A4; margin: 16mm; }
    @media print {
      body { padding: 0; }
      .entry { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Mindflow — My Reflections</h1>
    <div class="subtitle">A personal journal of thoughts, moods and moments.</div>
    <div class="generated">Generated ${escapeHTML(generatedAt)}</div>
  </header>
  <section class="summary">
    <span><strong>${entries.length}</strong> reflections</span>
    <span><strong>${daysReflected}</strong> days reflected</span>
  </section>
  <main>${entryMarkup}</main>
  <footer>Mindflow · Your personal reflections</footer>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    notify("PDF print view opened. Choose Save as PDF in the print dialog.");
  }

  // CALENDAR DATA
  const monthEntries = entries.filter((entry) =>
    sameMonth(entry.date || entry.createdAt, calendarMonth),
  );

  const calendarCells = useMemo(() => {
    const first = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
    );

    const offset = (first.getDay() + 6) % 7;

    const start = new Date(first);
    start.setDate(first.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [calendarMonth]);

  const selectedEntries = entries.filter(
    (entry) => dateKey(entry.date || entry.createdAt) === selectedDate,
  );

  // WEEKLY CHART
  const weeklyBars = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));

    const count = entries.filter(
      (entry) => dateKey(entry.date || entry.createdAt) === dateKey(day),
    ).length;

    return {
      label: day.toLocaleDateString(undefined, {
        weekday: "short",
      }),
      count,
    };
  });

  // MOOD DISTRIBUTION
  const moodCounts = MOODS.map((item) => ({
    ...item,
    count: entries.filter((entry) => entry.mood === item.name).length,
  }));

  const maxMoodCount = Math.max(1, ...moodCounts.map((item) => item.count));
  const maxWeekCount = Math.max(1, ...weeklyBars.map((item) => item.count));

  return (
    <main
      className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
    >
      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMobileMenuOpen(false);
            }
          }}
        >
          <aside
            id="mindflow-mobile-drawer"
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mindflow navigation"
          >
            <div className="mobile-drawer-header">
              <a
                className="brand"
                href="#journal"
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo("journal");
                }}
              >
                <span className="brand-mark">M</span>
                <span className="brand-name">Mindflow</span>
              </a>

              <button
                className="mobile-drawer-close"
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>

            <div className="side-label">YOUR SPACE</div>

            <button
              className={`side-nav-item ${activeView === "journal" ? "side-active" : ""}`}
              type="button"
              onClick={() => navigateTo("journal")}
            >
              <span aria-hidden="true">▤</span>
              <span className="nav-text">My journal</span>
            </button>

            <button
              className={`side-nav-item ${activeView === "calendar" ? "side-active" : ""}`}
              type="button"
              onClick={() => navigateTo("calendar")}
            >
              <span aria-hidden="true">▦</span>
              <span className="nav-text">Calendar</span>
            </button>

            <button
              className={`side-nav-item ${activeView === "analytics" ? "side-active" : ""}`}
              type="button"
              onClick={() => navigateTo("analytics")}
            >
              <span aria-hidden="true">◒</span>
              <span className="nav-text">Mood analytics</span>
            </button>

            <div className="side-label recent-label">RECENT REFLECTIONS</div>

            <div className="recent-reflections">
              {entries.slice(0, 5).map((entry) => (
                <button
                  type="button"
                  className="recent-entry-link"
                  key={entry._id}
                  title={entry.entry}
                  onClick={() => {
                    navigateTo("journal");

                    window.setTimeout(() => {
                      document
                        .getElementById(`reflection-${entry._id}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }, 120);
                  }}
                >
                  <span>{getMoodEmoji(entry.mood)}</span>
                  <span>
                    {entry.entry.slice(0, 24)}
                    {entry.entry.length > 24 ? "…" : ""}
                  </span>
                </button>
              ))}

              {entries.length === 0 && (
                <small className="recent-empty">
                  Your saved entries will appear here.
                </small>
              )}
            </div>

            <div className="side-quote">
              “Almost everything will work again if you unplug it for a few
              minutes, including you.”
              <small>— Anne Lamott</small>
            </div>

            <button
              className={`side-nav-item settings-nav ${activeView === "settings" ? "side-active" : ""}`}
              type="button"
              onClick={() => navigateTo("settings")}
            >
              <span aria-hidden="true">⚙</span>
              <span className="nav-text">Settings</span>
            </button>

            <div className="sidebar-bottom">
              <div className="avatar">{avatarLetter}</div>
              <div className="profile-copy">
                <strong>Welcome, {username}</strong>
                <small>Personal journal</small>
              </div>
              <button
                className="logout-button"
                type="button"
                onClick={onLogout}
                title="Sign out"
              >
                <span>↗</span>
                <span className="nav-text">Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand-row">
          <a
            className="brand"
            href="#journal"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("journal");
            }}
          >
            <span className="brand-mark">M</span>
            <span className="brand-name">Mindflow</span>
          </a>

          <button
            className="sidebar-collapse"
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>

        <div className="side-label">YOUR SPACE</div>

        <button
          className={`side-nav-item ${
            activeView === "journal" ? "side-active" : ""
          }`}
          onClick={() => setActiveView("journal")}
          type="button"
        >
          <span>▤</span>
          <span className="nav-text">My journal</span>
        </button>

        <button
          className={`side-nav-item ${
            activeView === "calendar" ? "side-active" : ""
          }`}
          onClick={() => navigateTo("calendar")}
          type="button"
        >
          <span>▦</span>
          <span className="nav-text">Calendar</span>
        </button>

        <button
          className={`side-nav-item ${
            activeView === "analytics" ? "side-active" : ""
          }`}
          onClick={() => navigateTo("analytics")}
          type="button"
        >
          <span>◒</span>
          <span className="nav-text">Mood analytics</span>
        </button>

        <div className="side-label recent-label">RECENT REFLECTIONS</div>

        <div className="recent-reflections">
          {entries.slice(0, 5).map((entry) => (
            <button
              type="button"
              className="recent-entry-link"
              key={entry._id}
              title={entry.entry}
              onClick={() => {
                navigateTo("journal");

                window.setTimeout(() => {
                  document
                    .getElementById(`reflection-${entry._id}`)
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                }, 120);
              }}
            >
              <span>{getMoodEmoji(entry.mood)}</span>
              <span>
                {entry.entry.slice(0, 24)}
                {entry.entry.length > 24 ? "…" : ""}
              </span>
            </button>
          ))}

          {entries.length === 0 && (
            <small className="recent-empty">
              Your saved entries will appear here.
            </small>
          )}
        </div>

        {/* QUOTE ABOVE SETTINGS */}
        <div className="side-quote">
          “Almost everything will work again if you unplug it for a few minutes,
          including you.”
          <small>— Anne Lamott</small>
        </div>

        <button
          className={`side-nav-item settings-nav ${
            activeView === "settings" ? "side-active" : ""
          }`}
          onClick={() => navigateTo("settings")}
          type="button"
        >
          <span>⚙</span>
          <span className="nav-text">Settings</span>
        </button>

        <div className="sidebar-bottom">
          <div className="avatar">{avatarLetter}</div>

          <div className="profile-copy">
            <strong>Welcome, {username}</strong>
            <small>Personal journal</small>
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <span>↗</span>
            <span className="nav-text">Sign out</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <section className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mindflow-mobile-drawer"
          >
            ☰
          </button>

          <div className="mobile-brand">
            <span className="brand-mark">M</span>
            Mindflow
          </div>

          <span className="date-label">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>

          <div className="top-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleThemePreference}
            >
              {theme === "light" ? "☾" : "☀"}
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>

            <button className="logout-mobile" onClick={onLogout} type="button">
              Sign out
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {error && (
            <div className="inline-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}

          {/* JOURNAL DASHBOARD */}
          {activeView === "journal" && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <span className="pulse-dot" />
                    YOUR DAILY PAUSE
                  </div>

                  <h1>
                    {greeting}, take a breath
                    <span className="heading-period">.</span>
                  </h1>

                  <p>
                    This is your space. No pressure, no judgement — just you.
                  </p>
                </div>

                <div className="welcome-sun">☼</div>
              </section>

              <section className="stats-row">
                <div className="stat-card">
                  <span className="stat-icon lilac">✎</span>
                  <div>
                    <strong>{entries.length}</strong>
                    <small>Total reflections</small>
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-icon peach">◷</span>
                  <div>
                    <strong>{todayCount}</strong>
                    <small>Today</small>
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-icon mint">✧</span>
                  <div>
                    <strong>{daysReflected}</strong>
                    <small>Days reflected</small>
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-icon peach">🔥</span>
                  <div>
                    <strong>{streak}</strong>
                    <small>Day streak</small>
                  </div>
                </div>
              </section>

              {/* COMPOSER */}
              <section className="composer panel">
                <div className="section-heading">
                  <div>
                    <span className="card-kicker">LET IT OUT</span>
                    <h2>How are you feeling today?</h2>
                  </div>
                  <span className="soft-sparkle">✳</span>
                </div>

                <div className="mood-picker" aria-label="Choose your mood">
                  {MOODS.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      className={`mood-option ${
                        mood === item.name ? "chosen" : ""
                      }`}
                      onClick={() => setMood(item.name)}
                      aria-pressed={mood === item.name}
                    >
                      <span>{item.emoji}</span>
                      <small>{item.name}</small>
                    </button>
                  ))}
                </div>

                <form onSubmit={saveEntry}>
                  <textarea
                    className="journal-input"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Start wherever you are. What’s on your mind?"
                    rows="4"
                    maxLength="10000"
                    required
                  />

                  <div className="tag-input-row">
                    <label htmlFor="new-tags">Tags</label>
                    <input
                      id="new-tags"
                      value={tagsText}
                      onChange={(event) => setTagsText(event.target.value)}
                      placeholder="e.g. work, family, gratitude (comma separated)"
                    />
                  </div>

                  <div className="prompt-row">
                    <button
                      type="button"
                      className="prompt-link"
                      onClick={() =>
                        setPrompt(
                          PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
                        )
                      }
                    >
                      ✧ Need a prompt?
                      <span>{prompt}</span>
                    </button>

                    <span className="word-count">{words} words</span>
                  </div>

                  <div className="composer-footer">
                    <span className="private-label">
                      🔒 Only you can see this
                    </span>

                    <button
                      className="primary-btn save-button"
                      disabled={saving || !text.trim()}
                      type="submit"
                    >
                      {saving ? "Saving…" : "Save reflection"}
                      <span>↗</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* PAST REFLECTIONS */}
              <section className="entries-section">
                <div className="entries-title">
                  <div>
                    <span className="card-kicker">YOUR JOURNEY</span>
                    <h2>
                      Past reflections{" "}
                      <span className="count-pill">{entries.length}</span>
                    </h2>
                  </div>

                  <div className="entry-tools">
                    <input
                      aria-label="Search reflections"
                      className="search-input"
                      placeholder="⌕ Search entries or tags"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />

                    <select
                      aria-label="Filter by mood"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      {["All", ...MOODS.map((item) => item.name)].map(
                        (item) => (
                          <option key={item} value={item}>
                            {item === "All" ? "All moods" : item}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="empty-state">
                    <span className="loading-ring" />
                    Loading your reflections…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-illustration">✧</span>
                    <strong>
                      {entries.length
                        ? "No reflections match that search"
                        : "Your story starts here."}
                    </strong>
                    <p>
                      {entries.length
                        ? "Try another search or mood filter."
                        : "Take a breath, write a few words, and make this space yours."}
                    </p>
                  </div>
                ) : (
                  <div className="entries-grid">
                    {filtered.map((item) => (
                      <article
                        className="entry-card"
                        id={`reflection-${item._id}`}
                        key={item._id}
                      >
                        {editing === item._id ? (
                          <form onSubmit={updateEntry} className="edit-form">
                            <select
                              value={editMood}
                              onChange={(event) =>
                                setEditMood(event.target.value)
                              }
                            >
                              {MOODS.map((item) => (
                                <option key={item.name} value={item.name}>
                                  {item.name}
                                </option>
                              ))}
                            </select>

                            <textarea
                              value={editText}
                              onChange={(event) =>
                                setEditText(event.target.value)
                              }
                              rows="4"
                              maxLength="10000"
                              required
                            />

                            <input
                              value={editTags}
                              onChange={(event) =>
                                setEditTags(event.target.value)
                              }
                              placeholder="Tags, comma separated"
                            />

                            <div className="edit-actions">
                              <button className="primary-btn" type="submit">
                                Save changes
                              </button>

                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="entry-card-top">
                              <span className="entry-mood">
                                {getMoodEmoji(item.mood)}{" "}
                                {item.mood || "Neutral"}
                              </span>

                              <span className="entry-date">
                                {formatDate(item.date || item.createdAt)}
                              </span>

                              <div className="entry-actions">
                                <button
                                  type="button"
                                  title="Edit reflection"
                                  onClick={() => beginEdit(item)}
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  title="Delete reflection"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "reflection",
                                      id: item._id,
                                      message:
                                        "Delete this reflection? This action cannot be undone.",
                                    })
                                  }
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            <p className="entry-body">{item.entry}</p>

                            {(item.tags || []).length > 0 && (
                              <div className="entry-tags">
                                {item.tags.map((tag) => (
                                  <span key={tag}>#{tag}</span>
                                ))}
                              </div>
                            )}

                            <div className="entry-card-bottom">
                              <span>
                                {new Date(
                                  item.date || item.createdAt,
                                ).toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>Made with care · Mindflow</span>
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <footer className="page-footer">
                Be gentle with yourself. You’re doing better than you think.
                <span>Mindflow © {new Date().getFullYear()}</span>
              </footer>
            </>
          )}

          {/* CALENDAR */}
          {activeView === "calendar" && (
            <section className="feature-page">
              <div className="feature-heading">
                <span className="card-kicker">YOUR JOURNEY</span>
                <h1>Reflection calendar</h1>
                <p>See the days when you made space for yourself.</p>
              </div>

              <div className="calendar-layout settings-card">
                <div className="calendar-header">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                  >
                    ←
                  </button>

                  <h2>
                    {calendarMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                  >
                    →
                  </button>
                </div>

                <div className="calendar-grid calendar-weekdays">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <span key={day}>{day}</span>
                    ),
                  )}
                </div>

                <div className="calendar-grid">
                  {calendarCells.map((day) => {
                    const key = dateKey(day);

                    const count = entries.filter(
                      (entry) => dateKey(entry.date || entry.createdAt) === key,
                    ).length;

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`calendar-day ${
                          day.getMonth() !== calendarMonth.getMonth()
                            ? "outside-month"
                            : ""
                        } ${selectedDate === key ? "selected-day" : ""} ${
                          key === todayKey ? "today-day" : ""
                        }`}
                        onClick={() => setSelectedDate(key)}
                      >
                        <span>{day.getDate()}</span>
                        {count > 0 && (
                          <i title={`${count} reflection(s)`}>
                            {count > 1 ? count : "•"}
                          </i>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-legend">
                  <span>
                    <i /> Days with reflections
                  </span>
                  <span>{monthEntries.length} reflections this month</span>
                </div>
              </div>

              <div className="settings-card selected-day-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">▤</span>
                  <div>
                    <h2>
                      {formatDate(`${selectedDate}T12:00:00`, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h2>
                    <p>
                      {selectedEntries.length} reflection(s) saved on this day.
                    </p>
                  </div>
                </div>

                {selectedEntries.length ? (
                  selectedEntries.map((entry) => (
                    <article className="calendar-entry" key={entry._id}>
                      <strong>
                        {getMoodEmoji(entry.mood)} {entry.mood}
                      </strong>
                      <p>{entry.entry}</p>
                      {(entry.tags || []).map((tag) => (
                        <span className="tag-chip" key={tag}>
                          #{tag}
                        </span>
                      ))}
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">
                    No reflections for this date. Every day is a fresh start.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ANALYTICS */}
          {activeView === "analytics" && (
            <section className="feature-page">
              <div className="feature-heading">
                <span className="card-kicker">UNDERSTAND YOUR PATTERNS</span>
                <h1>Mood analytics</h1>
                <p>
                  A gentle overview of your reflection habits. These insights
                  are based only on your saved entries.
                </p>
              </div>

              <div className="stats-row analytics-stats">
                <div className="stat-card">
                  <span className="stat-icon lilac">✎</span>
                  <div>
                    <strong>{entries.length}</strong>
                    <small>All reflections</small>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon peach">◷</span>
                  <div>
                    <strong>{weeklyEntries.length}</strong>
                    <small>Last 7 days</small>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon mint">▦</span>
                  <div>
                    <strong>{monthlyEntries.length}</strong>
                    <small>This month</small>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon peach">🔥</span>
                  <div>
                    <strong>{streak}</strong>
                    <small>Current streak</small>
                  </div>
                </div>
              </div>

              <div className="analytics-grid">
                <section className="settings-card">
                  <div className="settings-card-heading">
                    <span className="settings-icon">◷</span>
                    <div>
                      <h2>Last 7 days</h2>
                      <p>Number of reflections each day.</p>
                    </div>
                  </div>

                  <div className="bar-chart">
                    {weeklyBars.map((item) => (
                      <div className="bar-column" key={item.label}>
                        <strong>{item.count}</strong>
                        <div className="bar-track">
                          <i
                            style={{
                              height: `${(item.count / maxWeekCount) * 100}%`,
                            }}
                          />
                        </div>
                        <small>{item.label}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="settings-card">
                  <div className="settings-card-heading">
                    <span className="settings-icon">◒</span>
                    <div>
                      <h2>Mood distribution</h2>
                      <p>How you have been feeling across your entries.</p>
                    </div>
                  </div>

                  <div className="mood-chart">
                    {moodCounts.map((item) => (
                      <div className="mood-bar-row" key={item.name}>
                        <span>
                          {item.emoji} {item.name}
                        </span>
                        <div className="mood-bar-track">
                          <i
                            style={{
                              width: `${(item.count / maxMoodCount) * 100}%`,
                            }}
                          />
                        </div>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="settings-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">▦</span>
                  <div>
                    <h2>Reflection summary</h2>
                    <p>Your weekly and monthly activity.</p>
                  </div>
                </div>

                <div className="summary-grid">
                  <div>
                    <strong>{weeklyEntries.length}</strong>
                    <span>Reflections in the last 7 days</span>
                  </div>
                  <div>
                    <strong>{monthlyEntries.length}</strong>
                    <span>Reflections this month</span>
                  </div>
                  <div>
                    <strong>{daysReflected}</strong>
                    <span>Total days reflected</span>
                  </div>
                  <div>
                    <strong>{streak}</strong>
                    <span>Current consecutive-day streak</span>
                  </div>
                </div>
              </section>
            </section>
          )}

          {/* SETTINGS */}
          {activeView === "settings" && (
            <section className="settings-page">
              <div className="settings-heading">
                <button
                  type="button"
                  className="settings-back-button"
                  onClick={() => navigateTo("journal")}
                >
                  ← Back to journal
                </button>

                <span className="card-kicker">PERSONALIZE YOUR SPACE</span>

                <h1>Settings</h1>

                <p>
                  Manage your account, security and how Mindflow feels to use.
                </p>
              </div>

              {/* PROFILE */}
              <section className="settings-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">◉</span>
                  <div>
                    <h2>Account profile</h2>
                    <p>Your account information.</p>
                  </div>
                </div>

                <div className="profile-summary">
                  <div className="avatar profile-avatar-large">
                    {avatarLetter}
                  </div>
                  <div>
                    <strong>{username}</strong>
                    <small>Mindflow member</small>
                  </div>
                </div>

                <div className="settings-details">
                  <div>
                    <span>Account ID</span>
                    <strong>{user?.id || user?._id || "Unavailable"}</strong>
                  </div>
                  <div>
                    <span>Account created</span>
                    <strong>
                      {user?.createdAt
                        ? formatDate(user.createdAt)
                        : "Unavailable"}
                    </strong>
                  </div>
                  <div>
                    <span>Journal reflections</span>
                    <strong>{entries.length}</strong>
                  </div>
                </div>

                <form className="settings-form" onSubmit={saveProfile}>
                  <label>
                    Username
                    <input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      minLength="3"
                      maxLength="30"
                      required
                    />
                  </label>

                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={profileSaving || profileName.trim() === username}
                  >
                    {profileSaving ? "Saving…" : "Save profile"}
                  </button>
                </form>
              </section>

              {/* APPEARANCE */}
              <section className="settings-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">☼</span>
                  <div>
                    <h2>Appearance</h2>
                    <p>Your theme preference is applied on this device.</p>
                  </div>
                </div>

                <div className="theme-choice-row">
                  <div>
                    <strong>Color theme</strong>
                    <small>
                      Current theme: {theme === "dark" ? "Dark" : "Light"}
                    </small>
                  </div>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={toggleThemePreference}
                  >
                    Switch to {theme === "dark" ? "light" : "dark"} mode
                  </button>
                </div>

                <div className="theme-choice-row">
                  <div>
                    <strong>Sidebar</strong>
                    <small>
                      {sidebarCollapsed
                        ? "Currently collapsed"
                        : "Currently expanded"}
                    </small>
                  </div>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={toggleSidebar}
                  >
                    {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  </button>
                </div>
              </section>

              {/* SECURITY */}
              <section className="settings-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">♙</span>
                  <div>
                    <h2>Security</h2>
                    <p>Change your account password.</p>
                  </div>
                </div>

                <form
                  className="settings-form security-form"
                  onSubmit={changePassword}
                >
                  <label>
                    Current password
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <label>
                    New password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength="6"
                      maxLength="72"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      required
                    />
                  </label>

                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating…" : "Change password"}
                  </button>
                </form>
              </section>

              {/* EXPORT */}
              <section className="settings-card">
                <div className="settings-card-heading">
                  <span className="settings-icon">⇩</span>
                  <div>
                    <h2>Export your reflections</h2>
                    <p>Download a personal copy of your journal entries.</p>
                  </div>
                </div>

                <div className="export-actions">
                  <button
                    className="secondary-btn export-button"
                    type="button"
                    onClick={exportCSV}
                    disabled={entries.length === 0}
                  >
                    Download CSV
                  </button>

                  <button
                    className="secondary-btn export-button"
                    type="button"
                    onClick={exportPDF}
                    disabled={entries.length === 0}
                  >
                    Download PDF
                  </button>

                  <button
                    className="secondary-btn export-button"
                    type="button"
                    onClick={exportJSON}
                    disabled={entries.length === 0}
                  >
                    Download JSON
                  </button>
                </div>
                <p className="muted-copy">
                  PDF opens a print view. Choose Save as PDF in your browser.
                </p>
              </section>

              {/* DELETE ACCOUNT */}
              <section className="settings-card danger-card">
                <div className="settings-card-heading">
                  <span className="settings-icon danger-icon">!</span>

                  <div>
                    <h2>Delete account</h2>

                    <p>
                      Permanently delete your account and all its reflections.
                    </p>
                  </div>
                </div>

                {!deleteAccountOpen ? (
                  <button
                    className="danger-btn"
                    type="button"
                    onClick={() => {
                      setDeleteAccountOpen(true);
                      setDeletePassword("");
                      setError("");
                      setDeleteAccountError("");
                    }}
                  >
                    Delete my account
                  </button>
                ) : (
                  <div className="delete-account-confirmation">
                    <h3>Are you sure?</h3>

                    <p>
                      This permanently deletes your account and all saved
                      reflections. This action cannot be undone.
                    </p>

                    <label className="delete-password-label">
                      Confirm your password
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(event) =>
                          setDeletePassword(event.target.value)
                        }
                        autoComplete="current-password"
                        placeholder="Enter your complete password"
                        minLength={6}
                        maxLength={72}
                        required
                      />
                    </label>

                    {deleteAccountError && (
                      <p
                        className="delete-account-error"
                        role="alert"
                        style={{
                          color: "#dc2626",
                          fontSize: "13px",
                          margin: "8px 0 12px",
                          fontWeight: 500,
                        }}
                      >
                        {deleteAccountError}
                      </p>
                    )}

                    <div className="delete-account-actions">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => {
                          setDeleteAccountOpen(false);
                          setDeletePassword("");
                          setError("");
                          setDeleteAccountError("");
                        }}
                        disabled={deleteAccountLoading}
                      >
                        Cancel
                      </button>

                      <button
                        className="danger-btn"
                        type="button"
                        onClick={deleteAccount}
                        disabled={
                          deleteAccountLoading || deletePassword.length < 6
                        }
                      >
                        {deleteAccountLoading ? "Deleting…" : "Confirm delete"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </section>
          )}
        </div>
      </section>

      {/* REFLECTION DELETION CONFIRMATION DIALOG */}
      {confirmAction && confirmAction.type === "reflection" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmAction(null);
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">Are you sure?</h2>

            <p>{confirmAction.message}</p>

            <div className="confirm-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-btn"
                onClick={() => deleteReflection(confirmAction.id)}
              >
                Delete reflection
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          ✓ &nbsp;{toast}
        </div>
      )}
    </main>
  );
}
