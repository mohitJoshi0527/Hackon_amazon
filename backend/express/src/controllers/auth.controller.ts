import { Request, Response } from "express";
import prisma from "../prisma";
import { generateToken } from "../utils/token.js";
import bcrypt from "bcryptjs";
import {
  signupSchema,
  loginSchema,
  signupAgentSchema,
  loginAgentSchema,
} from "../validators/auth";

export const createUser = async (req: Request, res: Response) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }
    const { firstName, lastName, email, password, phone } =
      parseResult.data;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName: firstName,
        lastName,
        email,
        hashPassword: hashedpassword,
        phone,
      },
    });
    const token = generateToken(user.id);
    res.json({
      success: true,
      user,
      token,
      message: "user created successfully",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const Login = async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }
    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(400).json({ success: false, message: "User doesn't exist" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.hashPassword);

    if (!isValidPassword) {
      res.status(400).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id);
    const { hashPassword, ...userWithoutPassword } = user;
    console.log("Token :",token);
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createAgent = async (req: Request, res: Response) => {
  try {
    const parseResult = signupAgentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }
    const { firstName, lastName, phone, email, hashPassword } =
      parseResult.data;

    const existingAgent = await prisma.agent.findUnique({ where: { email } });

    if (existingAgent) {
      res.status(400).json({ message: "Agent already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(hashPassword, 10);

    const agent = await prisma.agent.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        hashPassword: hashedPassword,
      },
    });

    const token = generateToken(agent.id);

    res.status(201).json({
      success: true,
      agent,
      token,
      message: "Agent created successfully",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const loginAgent = async (req: Request, res: Response) => {
  try {
    const parseResult = loginAgentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }
    const { email, password } = parseResult.data;

    const agent = await prisma.agent.findUnique({ where: { email } });

    if (!agent) {
      res.status(400).json({ success: false, message: "Agent doesn't exist" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, agent.hashPassword);

    if (!isValidPassword) {
      res.status(400).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = generateToken(agent.id);

    const { hashPassword, ...agentWithoutPassword } = agent;

    res.status(200).json({
      success: true,
      message: "Login successful",
      agent: agentWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
