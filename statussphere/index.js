"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const mongodb_1 = require("mongodb");
const app = (0, express_1.default)();
const port = 4900;
const mongoURI = 'mongodb://127.0.0.1:27018';
const dbName = 'monitoringdb';
const collectionName = 'service_statuses';
function connectToMongoDB() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(mongoURI);
        yield client.connect();
        return client.db(dbName).collection(collectionName);
    });
}
function healthcheck() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('http://localhost:8080/discover/all');
            const services = yield response.json();
            const serviceStatuses = [];
            for (const service_name in services) {
                let serviceStatus = false;
                try {
                    const { status } = yield axios_1.default.get(`http://${services[service_name]}/status`);
                    serviceStatus = status === 200;
                }
                catch (error) {
                    serviceStatus = false;
                }
                finally {
                    const statusDoc = {
                        service_name: service_name,
                        status: serviceStatus,
                        timestamp: new Date(),
                    };
                    serviceStatuses.push(statusDoc);
                }
            }
            const collection = yield connectToMongoDB();
            yield collection.insertMany(serviceStatuses);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
app.use(express_1.default.json());
// app.get('/healthcheck', async (_, res) => healthcheck());
// add a status endpoint 
app.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("OK");
}));
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
