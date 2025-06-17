import { z } from "zod";

export const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  hashPassword: z.string().min(8, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password is required"),
});

export const signupAgentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Invalid email"),
  hashPassword: z.string().min(8, "Password must be at least 6 characters"),
});

export const loginAgentSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password is required"),
});