import express from 'express';
import { connect } from 'amqplib';
import axios from 'axios';
import { config } from "dotenv";
const app = express();
const PORT = process.env.PORT || 6060;

// type RiderRequest = {
//     riderId: string;
//     riderName: string;
//     currentLocation: {
//         latitude: number;
//         longitude: number;
//     };
//     destination: string;
//     destinationLocation: {
//         latitude: number;
//         longitude: number;
//     };
//     carType: 'economy' | 'standard' | 'luxury' | 'suv' | 'van';
// };




async function receiveMessages() {
    const queueName = process.env.QUEUE_NAME;

    try {
        const connection = await connect(`amqp://${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`);
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName, { durable: true });
        console.log('Connected to RabbitMQ');
        console.log(`Waiting for messages in ${queueName}. To exit, press CTRL+C`);


        channel.consume(queueName, async (message) => {
            if (!message) {
                console.log("Messege is empty")
                return
            }
            try {
                const rideRequest = JSON.parse(message.content.toString());
                console.log(rideRequest["riderId"])

                const { data } = await axios.post("http://localhost:7070/find_closest_drivers", {
                    lat: rideRequest.currentLocation.latitude,
                    lng: rideRequest.currentLocation.longitude
                });
                console.log(data);
                channel.ack(message)
            } catch (e) {
                console.log("Error parsing the message: ", e)
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
    setTimeout(() => {
        receiveMessages();
    }, 10000);
}
main();



app.use(express.json());
app.get("/status", (_, res) => {
    res.end("OK")
})
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
