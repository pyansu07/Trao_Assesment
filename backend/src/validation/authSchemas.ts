import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email address"),
  password: z.string().min(8, "password must be at least 8 characters").max(200),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email address"),
  password: z.string().min(1, "password is required"),
});
