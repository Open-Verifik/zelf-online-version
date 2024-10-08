# Use the Node.js 16.20 Alpine image as a parent image
FROM node:16.20-alpine

# Install Chromium
RUN apk add --no-cache chromium

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY .env ./

# Install the dependencies inside the container
RUN npm install

# If you want to install Nodemon globally
RUN npm install -g nodemon

# Bundle the source code inside the container
COPY . .

# Make port 3001 available outside the container
EXPOSE 3001

# Override any existing ENTRYPOINT set by the base image or elsewhere
ENTRYPOINT []

# Run the application with Nodemon
CMD [ "nodemon", "server.js" ]