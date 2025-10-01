# Use a slim Node.js image for a smaller footprint
FROM node:22-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies, including dev dependencies for build, then prune for production
# --prod=false ensures dev dependencies are installed for the build step
RUN pnpm install --prod=false

# Copy the rest of the application code
COPY . .

# Generate Prisma client (if applicable)
RUN pnpm exec prisma generate

# Build the application
RUN pnpm run build

# Expose any ports if necessary (e.g., for API, though CLI doesn't need it)
# EXPOSE 3000

# Set the default command to run the CLI tool
# Ensure 'analyze-script' is correctly configured in package.json's 'bin' field
CMD ["analyze-script"]
