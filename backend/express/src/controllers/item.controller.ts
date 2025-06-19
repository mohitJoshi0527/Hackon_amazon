import { Request, Response } from "express";
import prisma from "../prisma";

export const getItem = async (req: Request, res: Response) => {
    try {
        const itemList = await prisma.item.findMany();
        if(!itemList){
            res.status(200).json({message : "can't load items"});
            return;
        }
        
        res.status(200).json(itemList);
        return;
    } catch(error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}