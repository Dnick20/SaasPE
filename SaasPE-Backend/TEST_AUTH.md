# Authentication Module Testing Guide

## Prerequisites

1. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
npm run prisma:migrate
```

3. Start the backend server:
```bash
npm run start:dev
```

The server will run on `http://localhost:3000` with API prefix `/api/v1`

## API Endpoints Testing

### 1. Register New Agency (POST /auth/register)

**Status Code:** 201 Created

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agencyName": "Test Agency",
    "email": "admin@test.com",
    "password": "Test123!@#456",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "starter"
  }'
```

**Expected Response:**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Test Agency",
    "plan": "starter",
    "status": "trial"
  },
  "user": {
    "id": "uuid",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "uuid-v4-token"
  }
}
```

### 2. Login (POST /auth/login)

**Status Code:** 200 OK

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test123!@#456"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "tenantId": "uuid"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "uuid-v4-token"
  }
}
```

### 3. Get Current User (GET /auth/me)

**Status Code:** 200 OK
**Authentication:** Required (Bearer Token)

```bash
# Replace <ACCESS_TOKEN> with the token from login/register response
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response:**
```json
{
  "id": "uuid",
  "email": "admin@test.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin",
  "tenantId": "uuid",
  "status": "active",
  "lastLogin": "2025-10-21T12:00:00.000Z",
  "created": "2025-10-21T10:00:00.000Z"
}
```

### 4. Get User Profile (GET /users/me)

**Status Code:** 200 OK
**Authentication:** Required (Bearer Token)

```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response:**
```json
{
  "id": "uuid",
  "email": "admin@test.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin",
  "tenantId": "uuid",
  "status": "active",
  "lastLogin": "2025-10-21T12:00:00.000Z",
  "created": "2025-10-21T10:00:00.000Z"
}
```

### 5. Refresh Tokens (POST /auth/refresh)

**Status Code:** 200 OK

```bash
# Replace <REFRESH_TOKEN> and <USER_ID> with values from login/register response
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>",
    "userId": "<USER_ID>"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-uuid-v4-token"
}
```

### 6. Logout (POST /auth/logout)

**Status Code:** 200 OK
**Authentication:** Required (Bearer Token)

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response:**
```json
{
  "message": "Logout successful"
}
```

## Error Scenarios

### 1. Register with Weak Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agencyName": "Test Agency",
    "email": "test@example.com",
    "password": "weak",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Expected:** 400 Bad Request with validation errors

### 2. Register with Duplicate Email

```bash
# Try to register with same email twice
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agencyName": "Another Agency",
    "email": "admin@test.com",
    "password": "Test123!@#456",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

**Expected:** 409 Conflict - "User with this email already exists"

### 3. Login with Wrong Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "WrongPassword123!"
  }'
```

**Expected:** 401 Unauthorized - "Invalid email or password"

### 4. Access Protected Route Without Token

```bash
curl http://localhost:3000/api/v1/users/me
```

**Expected:** 401 Unauthorized

### 5. Use Invalid Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "invalid-token",
    "userId": "some-user-id"
  }'
```

**Expected:** 401 Unauthorized - "Invalid or expired refresh token"

## OAuth Testing

### Google OAuth (Browser-Based)

1. Navigate to: `http://localhost:3000/api/v1/auth/google`
2. You'll be redirected to Google login
3. After successful login, you'll be redirected to `/api/v1/auth/google/callback`
4. Response will contain user + tokens

**Note:** Requires valid Google OAuth credentials in `.env` file

### Microsoft OAuth (Browser-Based)

1. Navigate to: `http://localhost:3000/api/v1/auth/microsoft`
2. You'll be redirected to Microsoft login
3. After successful login, you'll be redirected to `/api/v1/auth/microsoft/callback`
4. Response will contain user + tokens

**Note:** Requires valid Microsoft OAuth credentials in `.env` file

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3000/api/docs
```

## Complete Integration Test

Run this bash script to test the full authentication flow:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "1. Registering new agency..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agencyName": "Integration Test Agency",
    "email": "integration@test.com",
    "password": "Test123!@#456",
    "firstName": "Integration",
    "lastName": "Test",
    "plan": "starter"
  }')

echo $REGISTER_RESPONSE | jq '.'

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.tokens.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.tokens.refreshToken')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.id')

echo "\n2. Getting current user profile..."
curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

echo "\n3. Refreshing tokens..."
NEW_TOKENS=$(curl -s -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\",
    \"userId\": \"$USER_ID\"
  }")

echo $NEW_TOKENS | jq '.'

NEW_ACCESS_TOKEN=$(echo $NEW_TOKENS | jq -r '.accessToken')

echo "\n4. Logging out..."
curl -s -X POST $BASE_URL/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'

echo "\n5. Verifying logout (should fail)..."
curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'
```
