import { Request, Response } from "express";

export const verifyTransaction = async (req: Request, res: Response) => {
  try {
    
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
