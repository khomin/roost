# Stage 1: Build the binary
FROM golang:1.26-alpine AS builder

# Install SSL certificates and build tools
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Cache module dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically linked binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o server .

# Stage 2: Production runtime image
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy executable from builder
COPY --from=builder /app/server .

# Copy your configuration file
COPY config.yaml ./config.yaml

# Copy migration
COPY ./internal/db/migrations ./internal/db/migrations

# Expose Go server port
EXPOSE 8080

# Run the backend binary
CMD ["./server"]