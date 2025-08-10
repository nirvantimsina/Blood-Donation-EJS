const User = require('../models/user.model');
const populateFamilyMembersRecipient = async (req, res) => {
    try {
        const userId = req.session.user;

        // Find the user and populate only approved family members
        const userDoc = await User.findById(userId)
            .populate({
                path: 'familyMembers.memberId',
                match: { approved: true }  // Only include family members who are approved
            })
            .exec();

        if (!userDoc) {
            return res.status(404).send('User not found');
        }

        // Filter out any null entries in case some family members are not approved
        const familyMembers = userDoc.familyMembers
            .filter(member => member.memberId !== null)
            .map(member => ({
                id: member.memberId._id,
                fullName: member.memberId.fullName,
                userImage: member.memberId.userImage,
                address: member.memberId.address,
                gender: member.memberId.gender,
                contactNumber: member.memberId.contactNumber,
                //email: member.memberId.email,
                bloodDetails: member.memberId.bloodDetails
            }));

        return res.json({ familyMembers });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
};

const sendAllUsers = async (req, res) => {
    try {
        // Fetch all users from the User collection
        const users = await User.find({}, 'fullName userImage address gender contactNumber email bloodDetails').exec();

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        // Send the users data as a JSON response
        return res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


module.exports = { populateFamilyMembersRecipient, sendAllUsers }
