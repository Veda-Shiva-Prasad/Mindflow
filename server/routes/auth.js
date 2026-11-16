const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Journal = require("../models/Journal");

const router = express.Router();

const secret = () => process.env.JWT_SECRET;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_BYTES = 72;

function usernameQuery(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    username: {
      $regex: `^${escaped}$`,
      $options: "i",
    },
  };
}

function validatePassword(password) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES
  );
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferences: user.preferences || {
      theme: "light",
      sidebarCollapsed: false,
    },
  };
}

function issueToken(user) {
  if (!secret()) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId: user._id }, secret(), { expiresIn: "7d" });
}

// 401 is reserved for a missing, invalid or expired TOKEN only.
// A wrong password must never return 401, because the frontend treats
// every 401 as "session expired" and logs the user out.
function authenticate(req, res, next) {
  try {
    if (!secret()) {
      return res.status(500).json({
        error: "Server authentication configuration is missing.",
      });
    }

    const [scheme, token] = String(req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "Authentication required.",
      });
    }

    req.user = jwt.verify(token, secret());
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired. Please sign in again.",
    });
  }
}

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: "Username must be 3–30 characters.",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 6 characters and no more than 72 UTF-8 bytes.",
      });
    }

    if (!secret()) {
      return res.status(500).json({
        error: "Server authentication configuration is missing.",
      });
    }

    if (await User.findOne(usernameQuery(username))) {
      return res.status(409).json({
        error: "An account with this username already exists.",
      });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      password: await bcrypt.hash(password, 12),
    });

    return res.status(201).json({
      token: issueToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: "This username is already taken.",
      });
    }

    return res.status(500).json({
      error: "Unable to create account right now.",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required.",
      });
    }

    if (!secret()) {
      return res.status(500).json({
        error: "Server authentication configuration is missing.",
      });
    }

    const user = await User.findOne(usernameQuery(username));

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: "Incorrect username or password.",
      });
    }

    return res.json({
      token: issueToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Unable to sign in right now.",
    });
  }
});

// GET PROFILE
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    return res.json(publicUser(user));
  } catch (error) {
    console.error("Profile fetch error:", error);

    return res.status(500).json({
      error: "Unable to load account information.",
    });
  }
});

// UPDATE USERNAME
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: "Username must be 3–30 characters.",
      });
    }

    const duplicate = await User.findOne({
      ...usernameQuery(username),
      _id: { $ne: req.user.userId },
    });

    if (duplicate) {
      return res.status(409).json({
        error: "This username is already taken.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { username: username.toLowerCase() } },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    return res.json({
      message: "Profile updated successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: "This username is already taken.",
      });
    }

    return res.status(500).json({
      error: "Unable to update profile.",
    });
  }
});

// CHANGE PASSWORD
router.put("/password", authenticate, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current and new passwords are required.",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error:
          "New password must be at least 6 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      // 403 (not 401) so the frontend does not treat this as an expired session.
      return res.status(403).json({
        error: "Your current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({
      message: "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Password update error:", error);

    return res.status(500).json({
      error: "Unable to change password.",
    });
  }
});

// GET PREFERENCES
router.get("/preferences", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("preferences");

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    return res.json(
      user.preferences || {
        theme: "light",
        sidebarCollapsed: false,
      },
    );
  } catch (error) {
    console.error("Preferences fetch error:", error);

    return res.status(500).json({
      error: "Unable to load preferences.",
    });
  }
});

// SAVE PREFERENCES
router.patch("/preferences", authenticate, async (req, res) => {
  try {
    const updates = {};

    if (req.body.theme !== undefined) {
      if (!["light", "dark"].includes(req.body.theme)) {
        return res.status(400).json({
          error: "Theme must be light or dark.",
        });
      }

      updates["preferences.theme"] = req.body.theme;
    }

    if (req.body.sidebarCollapsed !== undefined) {
      if (typeof req.body.sidebarCollapsed !== "boolean") {
        return res.status(400).json({
          error: "Sidebar preference must be true or false.",
        });
      }

      updates["preferences.sidebarCollapsed"] = req.body.sidebarCollapsed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid preference changes were provided.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    return res.json({
      message: "Preferences saved.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Preferences update error:", error);

    return res.status(500).json({
      error: "Unable to save preferences.",
    });
  }
});

// DELETE ACCOUNT AND ITS REFLECTIONS
router.delete("/account", authenticate, async (req, res) => {
  try {
    const password = req.body?.password;

    // Password must be supplied as a string.
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: "Enter your complete account password.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    // Reject missing or invalid password hashes.
    if (
      typeof user.password !== "string" ||
      !/^\$2[aby]\$/.test(user.password)
    ) {
      return res.status(500).json({
        error: "Account password verification is unavailable.",
      });
    }

    // Always verify the complete password against the stored hash.
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      // 403 (not 401): the session is valid, the password is just wrong.
      // Returning 401 here made the frontend log the user out, which looked
      // like the account had been deleted even though it had not.
      return res.status(403).json({
        error: "Incorrect password. Your account has NOT been deleted.",
      });
    }

    // Delete only after successful password verification.
    const deletedUser = await User.deleteOne({
      _id: user._id,
    });

    if (deletedUser.deletedCount !== 1) {
      return res.status(500).json({
        error: "Account deletion failed. Please try again.",
      });
    }

    await Journal.deleteMany({
      userId: user._id,
    });

    return res.status(200).json({
      message: "Account and reflections deleted successfully.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);

    return res.status(500).json({
      error: "Unable to delete account right now.",
    });
  }
});

module.exports = router;
