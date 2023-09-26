package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/redis/go-redis/v9"
)

var (
	ctx    = context.Background()
	client *redis.Client
)

type AssignRequest struct {
	ServicePathURL string `json:"service_path_url"`
	ServerAddr     string `json:"server_address"`
}

func main() {

	redisHost, notPresent := os.LookupEnv("REDIS_HOST")
	if !notPresent {
		redisHost = "localhost"
	}
	redisPort, notPresent := os.LookupEnv("REDIS_PORT")
	if !notPresent {
		redisPort = "6379"
	}
	client = redis.NewClient(&redis.Options{
		Addr:     redisHost + ":" + redisPort,
		Password: "",
		DB:       0,
	})
	defer client.Close()

	_, err := client.Ping(ctx).Result()
	if err != nil {
		panic(err)
	}

	router := mux.NewRouter()

	router.HandleFunc("/discover", DiscoveryHandler).Methods("GET")
	router.HandleFunc("/discover/all", DiscoverAllHandler).Methods("GET")
	router.HandleFunc("/assign", AssignHandler).Methods("POST")
	router.HandleFunc("/status", StatusHandler).Methods("GET")
	router.HandleFunc("/crashed", DeleteServiceHandler).Methods("GET")

	port := "8080"
	fmt.Printf("Discovery service is listening on http://localhost:%s\n", port)

	err = http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatalf("Server error: %v", err)
	}

}

func lookUpService(url string) (string, error) {
	serverAddr, err := client.Get(ctx, url).Result()
	if err != nil {
		return "", err
	}
	return serverAddr, nil
}

func DiscoveryHandler(w http.ResponseWriter, r *http.Request) {

	url := r.URL.Query().Get("url")
	if url == "" {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Query parameter not provieded!"))
		return
	}
	serverAddress, err := lookUpService(url)
	if err != nil {
		if err == redis.Nil {
			log.Printf("Request: %s Not Found", url)
			http.Error(w, "Service not found", http.StatusNotFound)
		} else {
			log.Fatalf("Error: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}
	w.Write([]byte(serverAddress))
}

func GetAllRowsFromRedis() (map[string]string, error) {
	// Retrieve all keys from Redis
	keys, err := client.Keys(ctx, "*").Result()
	if err != nil {
		return nil, err
	}

	rows := make(map[string]string)
	for _, key := range keys {
		value, err := client.Get(ctx, key).Result()
		if err != nil {
			return nil, err
		}
		rows[key] = value
	}
	return rows, nil
}

func DiscoverAllHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := GetAllRowsFromRedis()
	if err != nil {
		log.Printf("Error retrieving data from Redis: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	responseJSON, err := json.Marshal(rows)
	if err != nil {
		log.Printf("Error encoding data to JSON: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	log.Printf("Last Monitoring check at: %s", time.Now())
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

func AssignService(url, serverAddr string) error {
	_, err := client.Set(ctx, url, serverAddr, 0).Result()
	return err
}

func AssignHandler(w http.ResponseWriter, r *http.Request) {
	var request AssignRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if request.ServerAddr == "" || request.ServicePathURL == "" {
		log.Print("Request Body Not Complete")
		http.Error(w, "All the fields in the body needs to be provided", http.StatusBadRequest)
		return
	}

	request.ServicePathURL = strings.Split(request.ServicePathURL, "/")[0]
	_, err := lookUpService(request.ServicePathURL)
	if err != redis.Nil {
		log.Printf("Service alreay exits for: %s", request.ServicePathURL)
		http.Error(w, "Service already exits. Please provide a unique name for your service", http.StatusBadRequest)
	}
	// Use Redis to store the URL-to-server mapping
	err = AssignService(request.ServicePathURL, request.ServerAddr)
	if err != nil {
		log.Printf("Error assigning URL: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Respond with a success message
	log.Printf("Added a new service at: %s", request.ServicePathURL)
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "URL assigned successfully")
}

/*Staus handler for monitoring service*/
func StatusHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("Last health check: %s", time.Now())
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// what if the monitoring service says a service failed?
// delete from the database for that request

func deleteCrashedService(url string) error {
	_, err := client.Del(ctx, url).Result()
	return err
}

func DeleteServiceHandler(w http.ResponseWriter, r *http.Request) {

	url := r.URL.Query().Get("url")
	if url == "" {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Query parameter not provieded!"))
		return
	}
	err := deleteCrashedService(url)
	if err != nil {
		log.Printf("Error deleting service: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	log.Printf("Successfully deleted service: %v", url)
	fmt.Fprintln(w, "Service deleted successfully")
}
