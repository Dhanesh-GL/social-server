import mongoose from "mongoose";
import Verification from "../models/emailVerification.js";
import Users from "../models/userModel.js";
import { compareString, createJWT, hashString } from "../utils/index.js";
import PasswordReset from "../models/PasswordReset.js";
import { resetPasswordLink } from "../utils/sendEmail.js";
import FriendRequest from "../models/friendRequest.js";

export const verifyEmail = async (req, res) => {
  const { userId } = req.body;
  const { code } = req.body; 

  try {
    const result = await Verification.findOne({ userId });

    if (result) {
      const { expiresAt, code: storedCode } = result;

      if (expiresAt < Date.now()) {
        await Verification.findOneAndDelete({ userId });
        await Users.findOneAndDelete({ _id: userId });

        const message = "Verification token has expired.";
        return res.status(400).json({ status: "error", message });
      }

      if (code === storedCode) {
        await Users.findOneAndUpdate({ _id: userId }, { verified: true });
        await Verification.findOneAndDelete({ userId });

        const message = "Email verified successfully";
        return res.status(200).json({ status: "success", message });
      } else {
        const message = "Verification failed or code is invalid";
        return res.status(400).json({ status: "error", message });
      }
    } else {
      const message = "Invalid verification request. Try again later.";
      return res.status(400).json({ status: "error", message });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "Email address not found.",
      });
    }
    const existingRequest = await PasswordReset.findOne({ email });
    if (existingRequest) {
      if (existingRequest.expiresAt > Date.now()) {
        return res.status(201).json({
          status: "PENDING",
          message: "A password reset code has already been sent to your email.",
        });
      }
      await PasswordReset.findOneAndDelete({ email });
    }
    await resetPasswordLink(user, res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { userId, code, password } = req.body;
  try {
    const user = await Users.findById(userId);

    if (!user) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid user ID" });
    }

    const resetPassword = await PasswordReset.findOne({ userId });

    if (!resetPassword) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid password reset request" });
    }

    const { expiresAt, code: resetCode } = resetPassword;

    if (expiresAt < Date.now()) {
      return res
        .status(400)
        .json({ status: "error", message: "Password reset code has expired" });
    } else if (code !== resetCode) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid password reset code" });
    } else {
      const hashedpassword = await hashString(password);

      const user = await Users.findByIdAndUpdate(
        { _id: userId },
        { password: hashedpassword }
      );
      if (user) {
        await PasswordReset.findOneAndDelete({ userId });
  
        res.status(200).json({
          ok: true,
        });
      }
     
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { userId, password } = req.body;

    const hashedpassword = await hashString(password);

    const user = await Users.findByIdAndUpdate(
      { _id: userId },
      { password: hashedpassword }
    );

    if (user) {
      await PasswordReset.findOneAndDelete({ userId });

      res.status(200).json({
        ok: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { userId } = req.body.user;
    const { id } = req.params;

    const user = await Users.findById(id ?? userId).populate({
      path: "friends",
      select: "-password",
    });

    if (!user) {
      return res.status(200).send({
        message: "User Not Found",
        success: false,
      });
    }

    user.password = undefined;
    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, location, profileUrl, profession } = req.body;

    if (!(firstName || lastName || contact || profession || location)) {
      next("Please provide all required fields");
      return;
    }

    const { userId } = req.body.user;

    const updateUser = {
      firstName,
      lastName,
      location,
      profileUrl,
      profession,
      _id: userId,
    };
    const user = await Users.findByIdAndUpdate(userId, updateUser, {
      new: true,
    });

    await user.populate({ path: "friends", select: "-password" });
    const token = createJWT(user?._id);

    user.password = undefined;

    res.status(200).json({
      sucess: true,
      message: "User updated successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const friendRequest = async (req, res, next) => {
  console.log( req.body)

  try {
    const { userId } = req.body.user;

    const { requestTo } = req.body;

    const requestExist = await FriendRequest.findOne({
      requestFrom: userId,
      requestTo,
    });

    if (requestExist) {
      next("Friend Request already sent.");
      return;
    }

    const accountExist = await FriendRequest.findOne({
      requestFrom: requestTo,
      requestTo: userId,
    });

    if (accountExist) {
      next("Friend Request already sent.");
      return;
    }

    const newRes = await FriendRequest.create({
      requestTo,
      requestFrom: userId,
    });

    res.status(201).json({
      success: true,
      message: "Friend Request sent successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const getFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body.user;

    const request = await FriendRequest.find({
      requestTo: userId,
      requestStatus: "Pending",
    })
      .populate({
        path: "requestFrom",
        select: "firstName lastName profileUrl profession -password",
      })
      .limit(10)
      .sort({
        _id: -1,
      });

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const id = req.body.user.userId;

    const { rid, status } = req.body;

    const requestExist = await FriendRequest.findById(rid);

    if (!requestExist) {
      next("No Friend Request Found.");
      return;
    }

    const newRes = await FriendRequest.findByIdAndUpdate(
      { _id: rid },
      { requestStatus: status }
    );

    if (status === "Accepted") {
      const user = await Users.findById(id);

      user.friends.push(newRes?.requestFrom);

      await user.save();

      const friend = await Users.findById(newRes?.requestFrom);

      friend.friends.push(newRes?.requestTo);

      await friend.save();
    }

    res.status(201).json({
      success: true,
      message: "Friend Request " + status,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const profileViews = async (req, res, next) => {
  try {
    const { userId } = req.body.user;
    const { id } = req.body;

    const user = await Users.findById(id);

    user.views.push(userId);

    await user.save();

    res.status(201).json({
      success: true,
      message: "Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const suggestedFriends = async (req, res) => {
  try {
    const { userId } = req.body.user;

    let queryObject = {};

    queryObject._id = { $ne: userId };

    queryObject.friends = { $nin: userId };

    let queryResult = Users.find(queryObject)
      .limit(15)
      .select("firstName lastName profileUrl profession -password");

    const suggestedFriends = await queryResult;

    res.status(200).json({
      success: true,
      data: suggestedFriends,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};
