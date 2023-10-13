CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL,
    typeOfVehicle VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    available BOOLEAN NOT NULL
);

INSERT INTO drivers (username, password, name, contact, rating, typeOfVehicle, latitude, longitude, available)
VALUES
    ('driver1', 'password1', 'Driver 1', '1234567890', 4.5, 'Sedan', 40.7128, -74.0060, true),
    ('driver2', 'password2', 'Driver 2', '9876543210', 4.8, 'SUV', 34.0522, -118.2437, true),
    ('driver3', 'password3', 'Driver 3', '5555555555', 4.2, 'Compact', 41.8781, -87.6298, false),
    ('driver4', 'password4', 'Driver 4', '1111111111', 4.9, 'Luxury', 38.8951, -77.0369, true),
    ('driver5', 'password5', 'Driver 5', '9999999999', 4.6, 'Sedan', 51.5074, -0.1278, false);
