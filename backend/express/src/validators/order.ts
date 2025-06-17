import { z } from 'zod';

export const itemPickSchema = z.object({
    itemId: z.string().min(1, "Invalid itemId"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
});

enum PaymentMethod {
    PrePaid = "PrePaid",
    CashOnDelivery = "CashOnDelivery",
    Offline = "Offline"
}

export const createOrderSchema = z.object({
        items: z.array(itemPickSchema).min(1, "At least one item is required"),
        userId: z.string().min(1, "Invalid UserId"),
        paymentMode: z.enum([PaymentMethod.PrePaid, PaymentMethod.CashOnDelivery, PaymentMethod.Offline])
});