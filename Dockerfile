# Use the 'slim' version of Node 18 for better Puppeteer compatibility
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Copy package files first to use Docker's caching
COPY package*.json ./

# Install all dependencies and run the postinstall script to download Chrome
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Expose the port the application runs on
EXPOSE 9090

# Command to run the application
CMD ["node", "src/server.js"]
