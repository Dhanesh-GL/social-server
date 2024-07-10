import express from "express";
import path from "path";
import {
  acceptRequest,
  changePassword,
  friendRequest,
  getFriendRequest,
  getUser,
  profileViews,
  requestPasswordReset,
  resetPassword,
  suggestedFriends,
  updateUser,
  verifyEmail,
} from "../controllers/userController.js";
import userAuth from "../middleware/authMiddleware.js";

const router = express.Router();
const __dirname = path.resolve(path.dirname(""));

router.post("/verify", verifyEmail);
router.post("/request-passwordreset", requestPasswordReset);
router.post("/reset-password", resetPassword);

router.post("/get-user/:id?", userAuth, getUser);
router.put("/update-user", userAuth, updateUser);

router.post("/friend-request", userAuth, friendRequest);
router.post("/get-friend-request", userAuth, getFriendRequest);

router.post("/accept-request", userAuth, acceptRequest);

router.post("/profile-view", userAuth, profileViews);

router.post("/suggested-friends", userAuth, suggestedFriends);

router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/build", "index.html"));
});

router.get("/resetpassword", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/build", "index.html"));
});

export default router;
