const User = require("../models/user.model.js");
const BloodRequest = require("../models/bloodRequest.model.js");
const Notification = require("../models/notification.model.js");
const mongoose = require("mongoose");
const { saveNotification, sendEMail } = require('./user.controller.components.js');

// Debugging flag
const DEBUG = true;

const populateUserDetails = async (req, res) => {
    try {
        if (DEBUG) console.log('[DEBUG] populateUserDetails - Start');

        if (!req.session.user) {
            if (DEBUG) console.log('[ERROR] populateUserDetails - No user session');
            req.session.error = 'You must be logged in to view this information';
            return res.redirect("/login");
        }

        const userId = req.session.user;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            if (DEBUG) console.log('[ERROR] populateUserDetails - Invalid user ID format:', userId);
            req.session.error = 'Invalid user information';
            return res.redirect("/home");
        }

        if (DEBUG) console.log('[DEBUG] populateUserDetails - Fetching user:', userId);
        const user = await User.findById(userId)
            .select("fullName userImage address gender contactNumber disease bloodDetails")
            .lean();

        if (!user) {
            if (DEBUG) console.log('[ERROR] populateUserDetails - User not found:', userId);
            req.session.error = 'User information not found';
            return res.redirect("/home");
        }

        if (DEBUG) console.log('[DEBUG] populateUserDetails - Success:', userId);
        return res.json(user);

    } catch (error) {
        console.error('[CRITICAL] populateUserDetails - Error:', error.message, '\nStack:', error.stack);
        req.session.error = 'Failed to load user details';
        return res.redirect("/home");
    }
};

