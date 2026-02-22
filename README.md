## Architecture

This e-commerce platform uses a microservices architecture with:

- **API Gateway**: Routes requests and handles authentication
- **User Service**: User registration, login, JWT token management
- **Product Service**: Product catalog and inventory management
- **Order Service**: Order creation and lifecycle management
- **Payment Service**: Stripe integration and payment processing

### Tech Stack
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Message Queue**: RabbitMQ (event-driven communication)
- **Caching**: Redis
- **Payment**: Stripe API
- **Containerization**: Docker

### Workflow
- All api passes through `Api gateway` with headers enabling authentication and authorization
