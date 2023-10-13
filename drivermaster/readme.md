1.) get_all_driver
get: /drivers
2.)get_driver_by_id
get: /drivers/<id>
3.)find_closest_drivers
post: /find_closest_drivers

```
{

"lat":40.7128,

"lng":-77.006

}
```

4.)update_driver_location
put: /drivers/<int:driver_id>/updatelocation

# {

# "lat":40.7128,

# "lng":-77.006

# }

5.)add_driver
post: /add_driver

# {

# "username": "new_driver",

# "password": "new_password",

# "name": "New Driver Name",

# "contact": "1234567890",

# "rating": 4.7,

# "typeOfVehicle": "Sedan",

# "latitude": 45.12345,

# "longitude": -71.98765,

# "available": true

# }

6.)remove_driver
delete:/driver/<id>

7.)update_location
post:/update_location

# {

# "driver_id":

# "final_lat":40.7128,

# "final_lng":-77.006

# }
