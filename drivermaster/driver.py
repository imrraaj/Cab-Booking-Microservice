from datetime import datetime
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, render_template
import time
app = Flask(__name__)


# docker exec -it yiialkalmi_postgres_1 psql -U project -W project
# PostgreSQL connection configuration
db_config = {
    'host': 'drivermaster-postgres',  # The service name in your Compose file
    'port': '5432',  # The PostgreSQL container's port
    'database': 'driverdb',  # The name of the database
    'user': 'driverService',  # PostgreSQL username
    'password': 'driver',  # PostgreSQL password
}

# CREATE DATABASE ride_booking;
#
# CREATE TABLE drivers (
#     id SERIAL PRIMARY KEY,
#     username VARCHAR(255) NOT NULL,
#     password VARCHAR(255) NOT NULL,
#     name VARCHAR(255) NOT NULL,
#     contact VARCHAR(20) NOT NULL,
#     rating DECIMAL(3, 2) NOT NULL,
#     typeOfVehicle VARCHAR(50) NOT NULL,
#     latitude DOUBLE PRECISION NOT NULL,
#     longitude DOUBLE PRECISION NOT NULL,
#     available BOOLEAN NOT NULL
# );
#
# INSERT INTO drivers (username, password, name, contact, rating, typeOfVehicle, latitude, longitude, available)
# VALUES
#     ('driver1', 'password1', 'Driver 1', '1234567890', 4.5, 'Sedan', 40.7128, -74.0060, true),
#     ('driver2', 'password2', 'Driver 2', '9876543210', 4.8, 'SUV', 34.0522, -118.2437, true),
#     ('driver3', 'password3', 'Driver 3', '5555555555', 4.2, 'Compact', 41.8781, -87.6298, false),
#     ('driver4', 'password4', 'Driver 4', '1111111111', 4.9, 'Luxury', 38.8951, -77.0369, true),
#     ('driver5', 'password5', 'Driver 5', '9999999999', 4.6, 'Sedan', 51.5074, -0.1278, false);


def connect_to_database():
    try:
        conn = psycopg2.connect(**db_config)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


@app.route("/drivers", methods=["GET"])
def get_all_drivers():
    # Connect to the database
    conn = connect_to_database()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM drivers")
            drivers = cursor.fetchall()
            cursor.close()
            conn.close()

            if drivers:
                return jsonify(drivers)
            else:
                return jsonify({"message": "No drivers found"}), 404
        except Exception as e:
            print(f"Database query error: {e}")
            conn.close()
            return jsonify({"error": "Database query error"}), 500
    else:
        return jsonify({"error": "Database connection error"}), 500


# {
#         "lat":40.7128,
#         "lng":-77.006
# }
@app.route("/find_closest_drivers", methods=["POST"])
def find_closest_drivers():
    data = request.get_json()
    if "lat" in data and "lng" in data:
        user_lat = data["lat"]
        user_lng = data["lng"]

        # Connect to the database
        conn = connect_to_database()
        if conn:
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute(
                    f"SELECT id, name, latitude, longitude, " +
                    f"6371 * 2 * ASIN(SQRT(" +
                    f"POWER(SIN(RADIANS(({user_lat} - latitude) / 2)), 2) + " +
                    f"COS(RADIANS({user_lat})) * COS(RADIANS(latitude)) * " +
                    f"POWER(SIN(RADIANS(({user_lng} - longitude) / 2)), 2)" +
                    f")) AS distance " +
                    f"FROM drivers " +
                    f"WHERE available = true " +  # Filter for available drivers
                    f"ORDER BY distance " +
                    f"LIMIT 3"  # Limit to the closest 5 drivers
                )
                closest_drivers = cursor.fetchall()
                cursor.close()
                conn.close()

                if closest_drivers:
                    return jsonify(closest_drivers)
                else:
                    return jsonify({"error": "No available drivers found"}), 404
            except Exception as e:
                print(f"Database query error: {e}")
                conn.close()
                return jsonify({"error": "Database query error"}), 500
        else:
            return jsonify({"error": "Database connection error"}), 500
    else:
        return jsonify({"error": "Invalid input data"}), 400


@app.route("/drivers/<int:driver_id>", methods=["GET"])
def get_driver_by_id(driver_id):
    # Connect to the database
    conn = connect_to_database()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT * FROM drivers WHERE id = %s",
                (driver_id,)
            )
            driver_data = cursor.fetchone()
            cursor.close()
            conn.close()

            if driver_data:
                return jsonify(driver_data)
            else:
                return jsonify({"error": "Driver not found"}), 404
        except Exception as e:
            print(f"Database query error: {e}")
            conn.close()
            return jsonify({"error": "Database query error"}), 500
    else:
        return jsonify({"error": "Database connection error"}), 500


@app.route("/status", methods=["GET"])
def status():
    return ("ok"), 200


@app.route("/drivers/<int:driver_id>/updatelocation", methods=["PUT"])
def update_driver_location(driver_id):
    data = request.get_json()
    if "lat" in data and "lng" in data:
        new_lat = data["lat"]
        new_lng = data["lng"]

        # Connect to the database
        conn = connect_to_database()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE drivers SET latitude = %s, longitude = %s WHERE id = %s",
                    (new_lat, new_lng, driver_id)
                )
                conn.commit()
                conn.close()

                return jsonify({"message": "Driver location updated successfully"})
            except Exception as e:
                print(f"Database update error: {e}")
                conn.close()
                return jsonify({"error": "Database update error"}), 500
        else:
            return jsonify({"error": "Database connection error"}), 500
    else:
        return jsonify({"error": "Invalid input data"}), 400


