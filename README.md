# E-Commerce Microservices Platform 🛒

A scalable, event-driven e-commerce backend built with microservices architecture using Node.js, MongoDB, RabbitMQ, and Stripe.

## 📋 Table of Contents

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

## 🏗️ Architecture Overview
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

## ✨ Features

### Core Functionality
-  User authentication and authorization (JWT)
-  Product catalog with search and filtering
-  Shopping cart management
-  Order processing and tracking
-  Secure payment processing via Stripe

### Technical Features
-  Microservices architecture
-  Event-driven communication via RabbitMQ
-  RESTful APIs
-  Database per service pattern
-  API Gateway with authentication
-  Graceful shutdown handling
-  Error handling and retry mechanisms
-  Idempotent operations

---

## 🛠️ Tech Stack

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

## 🏢 Services

### 1. **API Gateway** (Port 4000)
- Routes requests to appropriate microservices
- JWT token verification
- Rate limiting and CORS handling
- Adds trusted headers (x-user-id, x-user-role)

**Key Endpoints:**
```
/api/v1/auth/*      → User Service
/api/v1/users/*     → User Service
/api/v1/products/*  → Product Service
/api/v1/orders/*    → Order Service
/api/v1/payments/*  → Payment Service

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
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
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
POST   /api/v1/orders                (Create order)
GET    /api/v1/orders/my-orders      (User's orders)
GET    /api/v1/orders/:id            (Single order)
PATCH  /api/v1/orders/:id/cancel     (Cancel order)
GET    /api/v1/orders                (All orders - Admin)
```

**Event Flow:**
```
1. Publishes: order.created
2. Listens to: payment.initiated, payment.completed, payment.failed
3. Publishes: order.confirmed, order.cancelled
```

### 4. **Payment Service** (Port 4003)
Handles payment processing via Stripe.

**Features:**
- Stripe payment intent creation
- Payment status tracking
- Refund processing
- Webhook handling for real-time updates
- Payment history

**Key Endpoints:**
```
POST   /api/v1/webhooks/stripe           (Stripe webhooks)
GET    /api/v1/payments/order/:orderId   (Payment by order)
GET    /api/v1/payments/:id              (Payment by ID)
GET    /api/v1/payments/user/history     (User's payments)
```

**Event Flow:**
```
1. Listens to: order.created, order.cancelled
2. Publishes: payment.initiated, payment.completed, payment.failed, payment.refunded
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

## 📚 API Documentation

### Base URLs
```
API Gateway: http://localhost:8000
User Service: http://localhost:8001
Product Service: http://localhost:8002
Order Service: http://localhost:8003
Payment Service: http://localhost:8004

```

### Authentication

All protected routes require a JWT token in the Authorization header:
```bash
Authorization: Bearer <your_jwt_token>
```

### Sample API Calls

#### 1. Register User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Get All Products
```bash
curl http://localhost:8000/api/v1/products
```

#### 4. Search Products
```bash
curl "http://localhost:8000/api/v1/products?search=iphone&category=Electronics&minPrice=500"
```

#### 5. Create Order
```bash
curl -X POST http://localhost:8000/api/v1/orders \
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

#### 6. Get My Orders
```bash
curl http://localhost:8000/api/v1/orders/my-orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Event Flow

### Complete Order-to-Payment Flow
```
1. USER PLACES ORDER
   ↓
2. Order Service: POST /api/v1/orders
   - Creates order (status: pending)
   - Publishes: order.created
   ↓
3. Payment Service Listener
   - Receives: order.created
   - Creates Stripe payment intent
   - Publishes: payment.initiated
   ↓
4. Order Service Listener
   - Receives: payment.initiated
   - Updates order with clientSecret
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
   ↓
8. Product Service Listener
   - Receives: order.confirmed
   - Reduces inventory
   ↓
9. Review Service Listener (Future)
   - Receives: order.delivered
   - Sends review request
```

### Event Types

**Order Events:**
- `order.created` - New order placed
- `order.confirmed` - Payment successful
- `order.cancelled` - Order cancelled by user
- `order.shipped` - Order dispatched
- `order.delivered` - Order delivered

**Payment Events:**
- `payment.initiated` - Payment intent created
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded

**Product Events:**
- `product.inventory.low` - Low stock alert
- `product.out_of_stock` - Out of stock

---

## 📁 Project Structure
```
ecommerce-microservices/
│
├── api-gateway/
│   ├── src/
│   │   ├── errors
│   │   │    ├── customApiError.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── user-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── RefreshToken.js
│   │   ├── routes/
│   │   │   └── authRoutes.js
│   │   ├── utils/
│   │   │   └── generateToken.js
│   │   └── server.js
│   └── package.json
│
├── product-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── productController.js
│   │   ├── models/
│   │   │   └── Product.js
│   │   ├── routes/
│   │   │   └── productRoutes.js
│   │   ├── listeners/
│   │   │   └── orderListener.js
│   │   ├── utils/
│   │   │   └── rabbitmq.js
│   │   ├── seed.js
│   │   └── server.js
│   └── package.json
│
├── order-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── orderController.js
│   │   ├── models/
│   │   │   └── Order.js
│   │   ├── routes/
│   │   │   └── orderRoutes.js
│   │   ├── listeners/
│   │   │   └── paymentListener.js
│   │   ├── utils/
│   │   │   ├── rabbitmq.js
│   │   │   └── checkPermissions.js
│   │   └── server.js
│   └── package.json
│
├── payment-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── paymentController.js
│   │   ├── models/
│   │   │   └── Payment.js
│   │   ├── routes/
│   │   │   ├── webhookRoutes.js
│   │   │   └── paymentRoutes.js
│   │   ├── listeners/
│   │   │   └── orderListener.js
│   │   ├── utils/
│   │   │   ├── rabbitmq.js
│   │   │   └── stripe.js
│   │   └── server.js
│   └── package.json
│
├── review-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── reviewController.js
│   │   ├── models/
│   │   │   └── Review.js
│   │   ├── routes/
│   │   │   └── reviewRoutes.js
│   │   └── server.js
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 🧪 Testing

### Manual Testing with Postman

1. Import the Postman collection (if provided)
2. Set environment variables (base_url, jwt_token)
3. Test each endpoint

### Testing Stripe Webhooks
```bash
# Start Stripe CLI
stripe listen --forward-to localhost:8004/api/v1/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

---


## 📈 Performance Optimizations

- Database indexing for faster queries
- Connection pooling for MongoDB
- RabbitMQ message persistence
- Pagination for large datasets
- Caching frequently accessed data
- Graceful shutdown handling
- Health check endpoints

---


