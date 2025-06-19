import { z } from 'zod';

const tranxLogSchema = z.object({
    orderId: z.string().min(1, "Invalid UserId"),
    userId: z.string().min(1, "Invalid UserId"),
    assignedAgentId: z.string().min(1, "Invalid UserId"), 
    coinId: z.string().min(1,"Invalid Coin Id"),
})
export const verifyTransactionSchema = z.object({
    data: z.array(tranxLogSchema).min(1,"Invalid Request")
})