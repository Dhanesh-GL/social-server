import mongoose, { Schema } from "mongoose";

const emailVerificationSchema = Schema({
  userId: String,
  code: String,
  createdAt: Date,
  expiresAt: Date,
});

const Verification = mongoose.model("Verification", emailVerificationSchema);

export default Verification;
