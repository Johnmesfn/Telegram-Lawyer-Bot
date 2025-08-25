# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the source code
COPY . .

# Expose port (for Express if you add web interface later)
EXPOSE 3000

# Start the bot
CMD ["node", "bot.js"]
