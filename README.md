# Stylo - E-Commerce Backend API

## Graduation Project Documentation

## 📋 Project Overview

Stylo is a robust RESTful API backend for an e-commerce platform built with Node.js, Express, and MongoDB. It provides complete business logic for user management, product catalog, shopping cart, order processing, and administrative controls.

## 🚀 Key Features

### Core Features
- **User Authentication**: JWT-based authentication with role-based access control
- **Product Management**: Complete CRUD operations with image upload
- **Category Management**: Hierarchical categories and subcategories
- **Shopping Cart**: Persistent cart with price change detection
- **Order Processing**: Order creation, status tracking, and stock management
- **Review System**: Customer reviews with admin moderation
- **Static Content**: Dynamic page content management (About Us, FAQ, Contact)
- **Admin Dashboard**: Sales reports, notifications, and analytics

### Security Features
- **Password Encryption**: bcrypt hashing for secure password storage
- **JWT Authentication**: Token-based authorization
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Handling**: Comprehensive error management

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript runtime |
| Express.js | Web application framework |
| MongoDB | NoSQL database |
| Mongoose | MongoDB object modeling |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| Multer | File upload handling |
| Winston | Logging |
| dotenv | Environment configuration |

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm (v9 or higher)

## 🔧 Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/stylo-backend.git
cd stylo-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables

Create `.env` file in the root directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/stylo

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Business Configuration
SHIPPING_FEE=50
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

### Step 4: Start MongoDB Service
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod

# Or run MongoDB locally
mongod --dbpath ./data
```

### Step 5: Seed Database (Optional)
```bash
# Seed with default data (120 users, 400 products, 260 orders)
npm run seed

# Seed with custom counts
node src/seeds/seed.js --users=50 --products=200 --orders=100

# Append data without clearing existing
node src/seeds/seed.js --append
```

### Step 6: Start Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:3000`

## 📁 Project Structure

```
src/
├── config/
│   ├── database.js              # MongoDB connection configuration
│   ├── environment.js           # Environment variables loader
│   └── upload.js                # Multer configuration for file uploads
│
├── models/                      # Mongoose data models
│   ├── User.js                  # User schema (authentication, profile)
│   ├── Product.js               # Product schema (title, price, stock, etc.)
│   ├── Category.js              # Category & Subcategory schemas
│   ├── Cart.js                  # Shopping cart schema
│   ├── Order.js                 # Order schema with status tracking
│   ├── Review.js                # Customer review schema
│   └── Page.js                  # Static page content schema
│
├── controllers/                 # Business logic
│   ├── authController.js        # Registration, login, logout
│   ├── userController.js        # Profile, user management
│   ├── productController.js     # Product CRUD operations
│   ├── categoryController.js    # Category & subcategory management
│   ├── cartController.js        # Cart operations (add, update, remove)
│   ├── orderController.js       # Order creation, status updates, reports
│   ├── reviewController.js      # Review submission and moderation
│   └── pageController.js        # Static page content management
│
├── routes/                      # API route definitions
│   ├── authRoutes.js            # Authentication endpoints
│   ├── userRoutes.js            # User profile endpoints
│   ├── productRoutes.js         # Product endpoints
│   ├── categoryRoutes.js        # Category endpoints
│   ├── cartRoutes.js            # Cart endpoints
│   ├── orderRoutes.js           # Order endpoints
│   ├── reviewRoutes.js          # Review endpoints
│   └── pageRoutes.js            # Page content endpoints
│
├── middleware/                  # Custom middleware
│   ├── auth.js                  # JWT verification & role authorization
│   ├── errorHandler.js          # Global error handling
│   └── rateLimiter.js           # API rate limiting
│
├── utils/                       # Utility functions
│   ├── AppError.js              # Custom error class
│   ├── catchAsync.js            # Async error wrapper
│   ├── slugGenerator.js         # Unique slug generation
│   └── logger.js                # Winston logging configuration
│
├── seeds/                       # Database seeding
│   └── seed.js                  # Seed script with fake data
│
└── server.js                    # Application entry point
```

## 📊 Database Models

