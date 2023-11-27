# Use an official Go runtime as a parent image
FROM golang:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the Go application code into the container
COPY . .

# Build the Go application
RUN go build -o gateway

# Expose a port (if your application listens on a specific port)
EXPOSE 3000

# Define the command to run your application
CMD ["./gateway"]

