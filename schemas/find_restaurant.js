const { z } = require("zod");

const RestaurantSchema = z.object({
    status: z.enum(['success', 'needs_clarification', 'error']),
    city: z.string(),
    cuisine: z.string(),
    restaurants: z.array(
        z.object({
            name: z.string(),
            rating: z.number().min(1).max(5),
            priceRange: z.enum(['Budget', 'Mid-range', 'Premium']),
            mustTry: z.array(z.string())
        })
    ),
    clarificationMessage: z.string().optional().nullable()
});

module.exports = RestaurantSchema