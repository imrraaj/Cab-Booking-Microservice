import amqp from 'amqplib';
import { config } from "dotenv";

config();
async function sendMessage() {
    const queueName = process.env.QUEUE_NAME;

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName, { durable: true });

        const message = {
            riderId: "123",
            riderName: "Raj Patel",
            currentLocation: {
                latitude: 0,
                longitude: 0,
            },
            destination: "Ahmedabad",
            destinationLocation: {
                latitude: 72.44,
                longitude: 10.24,
            },
            carType: 'economy'
        };
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { contentType: "application/json" });
        console.log(`Sent: ${message}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

sendMessage();
