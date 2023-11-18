import express from 'express';
import axios from 'axios';
import { MongoClient, Collection } from 'mongodb';

const app = express();
const port = 4900;

const mongoURI = 'mongodb://127.0.0.1:27018';
const dbName = 'monitoringdb';
const collectionName = 'service_statuses';

interface ServiceStatus {
    service_name: string;
    status: boolean;
    timestamp: Date;
}

async function connectToMongoDB() {
    const client = new MongoClient(mongoURI);
    await client.connect();
    return client.db(dbName).collection<ServiceStatus>(collectionName);
}
async function healthcheck() {
    try {
        const response = await fetch('http://127.0.0.1:8080/discover/all');
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
        const collection: Collection<ServiceStatus> = await connectToMongoDB();
        await collection.insertMany(serviceStatuses);
    } catch (error) {
        console.error('Error:', error);
    }
}
app.use(express.json());

// app.get('/healthcheck', async (_, res) => healthcheck());

// add a status endpoint 
app.get('/status', async (req, res) => {
    res.send("OK");
});


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
    }, 10 * 1000);

}

main();