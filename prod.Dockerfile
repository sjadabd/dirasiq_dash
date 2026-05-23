# Use the official Node.js image as the base image
FROM node:18 AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package manager files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Copy application source
COPY . .

# Install dependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --include=optional; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Fix Rollup optional dependency issue
# Rollup ships its native binary as an OS-specific optional dep. npm's
# lockfile-resolution bug (https://github.com/npm/cli/issues/4828) sometimes
# omits the linux-x64 binary on alpine/debian images, which then crashes the
# Vite build with "Cannot find module @rollup/rollup-linux-x64-gnu".
# Installing it explicitly here makes the build deterministic on this image.
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional

# Build vue.js
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build; \
  else yarn build; \
  fi

# Production image
FROM nginx:stable-alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose nginx port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
