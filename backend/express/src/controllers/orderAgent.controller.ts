import { Request, Response } from "express";
import prisma  from "../prisma"; 
import { verifyTransactionSchema } from "../validators/verifyTransaction";
export const getOrder = async (req: Request, res: Response) => {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        deliveryStatus: "Pending",
        AND: [
          { paymentMode: "Offline" }
        ]
      },
      select: {
        orderId: true,
        value: true,
        deliveryDate: true,
        paymentMode: true,
        deliveryStatus: true,
        userId: true,
        assignedAgentId: true,
        signature: true,
      },
    });

    res.status(200).json(pendingOrders);
  } catch (err) {
    console.error("Error fetching pending orders:", err);
    res.status(400).json({ msg: "Invalid request" });
  }
};

export const verifyTransaction = async (req: Request, res: Response) => {
  try {
    const parseResult = verifyTransactionSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.format() });\
      return;
    }

    const { data } = parseResult.data;

    for (const tx of data) {
      const { orderId, userId, assignedAgentId, coinId } = tx;

      // Update order status to Delivered
      await prisma.order.updateMany({
        where: {
          orderId,
          userId,
          assignedAgentId,
        },
        data: {
          deliveryStatus: "Delivered",
        },
      });

      // Update coin status to InActive
      await prisma.coin.updateMany({
        where: {
          coinId,
        },
        data: {
          status: "InActive",
        },
      });
    }

    res.status(200).json({ message: "Transactions verified and updated." });
  } catch (err) {
    console.error("Error verifying transaction:", err);
    res.status(500).json({ message: "Server Error" });
  }
};