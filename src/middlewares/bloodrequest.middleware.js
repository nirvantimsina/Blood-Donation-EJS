const BloodRequest = require('../models/bloodRequest.model');
const mongoose = require('mongoose');

const populateMyBloodRequest = async (req, res, next) => {
    try {
        const userId = req.session.user;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const objectId = mongoose.Types.ObjectId.createFromHexString(userId);
        const requests = await BloodRequest.find({ createdBy: objectId });
        // Attach to request for use in next middleware or route
        req.userBloodRequests = requests;
        next();
    } catch (error) {
        console.error('Error populating blood requests:', error);
        return res.status(500).json({ error: 'Server error while fetching blood requests' });
    }
};
const populateBloodRequest = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const requestId = req.params.id;
        const bloodRequest = await BloodRequest.findById(requestId)
            .populate('createdBy', 'fullName userImage contactNumber'); // Populate creator details if needed
        console.log("Ram")

        if (!bloodRequest) {
            return res.status(404).render('error', {
                message: 'Blood request not found',
                error: { status: 404 }
            });
        }
        // Attach to request for use in next middleware or route
        req.bloodRequest = bloodRequest;
        next();
    } catch (error) {
        console.error('Error populating blood requests:', error);
        return res.status(500).json({ error: 'Server error while fetching blood requests' });
    }
};


module.exports = { populateMyBloodRequest, populateBloodRequest };
