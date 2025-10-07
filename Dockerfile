# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Create non-root user for security
#RUN addgroup -g 1001 -S nodejs
#RUN adduser -S nestjs -u 1001
#
## Change ownership of the app directory
#RUN chown -R nestjs:nodejs /app
#USER nestjs

# Start the application
CMD ["npm", "run", "start:prod"]