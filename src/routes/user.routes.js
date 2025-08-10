const express = require("express");
const path = require("path");
const app = require('../app.js');
const router = express.Router();
const upload = require('../middlewares/multer.middleware.js')
const { verifyUserSession, approvedVerification, unApprovedVerification } = require('../middlewares/auth.middleware.js')
const { populateFamilyMembers } = require('../middlewares/familyMembers.middleware.js')
const { populateMyBloodRequest } = require('../middlewares/bloodrequest.middleware.js')
const { populateFamilyMembersRecipient, sendAllUsers } = require('../controllers/familyMembers.controller.js')
const { getUnreadNotificationsCount, getUnreadRequestsCount } = require('../middlewares/notificationCounter.middleware.js')
const { searchHospitals } = require('../services/hospitals.service.js')
app.use(express.static(path.resolve("../public")));

const Notification = require("../models/notification.model.js");

app.set('views', path.join(__dirname, '../public/views'));
app.set('view engine', 'ejs')
const { medicalDetails, updatePersonalDetails, logoutUser } = require('../controllers/user.controller.js')
const { populateUserDetails } = require('../controllers/bloodRequest.controller.js')
const { updateReadStatus, removeNotification, updateUnreadStatus } = require('../controllers/notification.controller.js')
const { searchFamilyMembers, familyMembersDetails, handleRequestStatus, removeFamilyMembers } = require('../controllers/user.controller.components.js')
router.get('/medicaldetails', approvedVerification, verifyUserSession, getUnreadRequestsCount, getUnreadNotificationsCount, async (req, res) => {
    const user = req.user
    res.render('medicalDetails', { user: user });
})
router.post('/medicaldetails', verifyUserSession, upload.single('bloodGroupImage'), medicalDetails);
router.get('/details', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, async (req, res) => {
    const message = req.session.message;
    const error = req.session.error;
    const user = req.user;
    req.session.message = null;
    req.session.error = null;
    res.render('personalDetails', { error: error, message: message, user: user });
})
router.get('/mybloodrequests', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, populateMyBloodRequest, async (req, res) => {
    const message = req.session.message;
    const error = req.session.error;
    const user = req.user;
    const bloodRequests = req.userBloodRequests;
    req.session.message = null;
    req.session.error = null;
    res.render('myBloodRequests', { error: error, message: message, user: user, bloodRequests: bloodRequests });
})
router.get('/familymembers', verifyUserSession, getUnreadNotificationsCount, unApprovedVerification, getUnreadRequestsCount, populateFamilyMembers, async (req, res) => {
    const message = req.session.message;
    // const error = req.session.error;
    // req.session.error = null;
    const user = req.user;
    req.session.message = null;
    res.render('familyMembers', { message: message, user: user, familyMembers: req.familyMembers });
})
router.get('/notifications', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, async (req, res) => {
    const message = req.session.message;
    // const error = req.session.error;
    const user = req.user;
    req.session.message = null;
    const notification = await Notification.find({ userId: user })
        .exec()

    notification.forEach(notif => {
        notif.messages.sort((a, b) => b.createdAt - a.createdAt); // Sort messages in descending order
    });
    // req.session.error = null;
    res.render('notification', { message: message, user: user, notification: notification });
})
router.get('/familymember-request', verifyUserSession, unApprovedVerification, getUnreadNotificationsCount, getUnreadRequestsCount, async (req, res) => {
    const message = req.session.message;
    // const error = req.session.error;
    const user = req.user;
    req.session.message = null;
    const notification = await Notification.find({ userId: user })
        .exec()
    notification.forEach(notif => {
        notif.messages.sort((a, b) => b.createdAt - a.createdAt); // Sort messages in descending order
    });
    const removeLink = (html) => {
        return html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '');
    };
    notification.forEach(notification => {
        notification.messages.forEach(msg => {
            msg.cleanedMessage = removeLink(msg.message);
        });
    });
    // req.session.error = null;
    res.render('request', { message: message, user: user, notification: notification });
})


router.post('/details', verifyUserSession, upload.single('profileImage'), updatePersonalDetails)
router.post('/remove-notification', verifyUserSession, removeNotification)
router.get('/logout', verifyUserSession, logoutUser)
router.get('/populate-details', verifyUserSession, populateUserDetails)
router.get('/familymembers/populate-details', verifyUserSession, populateFamilyMembersRecipient)
router.get('/all-users-details', verifyUserSession, sendAllUsers)
router.get('/familymembers/search', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, searchFamilyMembers)
router.get('/hospital/search', verifyUserSession, getUnreadNotificationsCount, getUnreadRequestsCount, searchHospitals)
router.post('/familymembers', verifyUserSession, familyMembersDetails)
router.post('/update-read-status', verifyUserSession, updateReadStatus)
router.post('/update-unread-status', verifyUserSession, updateUnreadStatus)
router.post('/handle-request', verifyUserSession, handleRequestStatus)
router.post('/familymembers-remove', verifyUserSession, removeFamilyMembers)

module.exports = router;