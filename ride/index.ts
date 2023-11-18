import express from "express";
import { Surreal } from "surrealdb.node";
import { driverSchema, locationSchema, riderRequestSchema, riderSchema } from "./schema";
import { z } from "zod";
const app = express();
const port = 9090;
const db = new Surreal();

async function setPaymentStatus(rideId: string) {
    try {
        const filter = { rideId };
        const update = { $set: { payment: true } };
        const result = await db.update('rides', filter);

        if (result.matchedCount > 0) {
            return { success: true, message: 'Payment status updated successfully' };
        } else {
            return { success: false, message: 'Ride not found' };
        }
    } catch (e) {
        console.error('Error updating payment status in SurrealDB:', e);
        return { success: false, message: 'Error updating payment status' };
    }
}




app.post('/get-price', express.json(), async (req, res) => {
    const data = req.body;
    try {
        const validatedData = riderRequestSchema.parse(data);
        try {
            let created = await db.create('rides', validatedData);
            console.log('Data stored in SurrealDB:', created);
        } catch (e) {
            console.error('Error storing data in SurrealDB:', e);
        }
        res.json({ message: 'Data stored successfully' });
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
});

app.get('/ride-history/:userId', async (req, res) => {
    const userIdSchema = z.string();
    let rides: any = [];
    try {
        const userId = userIdSchema.parse(req.params.userId);
        try {
            const rides = await db.select('rides');
            return rides;
        } catch (e) {
            console.error('Error fetching ride history from SurrealDB:', e);
        }
        res.json({ rideHistory: rides });
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
});

app.post('/set-payment/:rideId', async (req, res) => {
    const rideIdSchema = z.string();

    try {
        const rideId = rideIdSchema.parse(req.params.rideId);
        const paymentResult = await setPaymentStatus(rideId);
        res.json(paymentResult);
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid rideId', details: error.issues });
    }
});


app.listen(port, async () => {
    console.log(`Service listening on port ${port}`);
    try {
        await db.connect('ws://127.0.0.1:8000');
        await db.signin({
            username: 'root',
            password: 'root',
        });
        await db.use({ ns: 'test', db: 'test' });
        console.log("Database connected!!")
    } catch (e) {
        console.error('Error connecting to SurrealDB:', e);
        process.exit(1);
    }
});
