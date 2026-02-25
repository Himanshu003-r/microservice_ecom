# E-Commerce Microservices Platform 🛒

A scalable, event-driven e-commerce backend built with microservices architecture using Node.js, MongoDB, RabbitMQ, and Stripe.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Services](#services)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Event Flow](#event-flow)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

---

## Architecture Overview
```
┌───────────────────────────────────────────────────┐
│             CLIENT APPLICATIONS                   │
│        (Web App / Mobile App / Admin Panel)       │
└───────────────────────┬───────────────────────────┘
                        │
                        │ HTTP Requests
                        ↓
┌───────────────────────────────────────────────────┐
│              API GATEWAY (Port 8000)              │
│  • JWT Authentication                             │
│  • Rate Limiting                                  │
│  • Request Routing                                │
│  • Add Trusted Headers (x-user-id, x-user-role)   │
└──────┬──────────┬──────────┬──────────┬───────────┘
       │          │          │          │
       ↓          ↓          ↓          ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  User    │ │  Order   │ │ Payment  │ │ Product  │
│ Service  │ │ Service  │ │ Service  │ │ Service  │
│          │ │          │ │          │ │          │
│ Port:    │ │ Port:    │ │ Port:    │ │ Port:    │
│  4001    │ │  4002    │ │  4003    │ │  4004    │
└─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘
      │            │            │            │
      │            │            │            │
      └────────────┴────────────┴────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │  RabbitMQ (Port 5672) │
            │  Message Broker       │
            │  • order_events       │
            │  • payment_events     │
            │  • product_events     │
            │  • user_events        │
            └───────────────────────┘
                        │
                        ↓
      ┌────────────┬────────────┬────────────┬
      ↓            ↓            ↓            ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  User    │ │ Product  │ │  Order   │ │ Payment  │
│    DB    │ │    DB    │ │    DB    │ │    DB    │
│ MongoDB  │ │ MongoDB  │ │ MongoDB  │ │ MongoDB  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

            ┌───────────────────────┐
            │   Stripe API          │
            │   (Payment Gateway)   │
            └───────────────────────┘
                        ↑
                        │ Webhooks
                        │
            ┌───────────────────────┐
            │  Payment Service      │
            └───────────────────────┘
```

---

## Features

### Core Functionality
-  User authentication and authorization (JWT)
-  Product catalog with search and filtering
-  Shopping cart management
-  Secure payment processing via Stripe

### Technical Features
-  Microservices architecture
-  Event-driven communication via RabbitMQ
-  RESTful APIs
-  Database per service pattern
-  API Gateway with authentication
-  Graceful shutdown handling
-  Error handling and retry mechanisms

---

## Tech Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Message Broker:** RabbitMQ
- **Payment Gateway:** Stripe
- **Authentication:** JWT (JSON Web Tokens)

### DevOps & Tools
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git
- **Testing:** Postman, Stripe CLI
- **Environment Management:** dotenv

---

## Services

### 1. **API Gateway** (Port 4000)
- Routes requests to appropriate microservices
- JWT token verification
- Rate limiting and CORS handling
- Adds trusted headers (x-user-id, x-user-role)

**Key Endpoints:**
```
v1/auth/*      → User Service
v1/users/*     → User Service
v1/products/*  → Product Service
v1/orders/*    → Order Service
v1/payments/*  → Payment Service

```

### 2. **User Service** (Port 4001)
Manages user accounts, authentication, and profiles.

**Features:**
- User registration and login
- JWT token generation
- Profile management
- Role-based access control (user/admin)

**Key Endpoints:**
```
POST   v1/auth/register
POST   v1/auth/login
POST   v1/auth/logout

```

### 3. **Order Service** (Port 4002)
Manages order lifecycle and processing.

**Features:**
- Create and track orders
- Order history
- Order cancellation
- Order status updates
- Integration with Payment Service

**Key Endpoints:**
```
POST   v1/orders                (Create order)
GET    v1/orders/stats          (User's orders statitics - Admin)
GET    v1/orders/:id            (Single order)
PATCH  v1/orders/:id/cancel     (Cancel order)
GET    v1/orders                (All orders - Admin)
```

**Event Flow:**
```
1. Publishes: order.created
2. Listens to: payment.initiated, payment.completed, payment.failed

```

### 4. **Payment Service** (Port 4003)
Handles payment processing via Stripe.

**Features:**
- Stripe payment checkout creation
- Payment status tracking
- Checkout session
- Webhook handling for real-time updates
- Payment history

**Key Endpoints:**
```
POST   /api/webhooks/stripe           (Stripe webhooks)
GET    /v1/payments/order/:orderId    (Payment by order)
GET    /v1/payments/:id               (Payment by ID)
POST    /v1/checkout/create-session    (Stripe checkout for payment)
```

**Event Flow:**
```
1. Listens to: order.created, order.cancelled
2. Publishes: payment.initiated, payment.completed, payment.failed
```

### 5. **Product Service** (Port 4004)
Handles product catalog and inventory management.

**Features:**
- CRUD operations for products
- Search and filtering (category, price range)
- Inventory tracking
- Featured products

**Key Endpoints:**
```
GET    /api/v1/products              (All products)
GET    /api/v1/products/:id          (Single product)
POST   /api/v1/products              (Create - Admin)
PUT    /api/v1/products/:id          (Update - Admin)
DELETE /api/v1/products/:id          (Delete - Admin)
```

## API Documentation

### Base URLs
```
API Gateway: http://localhost:4000
User Service: http://localhost:4001
Order Service: http://localhost:4002
Payment Service: http://localhost:4003
Product Service: http://localhost:4004

```

### Authentication

All protected routes require a JWT token in the Authorization header:
```bash
Authorization: Bearer <jwt_token>
```

### Sample API Calls

#### 1. Register User
```bash
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:400/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Get All Products
```bash
curl http://localhost:4000/v1/products
```

#### 4. Create Order
```bash
curl -X POST http://localhost:4000/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID",
        "amount": 2
      }
    ],
    "tax": 20.00,
    "shippingFee": 10.00,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```

#### 5. Get My Orders
```bash
curl http://localhost:4000/v1/orders/my-orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Event Flow

