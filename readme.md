# Blood Donation Management System

## Overview

This is a Blood Donation Management System built with Node.js, Express, and the EJS templating engine. The application helps manage blood donation records, donors, and recipients with a user-friendly web interface.

## Features

- **User Authentication** (login/signup)
- **Donor Management**
- **Recipient Management**
- **Blood Donation Record Tracking**
- **Admin Dashboard**
- **Responsive Web Interface**

## Technologies Used

- **Node.js**
- **Express.js**
- **EJS** (Embedded JavaScript templates)
- **MongoDB** (with Mongoose ODM)
- **Bootstrap** (for frontend styling)
- **Passport.js** (for authentication)

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **MongoDB** (either local instance or MongoDB Atlas connection)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nikeshadhikari9/Blood-Donation-EJS.git
   cd Blood-Donation-EJS
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory with the following content:
     ```text
     MONGODB_URI=your_Mongodb_URI
     SESSION_SECRET=your_session_secret_here
     PORT=3000
     CLOUDNAME=your_cloudinary_name
     API_KEY=your_cloudinary_key
     API_SECRET=your_cloudinary_secret
     GEMINI_API_KEY=your_gemini_api_key
     APP_EMAIL=your_email
     APP_PASSWORD=your_email_password
     APP_PORT=465
     DOMAIN=http://localhost:4001/
     HUGGINGFACEAPI=Bearer your_token
     ```
   - Replace all env variables values with your actual values.

## Running the Application

1. Go to the src folder:
   ```bash
    cd src
   ```
2. Start the server:

   ```bash
   npm start
   ```

3. The application should now be running at:
   ```text
   http://localhost:3000
   ```

## Available Routes

- `/` - Home page
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/dashboard` - Main dashboard (after login)
- `/donor` - Donor management
- `/recipient` - Recipient management
- `/blood` - Blood donation records

## Admin Access

The application includes admin functionality. To create an admin user, you can either:

- Manually set `isAdmin: true` in the user document in MongoDB, or
- Use the signup form with a special admin code (if implemented in the application).

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is open-source. Please check the repository for specific licensing information.

## Author

Nikesh Adhikari
