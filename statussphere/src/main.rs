// Add your imports here
use reqwest;
use mongodb::{Client, Collection};
use mongodb::bson::{doc, Bson};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize MongoDB connection
    let client = Client::with_uri_str("mongodb://localhost:27017").await?;
    let db = client.database("monitoring");
    let collection: Collection<Bson> = db.collection("service_statuses");

    // Replace 'discovery_service_url' with the actual URL of your discovery service
    let discovery_service_url = "http://discovery_service_url/api/services";

    // Fetch a list of services from the discovery service
    let services = reqwest::get(discovery_service_url).await?.json::<Vec<YourServiceType>>().await?;

    // Loop through the services and poll the "/status" endpoint
    for service in services {
        let service_url = format!("{}/status", service.url);

        // Make a request to the service's "/status" endpoint
        let response = reqwest::get(&service_url).await?;

        // Record the status in MongoDB
        collection.insert_one(doc! {
            "service_name": service.name,
            "status": if response.status().is_success() { "online" } else { "offline" },
            "response_time": response.elapsed().as_millis() as i64
        }, None).await?;
    }

    Ok(())
}

