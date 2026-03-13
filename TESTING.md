# Testing the Developer Platform API

## Start the server first

```bash
npm install
npm run dev

curl http://localhost:3000/api/health
Expected response:
{
  "status": "healthy",
  "service": "developer-platform-control-plane",
  "version": "1.0.0"
}

2. Register a service
curl -X POST http://localhost:3000/api/v1/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-api",
    "repo": "https://github.com/raphael/payment-api",
    "owner": "platform-team",
    "environments": ["dev", "staging"]
  }'


Expected response
{
  "message": "Service registered successfully",
  "service": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "payment-api",
    "repo": "https://github.com/raphael/payment-api",
    "environments": [
      {
        "name": "dev",
        "namespace": "payment-api-dev",
        "status": "pending"
      },
      {
        "name": "staging",
        "namespace": "payment-api-staging",
        "status": "pending"
      }
    ]
  }
}

3. List all services
curl http://localhost:3000/api/v1/services

4. Deploy to staging
curl -X POST http://localhost:3000/api/v1/services/YOUR-UUID-HERE/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "staging",
    "gitSha": "abc123def456"
  }'
