#!/bin/bash

registry="registry.digitalocean.com/mat/api"

if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed. Please install docker' >&2
  exit 1
fi

if ! [ -x "$(command -v doctl)" ]; then
  echo 'Error: doctl is not installed. Please install doctl' >&2
  exit 1
fi


echo "Building docker image"
docker build --no-cache -t $registry:$1 .

if [ $? -ne 0 ]; then 
	echo "Error while building docker image please try again."
	exit 1
fi

echo "Pushing image to docker registry. Image url: $registry:$1"
docker push $registry:$1

if [ $? -ne 0 ]; then 
	echo "Error while pushing docker image to docker registry please try again."
	exit 1
fi
