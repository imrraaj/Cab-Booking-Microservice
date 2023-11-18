import express from "express";
import { Surreal } from "surrealdb.node";
// type RiderRequest = {
//     rider: {
//         id: string;
//         name: string;
//         currentLocation: {
//             latitude: number;
//             longitude: number;
//         };
//     };
//     driver: {
//         id: string;
//         name: string;
//     };
//     destination: string;
//     destinationLocation: {
//         latitude: number;
//         longitude: number;
//     };
//     carType: 'economy' | 'standard' | 'luxury' | 'suv' | 'van';
//     price: number;
//     paymentDone: boolean;
// };





const app = express();
const port = 9090;
const db = new Surreal();


async function storeData(data) {
    try {
        let created = await db.create('rides', data);
        console.log('Data stored in SurrealDB:', created);
    } catch (e) {
        console.error('Error storing data in SurrealDB:', e);
    }
}

async function getRideHistory(userId) {
    try {
        const filter = { userId };
        const rides = await db.select('rides', filter);
        return rides;
    } catch (e) {
        console.error('Error fetching ride history from SurrealDB:', e);
        return [];
    }
}

async function setPaymentStatus(rideId) {
    try {
        const filter = { rideId };
        const update = { $set: { payment: true } };
        const result = await db.update('rides', filter, update);

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

    if (!data) {
        res.status(400).json({ error: 'Invalid data' });
    } else {
        await storeData(data);
        res.json({ message: 'Data stored successfully' });
    }
});

app.get('/ride-history/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        res.status(400).json({ error: 'Invalid data' });
    } else {
        const rides = await getRideHistory(userId);
        res.json({ rideHistory: rides });
    }
});

app.post('/set-payment/:rideId', async (req, res) => {
    const rideId = req.params.rideId;
    if (!rideRequest) {
        res.status(404).json({ error: 'Ride not found' });
    } else {
        const paymentResult = await setPaymentStatus(rideId);
        res.json(paymentResult);
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
