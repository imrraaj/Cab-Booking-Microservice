import { z } from 'zod';


export const locationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});

export const driverSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const riderSchema = z.object({
    id: z.string(),
    name: z.string(),
    currentLocation: locationSchema,
});

export const riderRequestSchema = z.object({
    rider: riderSchema,
    driver: driverSchema,
    destination: z.string(),
    destinationLocation: locationSchema,
    carType: z.string(),
    price: z.number(),
    paymentDone: z.boolean(),
});
