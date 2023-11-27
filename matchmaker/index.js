import express from 'express';
import { connect } from 'amqplib';
import axios from 'axios';
import { config } from 'dotenv';
const app = express();
const PORT = 6060;

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const DRIVEMASTER_SERVICE = process.env.DRIVEMASTER_SERVICE || "localhost";
const TRANSITEDGE_SERVICE = process.env.DRIVEMASTER_SERVICE || "localhost";



async function receiveMessages() {
    const queueName = process.env.QUEUE_NAME;

    try {
        const connection = await connect(`amqp://${RABBITMQ_HOST}:5672`);
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
                console.log(rideRequest)
                const { data: drivermasterResponse } = await axios.post(`http://${DRIVEMASTER_SERVICE}:7070/find_closest_drivers`, {
                    lat: rideRequest.currentLocation.latitude,
                    lng: rideRequest.currentLocation.longitude
                });
                console.log({ drivermasterResponse });
                if (drivermasterResponse.length > 1) {
                    const driverDetails = drivermasterResponse[0];
                    const driverId = driverDetails.id;
                    const driverName = driverDetails.name;
                    const { data: transitedgeResponse } = axios.post(`http://${TRANSITEDGE_SERVICE}:9090/create`,
                        {
                            "riderId": rideRequest.riderId,
                            "riderName": rideRequest.riderName,
                            "destination": rideRequest.destination,
                            "currentLocation": {
                                "latitude": rideRequest.currentLocation.latitude,
                                "longitude": rideRequest.currentLocation.longitude,
                            },
                            "destinationLocation": {
                                "latitude": rideRequest.destinationLocation.latitude,
                                "longitude": rideRequest.destinationLocation.longitude,
                            },
                            "driverId": "" + driverId,
                            "driverName": driverName,
                            "carType": rideRequest.carType
                        }
                    );
                    console.log({ transitedgeResponse });
                    channel.ack(message)
                }
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
