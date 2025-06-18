import { z } from 'zod';
import { PaymentMethod } from './order';

const coinSchema = z.object({
    coinId: z.string().min(1,"Invalid Coin Id"),
    value: z.number().min(0,"Invalid Amount"),
    agentId: z.string().min(0,"Invalid Agent Id")
})
const tranxLogSchema = z.object({
    orderId: z.string().min(1, "Invalid UserId"),
    userId: z.string().min(1, "Invalid UserId"),
    assignedAgentId: z.string().min(1, "Invalid UserId"),
    value: z.number().min(0,"Invalid value"),
    paymentMode: z.enum([PaymentMethod.PrePaid, PaymentMethod.CashOnDelivery, PaymentMethod.Offline]),
    
})
export const verifyTransactionSchema = z.object({
    datat: z.array(tranxLogSchema).min(1,"Invalid Request")
})