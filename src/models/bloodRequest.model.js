const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the BloodRequest Schema
const BloodRequestSchema = new Schema(
  {
    // Details about the recipient
    recipientType: {
      type: String,
      enum: ["myself", "familyMember", "other"],
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    bloodGroupType: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,

    },
    contactNumber2: {
      type: String,
    },

    // Hospital details
    hospital: {
      type: String,
      required: true,
    },
    hospitalLocation: {
      type: {
        latitude: {
          type: Number,
          required: true,
        },
        longitude: {
          type: Number,
          required: true,
        },
      },
      required: true,
    },
    match: {
      type: Boolean,
      default: false
    },
    urgency: {
      type: String,
      enum: ["urgent"],
      default: "urgent",
    },
    bloodUnits: {
      type: Number,
      required: true,
      min: 1, // Minimum 1 unit of blood
    },
    requestReason: {
      type: String,
    },
    bloodType: {
      type: String,
      enum: ["wholeBlood"],
      default: "wholeBlood",
    },

    // User who created the request
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status of the blood request
    status: {
      type: String,
      enum: ["pending", "approved", "fulfilled", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Create and export the BloodRequest model
const BloodRequest = mongoose.model("BloodRequest", BloodRequestSchema);
module.exports = BloodRequest;