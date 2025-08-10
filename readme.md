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
     ```
   - Replace `MONGODB_URI` with your actual MongoDB URI and set a strong `SESSION_SECRET`.

## Running the Application

1. Start the server:

   ```bash
   npm start
   ```

2. The application should now be running at:
   ```text
   http://localhost:3000
   ```

## Project Structure

```
Blood-Donation-EJS/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── models/             # MongoDB models
├── public/             # Static assets (CSS, JS, images)
├── routes/             # Express routes
├── views/              # EJS templates
├── app.js              # Main application file
├── package.json        # Project dependencies
└── .env                # Environment variables
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
