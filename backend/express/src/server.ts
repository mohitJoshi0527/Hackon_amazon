import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

import express, { Request, Response } from "express";
import customerAuthRoutes from "./routes/customer/auth.route"
import customerOrderRoutes from "./routes/customer/order.route"
import agentAuthRoutes from "./routes/agent/auth.route";
import itemRouter from "./routes/customer/item.route";
import orderAgentRoute from "./routes/agent/order.route"
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to the Express + TypeScript Server!" });
});
app.use("/api/c/auth",customerAuthRoutes);
app.use("/api/c/order",customerOrderRoutes);
app.use("/api/c/",itemRouter);

app.use("/api/a/auth",agentAuthRoutes);
app.use("/api/a/order",orderAgentRoute);

app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});