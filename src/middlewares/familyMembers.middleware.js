const User = require('../models/user.model');
const populateFamilyMembers = async (req, res, next) => {
    try {
        const userId = req.session.user
        const userDoc = await User.findById(userId).populate('familyMembers.memberId').exec();

        if (!userDoc) {
            return res.status(404).send('User not found');
        }
        req.familyMembers = userDoc.familyMembers.map(member => ({
            id: member.memberId._id,
            fullName: member.memberId.fullName,
            userImage: member.memberId.userImage,
            address: member.memberId.address,
            gender: member.memberId.gender,
            contactNumber: member.memberId.contactNumber,
            email: member.memberId.email,
            bloodDetails: member.memberId.bloodDetails
        }));
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
};
module.exports = { populateFamilyMembers }