const bloodRequest = async (req, res) => {
    try {
        if (DEBUG) console.log('[DEBUG] bloodRequest - Start');

        // Validate session first
        if (!req.session.user) {
            if (DEBUG) console.log('[ERROR] bloodRequest - No user session');
            req.session.error = 'You must be logged in to create a blood request';
            return res.redirect("/login");
        }

        if (DEBUG) console.log('[DEBUG] bloodRequest - Validating input data');
        // Extract form data
        const {
            recipientType,
            fullName,
            address,
            bloodGroupType,
            contactNumber,
            contactNumber2,
            hospital,
            urgency,
            bloodUnits,
            requestReason,
            bloodType,
            latitude,
            longitude,
        } = req.body;

        // Validate required fields
        const requiredFields = {
            'Full Name': fullName,
            'Address': address,
            'Blood Group': bloodGroupType,
            'Contact Number': contactNumber,
            'Hospital': hospital,
            'Urgency': urgency,
            'Blood Units': bloodUnits,
            'Location': latitude && longitude
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([field]) => field);

        if (missingFields.length > 0) {
            if (DEBUG) console.log('[ERROR] bloodRequest - Missing fields:', missingFields);
            req.session.error = `Missing required fields: ${missingFields.join(', ')}`;
            return res.redirect("/bloodRequest");
        }

        // Validate contact number format
        if (!/^\d{10}$/.test(contactNumber)) {
            if (DEBUG) console.log('[ERROR] bloodRequest - Invalid contact:', contactNumber);
            req.session.error = 'Contact number must be a valid 10-digit number';
            return res.redirect("/bloodRequest");
        }

        // Validate coordinates
        const parsedLatitude = parseFloat(latitude);
        const parsedLongitude = parseFloat(longitude);
        if (isNaN(parsedLatitude)) {
            if (DEBUG) console.log('[ERROR] bloodRequest - Invalid latitude:', latitude);
            req.session.error = 'Invalid latitude value';
            return res.redirect("/bloodRequest");
        }
        if (isNaN(parsedLongitude)) {
            if (DEBUG) console.log('[ERROR] bloodRequest - Invalid longitude:', longitude);
            req.session.error = 'Invalid longitude value';
            return res.redirect("/bloodRequest");
        }

        // Validate blood units
        const units = parseInt(bloodUnits, 10);
        if (isNaN(units) || units <= 0) {
            if (DEBUG) console.log('[ERROR] bloodRequest - Invalid blood units:', bloodUnits);
            req.session.error = 'Blood units must be a positive number';
            return res.redirect("/bloodRequest");
        }

        // Get user
        if (DEBUG) console.log('[DEBUG] bloodRequest - Fetching user:', req.session.user);
        const user = await User.findById(req.session.user);
        if (!user) {
            if (DEBUG) console.log('[ERROR] bloodRequest - User not found:', req.session.user);
            req.session.error = 'User account not found';
            return res.redirect("/login");
        }

        // Create blood request
        if (DEBUG) console.log('[DEBUG] bloodRequest - Creating request');
        const bloodRequestData = {
            recipientType,
            fullName,
            address,
            bloodGroupType,
            contactNumber,
            contactNumber2: contactNumber2 || '',
            hospital,
            urgency,
            bloodUnits: units,
            requestReason: requestReason || '',
            bloodType,
            hospitalLocation: {
                latitude: 26.658257645026083,
                longitude: 87.6860653758995,
            },
            createdBy: user._id,
            status: 'pending'
        };

        const currentUserId = req.session.user;
        const newRequest = await BloodRequest.create(bloodRequestData);
        if (DEBUG) console.log('[DEBUG] bloodRequest - Request created:', newRequest._id);

        // Find matching donors
        if (DEBUG) console.log('[DEBUG] bloodRequest - Finding matching donors');
        const matchedDonors = await matchBloodDonors(bloodRequestData, currentUserId);

        if (matchedDonors.length > 0) {
            if (DEBUG) console.log('[DEBUG] bloodRequest - Found', matchedDonors.length, 'matching donors');

            newRequest.match = true;
            await newRequest.save();
            if (DEBUG) console.log('[DEBUG] bloodRequest - Updated request with match flag');

            // Notify each donor
            for (let donor of matchedDonors) {
                try {
                    if (DEBUG) console.log('[DEBUG] bloodRequest - Processing donor:', donor._id);

                    const userId = donor._id;
                    const senderId = req.session.user;

                    // Create notification
                    let notification = await Notification.findOne({ userId });
                    let newMessageId = notification ? `message${notification.messages.length + 1}` : 'message1';

                    const newMessage = {
                        id: newMessageId,
                        senderId: senderId,
                        type: 'info',
                        title: "Blood Donation Request",
                        status: "pending",
                        message: `Hello ${donor.fullName}, ${newRequest.fullName} is in urgent need of ${newRequest.bloodUnits} unit of ${newRequest.bloodGroupType} blood. <br>And it is likely that you are around 3km radius of ${newRequest.hospital}, would you please donate to save a life.  <a href="${process.env.DOMAIN}/bloodRequest/${newRequest._id}">Click here to view details of the urgent Donation.</a>`,
                        acceptordecline: false,
                        createdAt: new Date(),
                        read: false
                    };

                    if (DEBUG) console.log('[DEBUG] bloodRequest - Saving notification for donor:', donor._id);
                    await saveNotification(newMessage, userId);

                    // Send email
                    const email = donor.email;
                    const emailBody = `
                        Dear ${donor.fullName},
                        <p>${newRequest.fullName} is in urgent need of ${newRequest.bloodUnits} unit of ${newRequest.bloodGroupType} blood. 
                        And it is likely that you are around 3km radius of ${newRequest.hospital}, would you please donate to save a life.</p>
                        <a href="${process.env.DOMAIN}bloodRequest/${newRequest._id}">Click here to view details of the urgent Donation.</a>`;
                    const subject = "Blood Donation Request";

                    if (DEBUG) console.log('[DEBUG] bloodRequest - Sending email to:', email);
                    await sendEMail(email, emailBody, subject)
                        .then(() => {
                            if (DEBUG) console.log('[DEBUG] bloodRequest - Email sent successfully to:', email);
                        })
                        .catch(emailError => {
                            console.error('[ERROR] bloodRequest - Failed to send email to', email, ':', emailError);
                        });

                } catch (donorError) {
                    console.error('[ERROR] bloodRequest - Error processing donor', donor._id, ':', donorError);
                }
            }
        } else {
            if (DEBUG) console.log('[DEBUG] bloodRequest - No matching donors found');
        }

        req.session.message = 'Blood request submitted successfully!';
        if (DEBUG) console.log('[DEBUG] bloodRequest - Completed successfully');
        return res.redirect("/home");

    } catch (error) {
        console.error('[CRITICAL] bloodRequest - Error:', error.message, '\nStack:', error.stack);
        req.session.error = 'Failed to submit blood request. Please try again.';
        return res.redirect("/bloodRequest");
    }
};

const deleteBloodRequest = async (req, res) => {
    try {
        if (DEBUG) console.log('[DEBUG] deleteBloodRequest - Start');

        if (!req.session.user) {
            if (DEBUG) console.log('[ERROR] deleteBloodRequest - No user session');
            req.session.error = 'You must be logged in to perform this action';
            return res.redirect("/login");
        }

        const { bloodRequestId } = req.body;
        if (!bloodRequestId) {
            if (DEBUG) console.log('[ERROR] deleteBloodRequest - No request ID provided');
            req.session.error = 'No request specified for deletion';
            return res.redirect("/home");
        }

        if (!mongoose.Types.ObjectId.isValid(bloodRequestId)) {
            if (DEBUG) console.log('[ERROR] deleteBloodRequest - Invalid request ID:', bloodRequestId);
            req.session.error = 'Invalid request identifier';
            return res.redirect("/home");
        }

        // Verify the request belongs to the user
        if (DEBUG) console.log('[DEBUG] deleteBloodRequest - Finding request:', bloodRequestId);
        const request = await BloodRequest.findOne({
            _id: bloodRequestId,
            createdBy: req.session.user
        });

        if (!request) {
            if (DEBUG) console.log('[ERROR] deleteBloodRequest - Request not found or unauthorized:', bloodRequestId);
            req.session.error = 'Blood request not found or you are not authorized';
            return res.redirect("/home");
        }

        // Only allow deletion if status is pending
        if (request.status !== 'pending') {
            if (DEBUG) console.log('[ERROR] deleteBloodRequest - Attempt to delete non-pending request:', request.status);
            req.session.error = 'Only pending requests can be deleted';
            return res.redirect("/home");
        }

        if (DEBUG) console.log('[DEBUG] deleteBloodRequest - Deleting request:', bloodRequestId);
        await BloodRequest.deleteOne({ _id: bloodRequestId });

        req.session.message = 'Blood request deleted successfully';
        if (DEBUG) console.log('[DEBUG] deleteBloodRequest - Completed successfully');
        return res.redirect("/home");

    } catch (error) {
        console.error('[CRITICAL] deleteBloodRequest - Error:', error, '\nStack:', error.stack);
        req.session.error = 'Failed to delete blood request';
        return res.redirect("/home");
    }
};



