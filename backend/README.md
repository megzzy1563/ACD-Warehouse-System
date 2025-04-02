# ACD Inventory Backend API

A RESTful API backend for the ACD Inventory Management System built with Node.js, Express, and MongoDB.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Visual Studio with Node.js development workload installed

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
```bash
npm install
```
4. Create a .env file in the root directory with the following variables:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://cenizamegandy123:x6RzqiNLUego0vXK@cluster0.fh80y.mongodb.net/acd-inventory?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=acd_inventory_secret_token_key_2025
JWT_EXPIRE=30d
```
5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update user password
- `GET /api/auth/logout` - Logout user

### Inventory Management

- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create a new inventory item
- `GET /api/inventory/:id` - Get a single inventory item
- `PUT /api/inventory/:id` - Update an inventory item
- `DELETE /api/inventory/:id` - Delete an inventory item
- `POST /api/inventory/transaction` - Process stock in/out transaction

### Reports

- `GET /api/reports/daily` - Get daily transaction report
- `GET /api/reports/stock-movement` - Get stock movement data for charts
- `GET /api/reports/inventory-stats` - Get inventory statistics
- `GET /api/reports/transactions` - Get transaction history with pagination

## Authentication

All protected routes require a JWT token sent in the request headers:

```
Authorization: Bearer <your_token>
```

## Connecting with Frontend

To connect this backend with the React frontend:

1. Update the baseURL in your React app's API config to point to this backend
2. Ensure CORS is properly configured to allow requests from your frontend's origin
3. Implement JWT token storage and management in the frontend

## Database Models

### User
- name: String
- email: String (unique)
- role: String (admin, manager, user)
- password: String (hashed)
- avatar: String

### InventoryItem
- partsName: String
- partsNumber: String (unique)
- component: String (enum)
- quantity: Number
- itemPrice: Number
- imageData: String (base64)
- rack: String
- tax: Number
- totalAmount: Number
- pic: String
- poNumber: String
- ctplNumber: String
- date: String
- createdBy: ObjectId (User reference)
- createdAt: Date
- updatedAt: Date

### Transaction
- itemId: ObjectId (InventoryItem reference)
- partsName: String
- partsNumber: String
- transactionType: String (in, out)
- quantity: Number
- previousQuantity: Number
- newQuantity: Number
- notes: String
- performedBy: ObjectId (User reference)
- performedAt: Date