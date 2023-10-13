import express from 'express';
import { Connection, Channel, connect, ConsumeMessage } from 'amqplib';
import axios from 'axios';
import { config } from "dotenv";
const app = express();
const PORT = process.env.PORT || 6060;

type RiderRequest = {
    riderId: string;
    riderName: string;
    currentLocation: {
        latitude: number;
        longitude: number;
    };
    destination: string;
    destinationLocation: {
        latitude: number;
        longitude: number;
    };
    carType: 'economy' | 'standard' | 'luxury' | 'suv' | 'van';
};


async function processMessage(channel: Channel, message: ConsumeMessage) {
    try {

        const rideRequest = JSON.parse(message.content.toString()) as RiderRequest;

        const driverServiceURL = 'http://driver-service/find-nearby-drivers';
        try {
            const response = await axios.post(driverServiceURL, rideRequest);
            const data = response.data;
            console.log(data)
            channel.ack(message);
        } catch (error) {
            console.error('Error sending request to driver service:', error);
        }
    } catch (error) {

    }
}

async function receiveMessages() {
    const queueName = process.env.QUEUE_NAME!;

    try {
        const connection: Connection = await connect(`amqp://${process.env.RABBITMQ_HOST!}:${process.env.RABBITMQ_PORT!}`);
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName, { durable: true });
        console.log('Connected to RabbitMQ');
        console.log(`Waiting for messages in ${queueName}. To exit, press CTRL+C`);


        channel.consume(queueName, (message) => {
            if (!message) return
            if (message.content) {
                processMessage(channel, message);
            }
        });
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
    }
}


function main() {
    console.log("Hello, Starting the application...");
    config();
    console.log("Environment variables loaded successfully...");
    console.log("Starting to listening for messages...");
    receiveMessages();
}
main();



app.use(express.json());
app.get("/status", (_, res) => {
    res.end("OK")
})
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
