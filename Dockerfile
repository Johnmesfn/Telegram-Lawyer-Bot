FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Make scripts executable
RUN chmod +x start.sh healthcheck.js

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=5m --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["./start.sh"]
