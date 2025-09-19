const User = require("../models/user.model.js");
const Admin = require("../models/admin.model.js");
const { uploadInCloudinary } = require('./cloudinary.js');
const { bloodGroupValidation, updateUserLocation } = require('./user.controller.components.js');
const registerUser = async (req, res) => {
    try {
        const { firstName, middleName, lastName, province, district, city, contactNumber, gender, email, password, lastDonationDate } = req.body;
        const existedUserWithEmail = await User.findOne({ email });
        const existedUserWithNum = await User.findOne({ contactNumber });

        if (existedUserWithEmail) {
            req.session.error = 'Email already registered'
            return res.redirect("/register");
        }

        if (existedUserWithNum) {
            req.session.error = 'Number already registered'
            return res.redirect("/register");
        }

        const address = {
            province: province,
            district: district,
            city: city
        }

        const fullName = firstName + ' ' + middleName + ' ' + lastName;
        const userImage = "https://i.pinimg.com/736x/71/11/82/711182648b79d448117c2a990c9c9ec9.jpg";

        const newUser = await User.create({
            fullName,
            userImage,
            address,
            gender,
            contactNumber,
            lastDonationDate,
            email,
            password,
            approved: false
        });
        req.session.message = 'Registered Successfully'
        return res.redirect("/login");
    } catch (error) {
        console.log(error)
        return res.render('register', { error: 'Internal server error', message: null });
    }
}
const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const passwordMatching = await User.matchPasswordAndGenerateToken(identifier, password);
        if (passwordMatching) {
            const objectId = passwordMatching._id;
            const userId = objectId.toString();
            req.session.user = userId
            req.session.message = "Logged in Successfully";
            return res.redirect("/home");
        }
    } catch (error) {
        const errorMessage = error.message
        return res.render('login', { error: errorMessage, message: null });
    }
};
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const passwordMatching = await Admin.matchPasswordAndGenerateToken(email, password);
        if (passwordMatching) {
            const objectId = passwordMatching._id;
            const userId = objectId.toString();
            req.session.admin = userId
            req.session.message = "Logged in Successfully";
            return res.redirect("/admin/dashboard");
        }
    } catch (error) {
        const errorMessage = error.message
        return res.render('adminlogin', { error: errorMessage, message: null });
    }
};
const medicalDetails = async (req, res) => {
    try {
        let { bloodGroupType, disease } = req.body;
        if (disease == 'anyOther') {
            const specificDisease = req.body.SpecificDisease
            disease = specificDisease
            console.log(specificDisease)
        }
        const userId = req.session.user;

        if (!req.file) {
            throw new Error("No bloodGroupImage uploaded");
        }
        const bloodGroupImageFile = req.file;

        const bloodGroupResult = await uploadInCloudinary(bloodGroupImageFile.path);

        const bloodGroupImage = bloodGroupResult.url;

        const bloodDetails = {
            bloodGroupType: bloodGroupType,
            bloodGroupImage: bloodGroupImage
        };
        const updateDetail = await User.updateOne(
            { _id: userId },
            {
                bloodDetails,
                disease
            },
            { new: true }
        );
        req.session.message = "Verification Mail will be sent shortly";
        bloodGroupValidation(userId)
        return res.redirect('/home');
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
const updatePersonalDetails = async (req, res) => {
    try {
        const { fullName, province, district, city, lastDonationDate } = req.body;
        const userId = req.session.user;

        // Validate required fields
        const user = await User.findById(userId);
        if (user.approved) {

            if (!province || !district || !city) {
                req.session.error = "All fields are required.";
                return res.redirect('/user/details');
            }
            if (!user) {
                req.session.error = "User not found.";
                return res.redirect('/user/details');
            }

            // Check if no changes are detected
            if (
                lastDonationDate === user.lastDonationDate &&
                province === user.address.province &&
                district === user.address.district &&
                city.trim() === user.address.city &&
                !req.file
            ) {
                req.session.error = "No changes detected.";
                return res.redirect('/user/details');
            }

            let userImage = user.userImage;
            if (req.file) {
                const userImageFile = req.file;
                const userImageResult = await uploadInCloudinary(userImageFile.path);
                userImage = userImageResult.url;
            }

            const address = {
                province: province,
                district: district,
                city: city
            };

            const updatedProfile = await User.findByIdAndUpdate(userId, {
                address: address,
                userImage: userImage,
                lastDonationDate: lastDonationDate
            });
        } else {

            if (!fullName || !province || !district || !city) {
                req.session.error = "All fields are required.";
                return res.redirect('/user/details');
            }


            // Ensure fullName is a string
            if (typeof fullName !== 'string') {
                req.session.error = "Invalid fullName provided.";
                return res.redirect('/user/details');
            }

            if (!user) {
                req.session.error = "User not found.";
                return res.redirect('/user/details');
            }

            // Check if no changes are detected
            if (
                fullName.trim() === user.fullName &&
                province === user.address.province &&
                district === user.address.district &&
                city.trim() === user.address.city &&
                !req.file
            ) {
                req.session.error = "No changes detected.";
                return res.redirect('/user/details');
            }

            let userImage = user.userImage;
            if (req.file) {
                const userImageFile = req.file;
                const userImageResult = await uploadInCloudinary(userImageFile.path);
                userImage = userImageResult.url;
            }

            const address = {
                province: province,
                district: district,
                city: city
            };

            const updatedProfile = await User.findByIdAndUpdate(userId, {
                fullName: fullName.trim(),
                address: address,
                userImage: userImage
            });
        }

        req.session.message = "User profile updated.";
        return res.redirect('/user/details');

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
const logoutUser = async (req, res) => {
    try {
        const message = "Logged out successfully."
        req.session.destroy();
        return res
            .clearCookie("sessionID")
            .redirect('/?message=' + encodeURIComponent(message));

    } catch (error) {
        console.error('Error logging out user:', error);
        return res.json({ error: 'Something went wrong' });
    }
};
const getUserEmail = async (req, res) => {
    try {
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        console.log('Received email:', email);
        const userDetails = await User.findOne({ email: email });
        const userId = userDetails._id;

        return res.status(200).json({
            message: 'Email received successfully',
            userId: userId.toString()
        });

    } catch (error) {
        console.log(error + "error while fetching email");
        return res.status(500).json({ message: "Server error" });
    }
}
const getUserLocation = async (req, res) => {
    try {
        const { userId, latitude, longitude } = req.body;

        if (!userId || latitude == null || longitude == null) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        console.log(latitude, " ", longitude)
        updateUserLocation(userId, latitude, longitude);
        return res.status(200).json({ message: 'Location received successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = { registerUser, loginUser, medicalDetails, updatePersonalDetails, logoutUser, getUserEmail, getUserLocation, loginAdmin };
