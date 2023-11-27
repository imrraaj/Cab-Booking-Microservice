import express from "express";
import { Surreal } from "surrealdb.node";
import { riderRequestSchema, locationSchema } from "./schema";
import { z } from "zod";

const PORT = 9090;
const SURREALDB_HOST = process.env.SURREALDB_HOST || 'localhost';
const db = new Surreal();

const app = express();
app.use(express.json());

type Location = z.infer<typeof locationSchema>;
function calculateDistance(location1: Location, location2: Location) {

    // Function to convert degrees to radians
    function deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }


    const lat1 = location1.latitude;
    const lon1 = location1.longitude;
    const lat2 = location2.latitude;
    const lon2 = location2.longitude;

    // Calculate distance using coordinates (hypothetical formula)
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}


app.post("/create", async (req, res) => {
    const data = req.body;
    const validatedData = riderRequestSchema.safeParse(data);
    if (!validatedData.success) {
        res.status(400).json({ error: 'Invalid data', details: validatedData.error.errors });
        return;
    }

    // add price for that
    const currentLocation = validatedData.data.currentLocation;
    const destinationLocation = validatedData.data.destinationLocation;

    // Calculate the distance between current and destination locations (hypothetically)
    const distanceInKm = calculateDistance(currentLocation, destinationLocation);

    // Assuming a price rate per kilometer (you can define your own pricing logic)
    const pricePerKm = 15; // For example, ₹15 per kilometer

    // Calculate the price for the ride
    const price = distanceInKm * pricePerKm;

    // Add the calculated price to the validated data
    validatedData.data.price = Math.ceil(price);
    try {
        const rideObj = await db.create('rides', { ...validatedData });
        return res.json({ message: 'Data stored successfully', data: rideObj });
    } catch (e) {
        console.error('Error storing data in SurrealDB:', e);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

app.get("/details/user/:userId", async (req, res) => {
    try {
        const userId = z.string().parse(req.params.userId);

        const result = await db.query(
            'SELECT * FROM rides WHERE data.riderId = $rId;',
            { rId: userId }
        );
        return res.json({ rides: result })
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
})
app.get("/details/driver/:driverId", async (req, res) => {
    try {
        const driverId = z.string().parse(req.params.driverId);

        const result = await db.query(
            'SELECT * FROM rides WHERE data.driverId = $rId;',
            { rId: driverId }
        );
        return res.json({ rides: result })
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
})
app.get("/details/ride/:rideId", async (req, res) => {
    try {
        const rideId = z.string().parse(req.params.rideId);

        const result = await db.query(
            'SELECT * FROM rides WHERE id = $rId;',
            { rId: rideId }
        );
        return res.json({ ride: result })
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
})

app.post('/set-payment/:rideId', async (req, res) => {
    const rideIdSchema = z.string();

    try {
        const rideId = rideIdSchema.parse(req.params.rideId);
        const result = await db.query(
            'UPDATE rides SET payment = true WHERE id = $rId',
            { rId: rideId }
        )
        res.json({ result });
    } catch (error: any) {
        res.status(400).json({ error: 'Invalid rideId', details: error.issues });
    }
});

app.listen(PORT, async () => {
    console.log(`Service listening on PORT ${PORT}`);
    try {
        await db.connect(`ws://${SURREALDB_HOST}:8000`);
        await db.signin({
            username: 'root',
            password: 'root',
        });
        await db.use({ ns: 'test', db: 'test' });
        console.log("Database connected!!");
    } catch (e) {
        console.error('Error connecting to SurrealDB:', e);
        process.exit(1);
    }
});