### Complete Order-to-Payment Flow
```
1. USER PLACES ORDER
   ↓
2. Order Service: POST /v1/orders
   - Creates order (status: pending)
   - Publishes: order.created
   ↓
3. Payment Service Listener
   - Receives: order.created
   - Creates Stripe payment checkout
   - Publishes: payment.initiated
   ↓
4. Order Service Listener
   - Receives: payment.initiated
   - Updates order with session
   ↓
5. USER PAYS ON FRONTEND
   - Stripe processes payment
   ↓
6. Stripe Webhook → Payment Service
   - Receives: payment_intent.succeeded
   - Updates payment status
   - Publishes: payment.completed
   ↓
7. Order Service Listener
   - Receives: payment.completed
   - Updates order (status: confirmed)
   - Publishes: order.confirmed

```

### Event Types

**Order Events:**
- `order.created` - New order placed
- `order.confirmed` - Payment successful
- `order.cancelled` - Order cancelled by user

**Payment Events:**
- `payment.initiated` - Payment intent created
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed

---

## Project Structure
```
ecommerce-microservices/
│
├── api-gateway/
│   ├── src/
│   │   ├── errors
│   │   │   └── customApiError.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── user-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── userAuth.js
│   │   ├── db/
│   │   │   └── dbConnect.js
│   │   ├── errors/
│   │   │   └── customApiError.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── RefreshToken.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── authRoute.js
│   │   ├── utils/
│   │   │   ├── generateToken.js
│   │   │   ├── logger.js
│   │   │   └── validation.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── product-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── productController.js
│   │   ├── db/
│   │   │   └── dbConnect.js
│   │   ├── errors/
│   │   │   └── customApiError.js
│   │   ├── middleware/
│   │   │   ├── authorization.js
│   │   │   ├── errorHandler.js
│   │   │   └── verifyGateway.js
│   │   ├── models/
│   │   │   └── Product.js
│   │   ├── routes/
│   │   │   └── productRoute.js
│   │   ├── listeners/
│   │   │   └── orderListener.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── order-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── orderController.js
│   │   ├── db/
│   │   │   └── dbConnect.js
│   │   ├── errors/
│   │   │   └── customApiError.js
│   │   ├── events/
│   │   │   └── paymentListener.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── authorization.js
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   └── Order.js
│   │   ├── routes/
│   │   │   └── orderRoute.js
│   │   ├── utils/
│   │   │   ├── checkPermissions.js
│   │   │   ├── logger.js
│   │   │   └── rabbitmq.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── payment-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── paymentController.js
│   │   ├── db/
│   │   │   └── dbConnect.js
│   │   ├── errors/
│   │   │   └── customApiError.js
│   │   ├── events/
│   │   │   └── orderListener.js
│   │   ├── middleware/
│   │   │   ├── authorization.js
│   │   │   ├── errorHandler.js
│   │   │   └── verifyGateway.js
│   │   ├── models/
│   │   │   └── Payment.js
│   │   ├── routes/
│   │   │   ├── checkoutRoute.js
│   │   │   ├── paymentRoute.js
│   │   │   └── webhookRoute.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── rabbitmq.js
│   │   │   └── stripe.js
│   │   └── server.js
│   ├── .env
│   └── package.json
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 🧪 Testing

### Manual Testing with Postman

1. Set environment variables (base_url, jwt_token)
2. Test each endpoint

### Testing Stripe Webhooks
```bash
# Start Stripe CLI
stripe listen --forward-to localhost:4004/api/v1/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002

```

---