const matchBloodDonors = async (bloodRequestData, currentUserId) => {
    try {
        if (DEBUG) console.log('[DEBUG] matchBloodDonors - Start');

        const { hospitalLocation, bloodGroupType } = bloodRequestData;

        // Validate hospital location exists
        if (!hospitalLocation || !hospitalLocation.latitude || !hospitalLocation.longitude) {
            if (DEBUG) console.log('[ERROR] matchBloodDonors - Invalid hospital location');
            return [];
        }

        if (DEBUG) console.log('[DEBUG] matchBloodDonors - Finding eligible donors');
        const allUsers = await User.find({
            _id: { $ne: currentUserId },
            canDonate: true,
            approved: true,
            'location.latitude': { $exists: true, $ne: null },
            'location.longitude': { $exists: true, $ne: null },
            'bloodDetails.bloodGroupType': { $exists: true } // Ensure blood group exists
        }).select('+email +location +bloodDetails +lastDonationDate');

        const matchedUsers = [];
        const now = new Date();
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        if (DEBUG) {
            console.log('[DEBUG] matchBloodDonors - Processing', allUsers.length, 'potential donors');
            console.log('[DEBUG] Hospital location:', hospitalLocation);
        }

        for (let user of allUsers) {
            try {
                // Skip users without complete location data
                if (!user.location?.latitude || !user.location?.longitude) {
                    if (DEBUG) console.log('[DEBUG] Skipping user - incomplete location:', user._id);
                    continue;
                }

                if (DEBUG) console.log('[DEBUG] Checking user:', user._id, 'at location:', user.location);

                // Compare locations with tolerance for floating point precision
                const areLocationsEqual =
                    Math.abs(user.location.latitude - hospitalLocation.latitude) < 0.0001 &&
                    Math.abs(user.location.longitude - hospitalLocation.longitude) < 0.0001;

                const distance = areLocationsEqual ? 0 : calculateDistance(
                    user.location.latitude,
                    user.location.longitude,
                    hospitalLocation.latitude,
                    hospitalLocation.longitude
                );

                const donorBlood = user.bloodDetails?.bloodGroupType;
                const lastDonationDate = user.lastDonationDate ? new Date(user.lastDonationDate) : null;
                const canDonateBasedOnDate = !lastDonationDate || lastDonationDate <= threeMonthsAgo;

                if (DEBUG) {
                    console.log('[DEBUG] Donor details:', {
                        id: user._id,
                        distance,
                        donorBlood,
                        lastDonation: lastDonationDate,
                        canDonateBasedOnDate,
                        compatible: canDonateTo(donorBlood, bloodGroupType)
                    });
                }

                if (distance <= 3 &&
                    donorBlood &&
                    canDonateTo(donorBlood, bloodGroupType) &&
                    canDonateBasedOnDate) {

                    if (DEBUG) console.log('[DEBUG] MATCHED donor:', user._id);
                    matchedUsers.push(user);
                }
            } catch (userError) {
                console.error('[ERROR] matchBloodDonors - Error processing user', user._id, ':', userError);
            }
        }

        if (DEBUG) {
            console.log('[DEBUG] matchBloodDonors - Final matches:', matchedUsers.map(u => u._id));
            console.log('[DEBUG] matchBloodDonors - Hospital blood group:', bloodGroupType);
        }
        return matchedUsers;

    } catch (error) {
        console.error('[CRITICAL] matchBloodDonors - Error:', error);
        return [];
    }
};


// Helper functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const bloodCompatibility = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
};

function canDonateTo(donorBlood, recipientBlood) {
    const compatibleRecipients = bloodCompatibility[donorBlood];
    return compatibleRecipients ? compatibleRecipients.includes(recipientBlood) : false;
}

module.exports = {
    populateUserDetails,
    bloodRequest,
    deleteBloodRequest
};