### User Model
```javascript
{
  name: String,                    // Full name
  email: String,                   // Unique, lowercase
  mobile: String,                  // Unique phone number
  password: String,                // Hashed password
  gender: String,                  // 'male' or 'female'
  address: String,                 // Delivery address
  role: String,                    // 'user' or 'admin'
  active: Boolean,                 // Account status
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Product Model
```javascript
{
  title: String,                   // Product name
  slug: String,                    // URL-friendly identifier
  description: String,             // Product description
  price: Number,                   // Price in EGP
  image: String,                   // Image filename
  category: ObjectId,              // Reference to Category
  subcategory: ObjectId,           // Reference to Subcategory
  stock: Number,                   // Available quantity
  deleted: Boolean,                // Soft delete flag
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Category Model
```javascript
{
  name: String,                    // Category name
  slug: String,                    // URL-friendly identifier
  active: Boolean,                 // Visibility status
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Cart Model
```javascript
{
  user: ObjectId,                  // Reference to User
  items: [{
    product: ObjectId,             // Reference to Product
    quantity: Number,              // Item quantity
    priceAtAdd: Number             // Price when added
  }],
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Order Model
```javascript
{
  orderNumber: String,             // Unique order identifier
  user: ObjectId,                  // Reference to User
  items: [{
    productId: ObjectId,           // Product reference
    productName: String,           // Snapshot of product name
    productImage: String,          // Snapshot of product image
    unitPrice: Number,             // Price at order time
    quantity: Number,              // Ordered quantity
    subtotal: Number               // unitPrice * quantity
  }],
  phone: String,                   // Delivery contact
  address: String,                 // Delivery address
  shippingCost: Number,            // Shipping fee
  totalAmount: Number,             // Items total + shipping
  status: String,                  // Order status
  cancelledBy: String,             // 'user' or 'admin'
  cancelReason: String,            // Cancellation reason
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Order Statuses
- `Pending`: Order placed, awaiting processing
- `Prepared`: Order ready for shipping
- `Shipped`: Order dispatched
- `Delivered`: Order completed
- `CancelledByUser`: User cancelled
- `CancelledByAdmin`: Admin cancelled
- `Rejected`: Order rejected

### Review Model
```javascript
{
  user: ObjectId,                  // Reference to User
  userName: String,                // User's name at review time
  comment: String,                 // Review text
  rating: Number,                  // 1-5 rating
  status: String,                  // pending, approved, rejected, ignored
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

### Page Model
```javascript
{
  key: String,                     // about_us, faq, contact_us
  content: Mixed,                  // Flexible content structure
  createdAt: Date,                 // Timestamp
  updatedAt: Date                  // Timestamp
}
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login user | Public |
| POST | `/api/v1/auth/logout` | Logout user | Private |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users/me` | Get current user profile | Private |
| PUT | `/api/v1/users/me` | Update profile | Private |
| POST | `/api/v1/users/me/change-password` | Change password | Private |
| GET | `/api/v1/users` | Get all users | Admin |
| PATCH | `/api/v1/users/:id/toggle` | Activate/deactivate user | Admin |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/products` | Get products with filters | Public |
| GET | `/api/v1/products/:slug` | Get product by slug | Public |
| GET | `/api/v1/products/admin/all` | Get all products | Admin |
| POST | `/api/v1/products` | Create product (multipart/form-data) | Admin |
| PUT | `/api/v1/products/:id` | Update product | Admin |
| DELETE | `/api/v1/products/:id` | Soft delete product | Admin |

### Categories
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/categories` | Get active categories | Public |
| GET | `/api/v1/categories/admin` | Get all categories | Admin |
| POST | `/api/v1/categories` | Create category | Admin |
| PUT | `/api/v1/categories/:id` | Update category | Admin |
| DELETE | `/api/v1/categories/:id` | Delete category | Admin |
| POST | `/api/v1/categories/:id/subcategories` | Create subcategory | Admin |
| PUT | `/api/v1/categories/:id/subcategories/:subId` | Update subcategory | Admin |
| DELETE | `/api/v1/categories/:id/subcategories/:subId` | Delete subcategory | Admin |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/cart` | Get user cart | Private |
| POST | `/api/v1/cart/items` | Add item to cart | Private |
| PUT | `/api/v1/cart/items/:productId` | Update item quantity | Private |
| DELETE | `/api/v1/cart/items/:productId` | Remove item | Private |
| DELETE | `/api/v1/cart` | Clear cart | Private |
| POST | `/api/v1/cart/merge` | Merge guest cart | Private |
| PATCH | `/api/v1/cart/confirm-price/:productId` | Confirm price changes | Private |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders` | Create order | Private |
| GET | `/api/v1/orders/my` | Get user orders | Private |
| GET | `/api/v1/orders/my/:id` | Get order details | Private |
| PATCH | `/api/v1/orders/my/:id/cancel` | Cancel order | Private |
| GET | `/api/v1/orders/admin` | Get all orders | Admin |
| GET | `/api/v1/orders/admin/:id` | Get order details | Admin |
| PATCH | `/api/v1/orders/admin/:id/status` | Update order status | Admin |
| GET | `/api/v1/orders/admin/reports/sales` | Get sales report | Admin |
| GET | `/api/v1/orders/admin/notifications` | Get notifications | Admin |

### Reviews
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/reviews/approved` | Get approved reviews | Public |
| POST | `/api/v1/reviews` | Create review | Private |
| GET | `/api/v1/reviews/admin` | Get all reviews | Admin |
| PATCH | `/api/v1/reviews/admin/:id` | Update review status | Admin |

### Pages
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/pages/:key` | Get page content | Public |
| PUT | `/api/v1/pages/admin/about_us` | Update About Us | Admin |
| PUT | `/api/v1/pages/admin/faq` | Update FAQ | Admin |
| PUT | `/api/v1/pages/admin/contact_us` | Update Contact Us | Admin |

## 🔐 Authentication Flow

1. **Registration**: User submits data → Password hashed → User created → JWT generated
2. **Login**: Credentials validated → Password verified → JWT generated
3. **Authorization**: JWT verified on each request → User attached to request object
4. **Role-based Access**: Admin endpoints check user role

## 📊 Query Parameters

### Products Filtering
```http
GET /api/v1/products?category=123&subcategory=456&search=shirt&sort=price_asc&page=1&limit=12
```

**Sort Options:**
- `newest`: Created at descending
- `oldest`: Created at ascending
- `price_asc`: Price low to high
- `price_desc`: Price high to low
- `name_asc`: Name A to Z
- `name_desc`: Name Z to A

### Pagination
All list endpoints support pagination with:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10-20)

## 🛡️ Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Internal server error |

## 🧪 Testing

### Manual Testing with Postman
1. Import the Postman collection (if available)
2. Test authentication flow
3. Test CRUD operations
4. Test edge cases and error scenarios

### Seed Data for Testing
```bash
# Seed with test data
npm run seed

# Admin credentials after seeding
Email: user1@seed.local
Password: Pass12345!
```

## 📈 Performance Optimizations

### Database Indexes
- `email` and `mobile` in User model (unique)
- `slug` in Product and Category models (unique)
- `category` and `deleted` in Product model
- `user` and `status` in Order model
- `status` in Review model

### Query Optimizations
- Use `.lean()` for read-only queries
- Select specific fields with `.select()`
- Populate only necessary references
- Implement pagination for all list endpoints

## 🔒 Security Best Practices

1. **Password Security**: bcrypt hashing with 12 salt rounds
2. **JWT Tokens**: 7-day expiration, stored in localStorage
3. **Input Validation**: All inputs validated and sanitized
4. **SQL Injection**: Prevented by Mongoose ODM
5. **XSS Protection**: Data sanitization before storage
6. **Rate Limiting**: 100 requests per 15 minutes per IP
7. **CORS**: Restrict to allowed origins only
8. **Environment Variables**: Sensitive data not hardcoded

## 📝 Logging

Winston logger configured with:
- **Console**: Colored output for development
- **File**: Error logs saved to `logs/error.log`
- **Levels**: Debug in development, Info in production

## 🚦 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | - | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | No | 7d | JWT token expiration |
| `SHIPPING_FEE` | No | 50 | Default shipping cost |
| `ALLOWED_ORIGINS` | No | * | CORS allowed origins |

## 👥 Team Members

- [Your Name] - Backend Developer
- [Team Member Name] - Frontend Developer (if applicable)

## 📚 References

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Documentation](https://jwt.io/)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)

## 📄 License

This project is created for educational purposes as part of graduation requirements.