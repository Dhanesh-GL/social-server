import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { hashString } from "./index.js";
import Verification from "../models/emailVerification.js";
import PasswordReset from "../models/PasswordReset.js";

dotenv.config();

const { AUTH_EMAIL, AUTH_PASSWORD } = process.env;
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: AUTH_EMAIL,
    pass: AUTH_PASSWORD,
  },
});

const generateRandomCode = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

export const sendVerificationEmail = async (user, res) => {
  const { _id, email, lastName } = user;

  const code = generateRandomCode();

  const mailOptions = {
    from: AUTH_EMAIL,
    to: email,
    subject: "Email Verification Code",
    html: `<div style='font-family: Arial, sans-serif; font-size: 20px; color: #333; background-color: #f7f7f7; padding: 20px; border-radius: 5px;'>
    <h3 style="color: rgb(8, 56, 188)">Please enter the verification code</h3>
    <hr>
    <h4>Hi ${lastName},</h4>
    <p>
        Please use the following 4-digit code to verify your email address:
        <br>
        <b>${code}</b>
        <br>
        <p>This code expires in 1 hour</p>
    </p>
    <div style="margin-top: 20px;">
        <h5>Best Regards</h5>
    </div>
    </div>`,
  };

  try {
   
    const newVerifiedEmail = await Verification.create({
      userId: _id,
      code: code.toString(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, 
    });

    if (newVerifiedEmail) {
      transporter
        .sendMail(mailOptions)
        .then(() => {
          res.status(201).send({
            success: "PENDING",
            message: "Verification code has been sent to your email.",
            data: _id,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(404).json({ message: "Something went wrong" });
        });
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "Something went wrong" });
  }
};

export const resetPasswordLink = async (user, res) => {
  const { _id, email } = user;

  const code = generateRandomCode();

  const mailOptions = {
    from: AUTH_EMAIL,
    to: email,
    subject: "Password Reset Code",
    html: `<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; background-color: #f7f7f7; padding: 20px; border-radius: 5px;">
         Password reset code. Please use the following 4-digit code to reset your password.
        <br>
        <b>${code}</b>
        <br>
        <p>This code expires in 10 minutes</p>
    </p>`,
  };

  try {

    const resetEmail = await PasswordReset.create({
      userId: _id,
      email: email,
      code: code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
    });

    if (resetEmail) {
      transporter
        .sendMail(mailOptions)
        .then(() => {
          res.status(201).send({
            success: "PENDING",
            message: "Password reset code has been sent to your email.",
            data: _id,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(404).json({ message: "Something went wrong" });
        });
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "Something went wrong" });
  }
};
