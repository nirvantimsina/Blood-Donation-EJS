const User = require("../models/user.model.js");
const Admin = require("../models/admin.model.js");

const verifyUserSession = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect("/login")
        }
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying session:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
const redirectLoggedInUser = async (req, res, next) => {
    try {
        if (req.session.user) {
            return res.redirect('/home');

        }
        next();
    }
    catch (error) {
        return res.json({ error: 'Internal server error' });
    }
};
const approvedVerification = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (user.approved === true) {
            return res.redirect('/home')
        }
        next()
    } catch (error) {

    }
}
const unApprovedVerification = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (user.approved !== true) {
            return res.redirect('/home')
        }
        next()
    } catch (error) {

    }
}

const verifyAdminSession = async (req, res, next) => {
    try {
        if (!req.session || !req.session.admin) {
            return res.redirect("/admin/login")
        }
        const adminId = req.session.admin;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.redirect('/admin/login');
        }
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Error verifying session:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
const redirectLoggedInAdmin = async (req, res, next) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        next();
    }
    catch (error) {
        return res.json({ error: 'Internal server error' });
    }
};



module.exports = { verifyUserSession, redirectLoggedInUser, approvedVerification, unApprovedVerification, verifyAdminSession, redirectLoggedInAdmin }