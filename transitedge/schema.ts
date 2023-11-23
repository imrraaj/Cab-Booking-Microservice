import { z } from 'zod';


export const locationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});


export const riderRequestSchema = z.object({
    riderId: z.string(),
    riderName: z.string(),
    destination: z.string(),
    currentLocation: locationSchema,
    destinationLocation: locationSchema,
    driverId: z.string(),
    driverName: z.string(),
    carType: z.string(),
    price: z.number().optional()
});

