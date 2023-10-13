// main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoURI       = "mongodb://localhost:27017" // Update with your MongoDB URI
	dbName         = "monitoringdb"
	collectionName = "service_statuses"
)

type ServiceStatus struct {
	ServiceName string    `json:"service_name"`
	Status      bool      `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}

func main() {
	r := mux.NewRouter()

	// Connect to MongoDB
	client, err := mongo.NewClient(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Error creating MongoDB client: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Connect(ctx)
	if err != nil {
		log.Fatalf("Error connecting to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	// Ping the MongoDB server
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Error pinging MongoDB: %v", err)
	}

	// Define a route to fetch and record service statuses
	r.HandleFunc("/record-statuses", func(w http.ResponseWriter, r *http.Request) {
		// Replace this with logic to fetch service data from your discovery service

		// Example: Fetch service data from a discovery service
		services := []string{"service1", "service2", "service3"}

		// Loop through the services and check their status
		for _, serviceName := range services {
			statusURL := fmt.Sprintf("http://%s/status", serviceName)

			resp, err := http.Get(statusURL)
			if err != nil {
				log.Printf("Error fetching status from %s: %v", serviceName, err)
				continue
			}
			defer resp.Body.Close()

			// Check if the response status code indicates success
			status := resp.StatusCode == http.StatusOK

			// Record the service status in MongoDB
			statusDoc := ServiceStatus{
				ServiceName: serviceName,
				Status:      status,
				Timestamp:   time.Now(),
			}

			collection := client.Database(dbName).Collection(collectionName)
			_, err = collection.InsertOne(ctx, statusDoc)
			if err != nil {
				log.Printf("Error inserting status into MongoDB: %v", err)
			}
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Service statuses recorded")
	})

	// Run the web server
	http.Handle("/", r)
	server := &http.Server{
		Addr:         ":4900",
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Fatal(server.ListenAndServe())
}