@app.route("/changeavailability/<int:driver_id>", methods=["POST"])
def change_availability(driver_id):
    # Connect to the database
    conn = connect_to_database()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT * FROM drivers WHERE id = %s",
                (driver_id,)
            )
            driver_data = cursor.fetchone()

            if not driver_data:
                conn.close()
                return jsonify({"error": "Driver not found"}), 404

            current_availability = driver_data["available"]
            new_availability = not current_availability  # Toggle availability

            # Update driver's availability in the database
            cursor.execute(
                "UPDATE drivers SET available = %s WHERE id = %s",
                (new_availability, driver_id)
            )
            conn.commit()
            cursor.execute(
                "SELECT * FROM drivers WHERE id = %s",
                (driver_id,)
            )
            updated_driver_data = cursor.fetchone()
            conn.close()

            return jsonify({"message": "Driver availability updated", "driver_data": updated_driver_data})
        except Exception as e:
            print(f"Database update error: {e}")
            conn.close()
            return jsonify({"error": "Database update error"}), 500
    else:
        return jsonify({"error": "Database connection error"}), 500


# {
#     "username": "new_driver",
#     "password": "new_password",
#     "name": "New Driver Name",
#     "contact": "1234567890",
#     "rating": 4.7,
#     "typeOfVehicle": "Sedan",
#     "latitude": 45.12345,
#     "longitude": -71.98765,
#     "available": true
# }
@app.route("/add_driver", methods=["POST"])
def add_driver():
    data = request.get_json()
    if "username" in data and "password" in data and "name" in data and "contact" in data and "rating" in data and "typeOfVehicle" in data and "latitude" in data and "longitude" in data and "available" in data:
        username = data["username"]
        password = data["password"]
        name = data["name"]
        contact = data["contact"]
        rating = data["rating"]
        type_of_vehicle = data["typeOfVehicle"]
        latitude = data["latitude"]
        longitude = data["longitude"]
        available = data["available"]

        # Connect to the database
        conn = connect_to_database()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO drivers (username, password, name, contact, rating, typeOfVehicle, latitude, longitude, available) " +
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (username, password, name, contact, rating,
                     type_of_vehicle, latitude, longitude, available)
                )
                conn.commit()
                conn.close()

                return jsonify({"message": "Driver added successfully"})
            except Exception as e:
                print(f"Database insert error: {e}")
                conn.close()
                return jsonify({"error": "Database insert error"}), 500
        else:
            return jsonify({"error": "Database connection error"}), 500
    else:
        return jsonify({"error": "Invalid input data"}), 400


@app.route("/drivers/<int:driver_id>", methods=["DELETE"])
def remove_driver(driver_id):
    # Connect to the database
    conn = connect_to_database()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                "SELECT * FROM drivers WHERE id = %s",
                (driver_id,)
            )
            driver_data = cursor.fetchone()

            if driver_data:
                cursor.execute(
                    "DELETE FROM drivers WHERE id = %s",
                    (driver_id,)
                )
                conn.commit()
                conn.close()

                return jsonify({"message": "Driver removed", "driver_data": driver_data})
            else:
                conn.close()
                return jsonify({"error": "Driver not found"}), 404
        except Exception as e:
            print(f"Database delete error: {e}")
            conn.close()
            return jsonify({"error": "Database delete error"}), 500
    else:
        return jsonify({"error": "Database connection error"}), 500


# ...


@app.route("/update_location", methods=["POST"])
def update_location():
    data = request.get_json()

    if "driver_id" not in data or "lat" not in data or "lng" not in data:
        return jsonify({"error": "Invalid input data"}), 400

    driver_id = data["driver_id"]
    final_lat = data["lat"]
    final_lng = data["lng"]

    conn = connect_to_database()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM drivers WHERE id = %s", (driver_id,))
            driver_data = cursor.fetchone()

            if not driver_data:
                conn.close()
                return jsonify({"error": "Driver not found"}), 404

            current_lat, current_lng = driver_data["latitude"], driver_data["longitude"]
            start_time = datetime.now()
            total_time = 0  # Initialize total time to zero

            while current_lat != final_lat or current_lng != final_lng:
                # Calculate the time taken for this update
                update_time = datetime.now() - start_time
                # Add this update time to the total time
                total_time += update_time.total_seconds()

                # Simulate driver's movement towards the final location
                if current_lat < final_lat:
                    current_lat += 0.5  # Adjust the step size as needed
                elif current_lat > final_lat:
                    current_lat -= 0.5  # Adjust the step size as needed

                if current_lng < final_lng:
                    current_lng += 0.5  # Adjust the step size as needed
                elif current_lng > final_lng:
                    current_lng -= 0.5  # Adjust the step size as needed

                # Update driver's location in the database
                cursor.execute(
                    "UPDATE drivers SET latitude = %s, longitude = %s WHERE id = %s",
                    (current_lat, current_lng, driver_id)
                )
                conn.commit()
                time.sleep(2)  # Sleep for 2 seconds before the next update
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM drivers WHERE id = %s", (driver_id,))
            driver_data = cursor.fetchone()
            conn.close()

            return jsonify({"message": "Driver reached the destination", "driver_data": driver_data, "total_time_taken": total_time})
        except Exception as e:
            print(f"Database update error: {e}")
            conn.close()
            return jsonify({"error": "Database update error"}), 500
    else:
        return jsonify({"error": "Database connection error"}), 500


if __name__ == "__main__":
    conn = connect_to_database()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
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
    """)
    app.run(host='0.0.0.0', port=80, debug=True)
