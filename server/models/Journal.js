const mongoose = require("mongoose");

const JournalSchema = new mongoose.Schema(
  {
    entry: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    mood: {
      type: String,
      default: "Neutral",
      enum: ["Great", "Good", "Okay", "Low", "Anxious", "Neutral"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 24,
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

JournalSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Journal", JournalSchema);
