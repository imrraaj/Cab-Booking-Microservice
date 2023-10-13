# Use an official Go runtime as a parent image
FROM golang:1.20

# Set the working directory inside the container
WORKDIR /app

# Copy the Go application code into the container
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
# Build the Go application
RUN go build -o statussphere

# Expose a port (if your application listens on a specific port)
EXPOSE 4900

# Define the command to run your application
CMD ["./statussphere"]

