const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Journal = require("../models/Journal");

const router = express.Router();

const ALLOWED_MOODS = ["Great", "Good", "Okay", "Low", "Anxious", "Neutral"];
const MAX_ENTRY_LENGTH = 10000;
const MAX_TAGS = 20;

function auth(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
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

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Session expired. Please sign in again.",
    });
  }
}

function validateId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: "Invalid reflection ID.",
    });
  }
  next();
}

function normalizeTags(tags) {
  if (tags === undefined) return [];

  if (!Array.isArray(tags) || tags.length > MAX_TAGS) {
    throw new Error("You can add up to 20 tags per reflection.");
  }

  const cleaned = tags.map((tag) => {
    if (typeof tag !== "string") {
      throw new Error("Tags must be text.");
    }

    const value = tag.trim().replace(/^#+/, "");

    if (!value || value.length > 24) {
      throw new Error("Each tag must contain 1–24 characters.");
    }

    return value;
  });

  return [...new Set(cleaned)];
}

router.use(auth);

// GET ALL REFLECTIONS
router.get("/", async (req, res) => {
  try {
    const entries = await Journal.find({ userId: req.user.userId })
      .sort({ date: -1 })
      .lean();

    return res.json(entries);
  } catch (error) {
    console.error("Fetch reflections error:", error);
    return res.status(500).json({
      error: "Could not load reflections.",
    });
  }
});

// CREATE REFLECTION
router.post("/", async (req, res) => {
  try {
    const entry =
      typeof req.body.entry === "string" ? req.body.entry.trim() : "";
    const mood = req.body.mood || "Neutral";

    if (!entry) {
      return res.status(400).json({
        error: "Write a little about your day first.",
      });
    }

    if (entry.length > MAX_ENTRY_LENGTH) {
      return res.status(400).json({
        error: "Entry must be under 10,000 characters.",
      });
    }

    if (!ALLOWED_MOODS.includes(mood)) {
      return res.status(400).json({
        error: "Please select a valid mood.",
      });
    }

    const tags = normalizeTags(req.body.tags);
    const created = await Journal.create({
      entry,
      mood,
      tags,
      userId: req.user.userId,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error("Create reflection error:", error);
    return res.status(400).json({
      error: error.message || "Could not save this reflection.",
    });
  }
});

// UPDATE REFLECTION
router.put("/:id", validateId, async (req, res) => {
  try {
    const entry =
      typeof req.body.entry === "string" ? req.body.entry.trim() : "";

    if (!entry) {
      return res.status(400).json({
        error: "Reflection cannot be empty.",
      });
    }

    if (entry.length > MAX_ENTRY_LENGTH) {
      return res.status(400).json({
        error: "Entry must be under 10,000 characters.",
      });
    }

    const update = { entry };

    if (req.body.mood !== undefined) {
      if (!ALLOWED_MOODS.includes(req.body.mood)) {
        return res.status(400).json({
          error: "Please select a valid mood.",
        });
      }
      update.mood = req.body.mood;
    }

    if (req.body.tags !== undefined) {
      update.tags = normalizeTags(req.body.tags);
    }

    const updated = await Journal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({
        error: "Reflection not found.",
      });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Update reflection error:", error);
    return res.status(400).json({
      error: error.message || "Could not update this reflection.",
    });
  }
});

// DELETE REFLECTION
router.delete("/:id", validateId, async (req, res) => {
  try {
    const deleted = await Journal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!deleted) {
      return res.status(404).json({
        error: "Reflection not found.",
      });
    }

    return res.json({
      message: "Reflection deleted successfully.",
    });
  } catch (error) {
    console.error("Delete reflection error:", error);
    return res.status(500).json({
      error: "Could not delete this reflection.",
    });
  }
});

module.exports = router;
