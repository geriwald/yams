#!/bin/bash

# Script to build the Yahtzee app Docker image and save it as a tar file

IMAGE_NAME="yams"
TAR_FILE="$IMAGE_NAME.tar"


# Build the Docker image
echo "Building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful. Saving image to $TAR_FILE"
    docker save "$IMAGE_NAME" > "$TAR_FILE"
    echo "Image saved to $TAR_FILE"
    echo "You can now transfer $TAR_FILE to your NAS and load it with: docker load < $TAR_FILE"
else
    echo "Build failed!"
    exit 1
fi