import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.route"
import orderRoutes from "./routes/order.route"
// Create a new express application instance
const app = express();
app.use(cors());
app.use(express.json());
// Set the network port
const port = process.env.PORT || 3000;

// Define the root path with a greeting message
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to the Express + TypeScript Server!" });
});
app.use("/api/auth",authRoutes);
app.use("/api/order",orderRoutes);
// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});