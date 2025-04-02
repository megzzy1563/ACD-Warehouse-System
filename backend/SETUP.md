# ACD Inventory Backend Setup Guide

This document provides step-by-step instructions for setting up the ACD Inventory Backend project in Visual Studio.

## Prerequisites

1. **Visual Studio**: Install Visual Studio 2022 or later with the following workloads:
   - ASP.NET and web development
   - Node.js development

2. **MongoDB**: You'll need access to MongoDB. You can use:
   - MongoDB Atlas (cloud-based) - Your connection string is already configured
   - Local MongoDB installation (optional for development)

3. **Node.js**: Install Node.js v14.0.0 or higher

## Option 1: Opening the Project in Visual Studio

1. Open Visual Studio
2. Select "Open a project or solution"
3. Navigate to your project folder and select the `ACD-Inventory-Backend.sln` file
4. Once the solution is loaded, right-click on the solution in Solution Explorer and select "Restore NuGet Packages"

## Option 2: Setting Up Manually

If you prefer not to use the Visual Studio solution file, you can set up the project manually:

1. Clone or download the project files to your local machine
2. Open Visual Studio
3. Choose "Open a local folder" and select the project folder
4. Visual Studio should detect it as a Node.js project

## Installing Dependencies

1. Open a terminal in Visual Studio (View → Terminal)
2. Run the following command to install dependencies:
   ```
   npm install
   ```

## Environment Configuration

1. Ensure the `.env` file exists in the root directory with the required configuration:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb+srv://cenizamegandy123:x6RzqiNLUego0vXK@cluster0.fh80y.mongodb.net/acd-inventory?retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=acd_inventory_secret_token_key_2025
   JWT_EXPIRE=30d
   ```

2. Test your MongoDB connection:
   ```
   npm run test:db
   ```
   This should display a success message if the connection is working.

## Setting Up the Database

1. To seed the database with initial test data, run:
   ```
   npm run seed
   ```
   This will create a default admin user and sample inventory items.

2. If you need to clear the database at any point, run:
   ```
   npm run seed:delete
   ```

## Running the Application

### In Visual Studio

1. Make sure `server.js` is set as the startup file
2. Press F5 or click the "Run" button to start the server with debugging
3. The application should start and open a browser window to http://localhost:5000

### From the Command Line

1. For development with auto-restart on file changes:
   ```
   npm run dev
   ```

2. For production mode:
   ```
   npm start
   ```

## Testing the API

1. Use the included Postman collection to test the API endpoints:
   - Import the file `docs/ACD_Inventory_API.postman_collection.json` into Postman
   - Set up an environment variable in Postman called `baseUrl` with the value `http://localhost:5000`

2. API Testing Order:
   - Register a user (or use the default admin: admin@acd-inventory.com / admin123456)
   - Login to get your authentication token
   - The token will be automatically set for subsequent requests in the collection

## Connecting with the Frontend

1. The backend is designed to work with your React frontend
2. Make sure your React app is configured to connect to `http://localhost:5000/api`
3. See the integration guide in `docs/integration-guide.md` for detailed instructions

## Troubleshooting

1. **MongoDB Connection Issues**:
   - Verify your connection string in the `.env` file
   - Check if MongoDB Atlas IP whitelist includes your IP address
   - Run `npm run test:db` to test the connection

2. **Port Already in Use**:
   - If port 5000 is already in use, change the `PORT` value in your `.env` file

3. **Dependencies Issues**:
   - Delete the `node_modules` folder and run `npm install` again

## Next Steps

After setting up the project, you can:

1. Explore the codebase to understand its structure
2. Modify or extend the API based on your specific requirements
3. Connect it to your frontend application
4. Deploy to a production environment when ready

For any questions or issues, refer to the README.md file or contact the development team.