import { Request,Response } from "express";
import prisma from "../prisma";
import { generateToken } from "../utils/token.js";
import bcrypt from "bcryptjs";
interface signupBody{
  firstName : string;
  lastName :string;
  email : string;
  hashPassword : string;
  phone : string;
}
interface LoginRequestBody {
  email: string;
  password: string;
}
type SignupAgentBody = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  hashPassword: string;
};

type LoginAgentBody = {
  email: string;
  password: string;
};

export const createUser = async(req:Request,res:Response)=>{
  try {
    const { firstName ,lastName,email,hashPassword,phone} : signupBody= req.body;
     if (!firstName || !lastName || !phone || !email || !hashPassword) {
      res.status(400).json({ message: "All fields are required." });
      return ;
    }
    const existingUser =  await prisma.user.findUnique({
      where: { email },
    });
    if(existingUser){
       res.status(400).json({message:"User already exists"});
       return;
    }
    const hashedpassword = await bcrypt.hash(hashPassword, 10);
    const user = await prisma.user.create({
      data: {
        firstName: firstName,
        lastName,
        email,
        hashPassword : hashedpassword,
        phone,
    }});
    const token = generateToken(user.id);
    res.json({success:true,user,token,message:"user created successfully"});
  } catch (error:any) {
    console.log(error);
     res.status(500).json({ success: false, message: "Internal server error" });
  }
}
export const Login = async (req: Request, res: Response) => {
  try {
    const { email, password } : LoginRequestBody = req.body;

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
    const { firstName, lastName, phone, email, hashPassword }: SignupAgentBody = req.body;

    if (!firstName || !lastName || !phone || !email || !hashPassword) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

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
    const { email, password }: LoginAgentBody = req.body;

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
