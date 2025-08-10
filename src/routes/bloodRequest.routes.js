const express = require("express");
const path = require("path");
const app = require('../app.js');
const router = express.Router();
const upload = require('../middlewares/multer.middleware.js')
const { verifyUserSession, approvedVerification, unApprovedVerification } = require('../middlewares/auth.middleware.js')
const { populateFamilyMembers } = require('../middlewares/familyMembers.middleware.js')
const { populateBloodRequest}= require('../middlewares/bloodrequest.middleware.js')
const { populateFamilyMembersRecipient, sendAllUsers } = require('../controllers/familyMembers.controller.js')
const { getUnreadNotificationsCount, getUnreadRequestsCount } = require('../middlewares/notificationCounter.middleware.js')
const { searchHospitals } = require('../services/hospitals.service.js')
app.use(express.static(path.resolve("../public")));

const Notification = require("../models/notification.model.js");

app.set('views', path.join(__dirname, '../public/views'));
app.set('view engine', 'ejs')
const { medicalDetails, updatePersonalDetails, logoutUser } = require('../controllers/user.controller.js')
const { populateUserDetails, deleteBloodRequest } = require('../controllers/bloodRequest.controller.js')
const { updateReadStatus, removeNotification, updateUnreadStatus } = require('../controllers/notification.controller.js')
const { searchFamilyMembers, familyMembersDetails, handleRequestStatus, removeFamilyMembers } = require('../controllers/user.controller.components.js')
router.get('/medicaldetails', approvedVerification, verifyUserSession, getUnreadRequestsCount, getUnreadNotificationsCount, async (req, res) => {
    const user = req.user
    res.render('medicalDetails', { user: user });
})

router.post('/deletebloodrequest', verifyUserSession, deleteBloodRequest)

module.exports = router;