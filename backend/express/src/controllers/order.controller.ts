import { Request, Response } from "express";
import { createOrderSchema } from "../validators/order";
import prisma from "../prisma";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const { items, userId, paymentMode } = parseResult.data;

    let value = 0;
    const itemIds: string[] = [];

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

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          value,
          deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          paymentMode,
          items: {
            connect: itemIds.map((id) => ({ itemId: id })),
          },
        },
      });

      const coin =  await tx.coin.create({
        data: {
          userId,
          orderId : order.orderId,
          value,
        }
      })
    });

    res.status(201).json({ message: "Order created successfully" });
    return;
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: "Invalid request" });
    return;
  }
};

export const getOrder = async (req:Request, res: Response) => {
  const orderList = await prisma.order.findMany();
  if(!orderList){
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
  res.status(200).json(orderList);
  return;
}