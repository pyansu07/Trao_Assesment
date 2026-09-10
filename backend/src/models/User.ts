import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export type UserDoc = mongoose.HydratedDocument<InferSchemaType<typeof UserSchema>>;

export const User = mongoose.model("User", UserSchema);
