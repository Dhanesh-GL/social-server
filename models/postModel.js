import mongoose, { Schema } from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users" },
    description: { type: String, required: true },
    file: { 
      url: {  type: String },
      type: { type: String, enum: ['image', 'gif', 'audio', 'video','application','text'] }
    },    likes: [{ type: String }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comments" }],
  },
  { timestamps: true }
);

const Posts = mongoose.model("Posts", postSchema);

export default Posts;
