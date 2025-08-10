const BloodRequest = require('../models/bloodRequest.model');
const User = require('../models/user.model');

const populateUsersAndBloodRequestCount = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBloodRequests = await BloodRequest.countDocuments();

        // Attach the counts to res.locals so it's accessible in views
        res.locals.totalUsers = totalUsers;
        res.locals.totalBloodRequests = totalBloodRequests;

        next();
    } catch (error) {
        console.error("Error fetching counts:", error);
        next(error); // Pass error to the error handler
    }
};
const populateAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().lean(); // lean() returns plain JS objects
        res.locals.users = users;
        next();
    } catch (err) {
        console.error("Error fetching users:", err);
        req.session.error = "Failed to fetch users.";
        res.redirect('/admin/dashboard');
    }
};

module.exports = { populateUsersAndBloodRequestCount, populateAllUsers };
