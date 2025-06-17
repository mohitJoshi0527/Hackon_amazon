import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { CoinStatus, Item } from "../../generated/prisma";
import prisma from "../prisma";
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { value, deliveryDate, paymentMode, userId, assignedAgentId, items } =
      req.body;

    if (
      !value ||
      !deliveryDate ||
      !paymentMode ||
      !userId ||
      !assignedAgentId ||
      !items
    ) {
      res
        .status(400)
        .json({ success: false, message: "All fields are required" });
      return;
    }

    // 1. Create the order
    const order = await prisma.order.create({
      data: {
        value,
        deliveryDate: new Date(deliveryDate),
        paymentMode,
        userId,
        assignedAgentId,
        items: {
          connect: items.map((itemId: string) => ({
            itemId: itemId,
          })),
        },
      },
    });

    // 2. If payment mode is OFFLINE, create a Coin for the user
    if (paymentMode === "Offline") {
      await prisma.coin.create({
        data: {
          value,
          createdOn: new Date(),
          transferDate: new Date(),
          status: CoinStatus.Active,
          user: {
            connect: { id: userId },
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
    return;
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    4;
    return;
  }
};
