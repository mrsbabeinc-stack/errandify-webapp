FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN npm install --prefix frontend

# Copy all files
COPY . .

# Build frontend
RUN npm run build --prefix frontend

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
