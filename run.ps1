# docker-compose build

kompose convert -f .\docker-compose.yml -o .\artifacts\

# minikube image load statussphere:latest
# minikube image load matchmaker:latest  
# minikube image load tripguard:latest   
# minikube image load statussphere:latest
# minikube image load drivermaster:latest
# minikube image load transitedge:latest 
# minikube image load discovery:latest   

kubectl apply -f .\artifacts\