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

	log.Print("forwarding to " + serviceAddress)

	client := &http.Client{}

	if r.Method == http.MethodGet {
		req, err := http.NewRequest("GET", serviceAddress, nil)
		if err != nil {
			log.Print("error: ", err.Error())
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error forwarding request"))
			return
		}

		for key, value := range r.Header {
			req.Header.Set(key, value[0])
		}
		resp, err := client.Do(req)
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
		req, err := http.NewRequest("POST", serviceAddress, r.Body)
		if err != nil {
			log.Print("error: ", err.Error())
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error forwarding request"))
			return
		}
		fmt.Println("Headers", r.Header)
		for key, value := range r.Header {
			req.Header.Set(key, value[0])
		}
		resp, err := client.Do(req)
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
