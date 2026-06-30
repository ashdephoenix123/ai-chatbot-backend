const { z } = require('zod');

const TravelPlanSchema = z.object({
    destination: z.string(),
    durationDays: z.number(),

    budget: z.object({
        currency: z.string().default("INR"),
        estimatedCost: z.number()
    }),

    itinary: z.array(
        z.object({
            day: z.number(),
            title: z.string(),
            activities: z.array(z.string())
        })
    ),

    hotels: z.object({
        stars: z.number().min(1).max(5),
        price: z.number().positive(),
        name: z.string().min(2),
    }),

    packingList: z.array(z.string()),

    travelMode: z.array(z.enum(["Flight", "Train", "Bus", "Car"])),

    tips: z.array(z.string()),

    bestSeason: z.string().optional().nullable()
})

module.exports = TravelPlanSchema