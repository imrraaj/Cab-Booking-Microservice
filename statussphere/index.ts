import express from 'express';
import axios from 'axios';
import { MongoClient, Collection } from 'mongodb';

const app = express();
const port = 4900;

const MONGODB_HOST = process.env.MONGODB_HOST || "127.0.0.1:27018";
const DISCOVERY_SERVICE = process.env.DISCOVERY_SERVICE || "localhost";
const mongoURI = `mongodb://${MONGODB_HOST}`
const dbName = 'monitoringdb';
const collectionName = 'service_statuses';

interface ServiceStatus {
    service_name: string;
    status: boolean;
    timestamp: Date;
}

async function connectToMongoDB(): Promise<Collection<ServiceStatus>> {
    const client = new MongoClient(mongoURI);
    await client.connect();
    return client.db(dbName).collection<ServiceStatus>(collectionName);
}
async function healthcheck() {
    try {
        const response = await fetch(`http://${DISCOVERY_SERVICE}:8080/discover/all`);
        const services = await response.json();
        const serviceStatuses = [];


        for (const service_name in services) {
            let serviceStatus = false;
            try {
                const { status } = await axios.get(`http://${services[service_name]}/status`);
                serviceStatus = status === 200;
            } catch (error) {
                serviceStatus = false;
            }
            finally {
                const statusDoc: ServiceStatus = {
                    service_name: service_name,
                    status: serviceStatus,
                    timestamp: new Date(),
                };
                serviceStatuses.push(statusDoc);
            }
        }
        const collection = await connectToMongoDB();
        await collection.insertMany(serviceStatuses);
    } catch (error) {
        console.error('Error:', error);
    }
}
app.use(express.json());


app.get('/status', async (_: express.Request, res: express.Response) => {
    res.send("OK");
});

app.get("/check", async (req: express.Request, res: express.Response) => {
    // get all the data from the mongodb
    const collection = await connectToMongoDB();
    const data = await collection.find({}).toArray();
    res.json({ data })
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


function main() {
    // run this code every 10 minutes
    console.log('Running status check');
    healthcheck();
    setInterval(() => {
        console.log('Running status check');
        healthcheck();
    }, 60 * 1000);

}

main();