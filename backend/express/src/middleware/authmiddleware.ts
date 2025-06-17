import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { User , Agent} from "../../generated/prisma";
// Extend Request to hold the authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
  agent? : Agent;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
       res.status(401).json({ success: false, message: "Authorization token missing" });
       return ; 
    }

    const token = authHeader.split(" ")[1];

    let decoded: { userId: string }; // Define the expected shape of the token payload
    try {
      decoded = jwt.verify(token, process.env.JWT_SEC as string) as { userId: string };
    } catch (verifyErr) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return ;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};
export const authAgentMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Authorization token missing" });
      return;
    }

    const token = authHeader.split(" ")[1];

    let decoded: { userId: string }; // Expected shape of JWT payload
    try {
      decoded = jwt.verify(token, process.env.JWT_SEC as string) as { userId: string };
    } catch (verifyErr) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: decoded.userId },
    });

    if (!agent) {
      res.status(401).json({ success: false, message: "Agent not found" });
      return;
    }

    req.agent = agent; 
    next();
  } catch (err) {
    console.error("Auth agent middleware error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};
