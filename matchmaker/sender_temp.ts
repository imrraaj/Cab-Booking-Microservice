import amqp from 'amqplib';
import { config } from "dotenv";

config();
async function sendMessage() {
    const queueName = process.env.QUEUE_NAME!;

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName, { durable: true });

        const message = 'Hello, RabbitMQ!';
        channel.sendToQueue(queueName, Buffer.from(message), { contentType: "application/json" });
        console.log(`Sent: ${message}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

sendMessage();
