# ---------- Builder Stage ----------
    FROM node:22-alpine
    
    RUN apk add --no-cache bash
    RUN mkdir -p /app/config

    # Set working directory
    WORKDIR /app
    
    # Copy only package files first (better caching)
    COPY ../package*.json ./
    
    # Install dependencies
    RUN npm ci
    
    # Copy the rest of the app
    COPY .. .
    
    # Build the application
    RUN npm run build
    
    # Expose the application port
    EXPOSE 8000

    # Start the application
    CMD [ "npm", "start" ]