import jwt from "jsonwebtoken";

export const generateToken = (userId: string): string | undefined => {
  try {
    const token = jwt.sign(
      {
        userId: userId,
      },
      process.env.JWT_SEC as string, 
      { expiresIn: "1d" }
    );
    return token;
  } catch (error) {
    console.error("Error in creating token:", error);
    return undefined;
  }
};
