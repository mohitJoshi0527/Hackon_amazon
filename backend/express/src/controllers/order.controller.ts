import { Request, Response } from "express";
import { createOrderSchema } from "../validators/order";
import { randomBytes } from "crypto";
import prisma from "../prisma";
import jwt from "jsonwebtoken";
import { PaymentMethod } from "../../generated/prisma";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const { items, userId, paymentMode } = parseResult.data;

    let value = 0;
    const itemIds: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const itemId = items[i].itemId;
      const item = await prisma.item.findFirst({ where: { itemId } });
      if (!item) {
        res.status(400).json({ message: `Invalid item selected: ${itemId}` });
        return;
      }
      value += item.price * items[i].quantity;
      itemIds.push(itemId);
    }
    const signature =
      paymentMode === PaymentMethod.Offline
        ? randomBytes(32).toString("hex")
        : null;
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          value,
          deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          paymentMode,
          assignedAgentId: "516fdf07-5622-4221-87cf-13c0825bd12f",
          items: {
            connect: itemIds.map((id) => ({ itemId: id })),
          },
          signature,
        },
      });
      if (order.paymentMode === PaymentMethod.Offline) {
        const coin = await tx.coin.create({
          data: {
            userId,
            orderId: order.orderId,
            value,
            agentId: "516fdf07-5622-4221-87cf-13c0825bd12f",
          },
        });
      }
    });

    res.status(201).json({ message: "Order created successfully" });
    return;
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: "Invalid request" });
    return;
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res
        .status(400)
        .json({ message: "userId is required as a query parameter" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
      res.status(400).json({ message: "Invalid user" });
      return;
    }

    const orderList = await prisma.order.findMany({
      where: { userId: user.id },
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

    const ordersWithCoins = await Promise.all(
      orderList.map(async (order) => {
        const { signature, ...rest } = order;
        let signedCoin: string | null = null;

        if (signature) {
          const coinPayload = await prisma.coin.findFirst({
            where: { orderId: order.orderId },
            select: { coinId: true },
          });

          if (coinPayload) {
            const tranxPayload = {
              orderId: order.orderId,
              userId: order.userId,
              assignedAgentId: order.assignedAgentId ?? "",
              coinId: coinPayload.coinId,
            };

            signedCoin = jwt.sign(tranxPayload, signature, {
              algorithm: "HS256",
            });
          }
        }

        return { ...rest, coin: signedCoin };
      })
    );

    res.status(200).json(ordersWithCoins);
    return;
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
};
