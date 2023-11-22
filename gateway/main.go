package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

type DiscoveryResponse struct {
	ServicePathURL string `json:"service_path_url"`
	ServerAddr     string `json:"server_address"`
}

func main() {

	router := mux.NewRouter()
	router.PathPrefix("/{serviceName}/{rest:.*}").HandlerFunc(DiscoveryHandler)
	router.HandleFunc("/status", StatusHandler).Methods("GET")

	port := "3000"
	fmt.Printf("Discovery service is listening on http://localhost:%s\n", port)

	err := http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatalf("Server error: %v", err)
	}

}

func DiscoveryHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	serviceName := params["serviceName"]
	serviceAddress, err := findServiceAddress(serviceName)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Service not found"))
		return
	}

	serviceAddress = "http://" + serviceAddress + "/" + params["rest"]
	queryParams := r.URL.Query()
	if len(queryParams) > 0 {
		serviceAddress += "?" + queryParams.Encode()
	}
	r.Header = map[string][]string{
		"Content-Type": {"application/json"},
	}
	log.Print("forwarding to " + serviceAddress)
	if r.Method == http.MethodGet {
		resp, err := http.Get(serviceAddress)
		if err != nil {
			log.Print("error: ", err.Error())
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error forwarding request"))
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error reading response body"))
			return
		}

		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	} else if r.Method == http.MethodPost {
		resp, err := http.Post(serviceAddress, "application/json", r.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error forwarding request"))
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error reading response body"))
			return
		}
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}
}

func findServiceAddress(serviceName string) (string, error) {
	discoveryServiceAddress, notPresent := os.LookupEnv("DISCOVERY_SERVICE")
	if !notPresent {
		discoveryServiceAddress = "http://localhost:8080"
	}
	var url = discoveryServiceAddress + "/discover?url=" + serviceName
	resp, err := http.Get(url)
	if err != nil {
		log.Print(err)
		return "", err
	}
	if resp.StatusCode == 404 {
		log.Print("Service not found")
		return "", fmt.Errorf("service not found")
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Print(err)
		return "", err
	}
	sb := string(body)
	log.Print(sb)
	return sb, nil
}

func StatusHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// export a varible to shell
// export DISCOVERY_SERVICE=http://localhost:3000
// go run main.go
