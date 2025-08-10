const User = require("../models/user.model.js");
const Notification = require("../models/notification.model.js");

const { extractTextFromImage } = require('./tessaract.js');
const { extractFromImage } = require('./geminiAI.js');
const nodemailer = require("nodemailer");
const { validateBloodDonationEligibility } = require('./diseaseValidate.js');

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
async function callLLM(prompt) {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer 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`,
            },
            body: JSON.stringify({
                model: "qwen/qwen-2.5-72b-instruct:free",
                messages: [
                    { role: "system", content: "You are a helpful assistant that extracts data from text." },
                    { role: "user", content: prompt }
                ],
                temperature: 0,
            }),
        });

        const data = await response.json();
        console.log(data);
        return data.choices[0].message.content;
    } catch (error) {
        console.log(error)
    }
}


// const bloodGroupValidation = async (userId) => {
//     try {
//         const user = await User.findById(userId)
//         const { bloodGroupImage, bloodGroupType } = user.bloodDetails
//         const userName = user.fullName.toLowerCase()
//         const userDisease = user.disease
//         const email = user.email

//         const extractedText = await extractTextFromImage(bloodGroupImage);

//         if (!extractedText) {
//             throw new Error('Text extraction from image failed');
//         }

//         let aiResponse;
//         for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//             try {
//                 aiResponse = await geminiResponse(` 
//                     Extract the name and blood group type from the following text:
//                     Text: "${extractedText}"
//                     Name:
//                     Blood Group Type:
//                     convert the name into lowercase and Compare the extracted name with "${userName}" (ignoring spaces and case differences).
//                     Normalize the extracted blood group type by considering 0 and O as the same and 8 and B as the same, but treating '+' and '-' as different.
//                     Compare the normalized blood group type with "${bloodGroupType}".
//                     Return one of the following based on the comparison:
//                     - "both matches" if both the name and blood group type match.
//                     - "only name matches" if only the name matches.
//                     - "only blood group matches" if only the blood group type matches.
//                     - "neither matches" if neither the name nor the blood group type matches.
//                     - "null" if the text extracted is gibberish, empty, or ununderstandable.
//                 `);
//                 break;
//             } catch (error) {
//                 if (error.status === 503 && attempt < MAX_RETRIES) {
//                     console.log(`Attempt ${attempt} failed. Retrying in ${RETRY_DELAY / 1000} seconds...`);
//                     await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
//                 } else {
//                     throw error;
//                 }
//             }
//         }

//         const secondAiResponse = await geminiResponse(`
//             Extract the result from the following text:
//             Text: "${aiResponse}"
//             Result:
//              Return only the result text, such as "both matches", "only name matches", "only blood group matches", "neither matches", or "null".
//         `);

//         const result = secondAiResponse.trim().toLowerCase();
//         console.log(result)
//         let emailBody = null;
//         if (result === "null") {
//             emailBody = `Dear ${user.fullName}, We have received all the medical details. It may take some time to validate your details.<br>Thank you for your patience.`;
//             // //this will go for admin's manual approval

//         } else {

//             emailBody = await handleNoEligibility(result, userDisease, user, userId);

//             if (!emailBody && userDisease !== 'None') {
//                 const eligibility = validateBloodDonationEligibility(userDisease);
//                 if (eligibility) {
//                     emailBody = await handleEligibility(result, eligibility, userDisease, user);
//                     await User.findByIdAndUpdate(userId, { approved: true }, { new: true });
//                 } else {
//                     emailBody = `Dear ${user.fullName},<br>We have received all the medical details. It may take some time to validate your details.<br>Thank you for your patience.`;
//                     //this will go for admin's manual approval where the disease is unknown

//                 }
//             }
//         }
//         if (emailBody) {
//             const subject = "Blood Group Verification"
//             await sendEMail(email, emailBody, subject)
//         }
//     } catch (error) {
//         console.log('Error:', error.message);
//     }
// };


const bloodGroupValidation = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        const { bloodGroupImage, bloodGroupType } = user.bloodDetails || {};
        if (!bloodGroupImage || !bloodGroupType) throw new Error("User blood details incomplete");

        const userName = user.fullName.toLowerCase().replace(/\s+/g, "");
        const userDisease = user.disease || "None";
        const email = user.email;

        // Step 1: OCR - extract text from blood group image
        const extractedText = await extractTextFromImage(bloodGroupImage);
        if (!extractedText) throw new Error("Text extraction from image failed");

        // Step 2: Call AI with retry logic
        let aiResponse = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const prompt = `
Extract the name and blood group type from the following text:
Text: """${extractedText}"""

Name:
Blood Group Type:

Compare the extracted name (lowercased, no spaces) with "${userName}".
Normalize blood groups considering '0' and 'O' as same, '8' and 'B' as same, but '+' and '-' distinct.
Compare normalized blood group type with "${bloodGroupType}".
Return one of:
- both matches
- only name matches
- only blood group matches
- neither matches
- null if text is gibberish or unrecognizable.
        `;
                aiResponse = await callLLM(prompt);
                break; // success
            } catch (error) {
                if (attempt < MAX_RETRIES) {
                    console.log(`Attempt ${attempt} failed, retrying after ${RETRY_DELAY} ms...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                } else {
                    throw error;
                }
            }
        }

        if (!aiResponse) throw new Error("AI did not return a response");

        // Step 3: Extract final result from AI response (in case nested response)
        const resultPrompt = `
Extract the result from the following text:
Text: """${aiResponse}"""
Result:
Return only one of: both matches, only name matches, only blood group matches, neither matches, null.
    `;
        const secondAiResponse = await callLLM(resultPrompt);
        const result = secondAiResponse.trim().toLowerCase();

        console.log("Validation result:", result);

        // Step 4: Based on result, prepare email body
        let emailBody = null;

        if (result === "null") {
            emailBody = `Dear ${user.fullName}, We have received all your medical details. It may take some time to validate your details.<br>Thank you for your patience.`;
            // Optionally send to admin for manual approval
        } else {
            emailBody = await handleNoEligibility(result, userDisease, user, userId);

            if (!emailBody && userDisease !== "None") {
                const eligibility = validateBloodDonationEligibility(userDisease);
                if (eligibility) {
                    emailBody = await handleEligibility(result, eligibility, userDisease, user);
                    await User.findByIdAndUpdate(userId, { approved: true }, { new: true });
                } else {
                    emailBody = `Dear ${user.fullName},<br>We have received all your medical details. It may take some time to validate your details.<br>Thank you for your patience.`;
                    // send for manual approval in case of unknown disease
                }
            }
        }

        if (emailBody) {
            const subject = "Blood Group Verification";
            await sendEMail(email, emailBody, subject);
        }

    } catch (error) {
        console.error("Error in bloodGroupValidation:", error.message);
        throw error;
    }
};
const handleNoEligibility = async (result, userDisease, user, userId) => {
    let emailBody = null;
    switch (result) {
        case "both matches":
            if (userDisease === 'None') {
                await User.findByIdAndUpdate(userId, { approved: true, canDonate: true, canReceive: true }, { new: true });
                emailBody = `Dear ${user.fullName},

Congratulations! We are pleased to inform you that you are eligible to both donate and receive blood. Thank you for your willingness to contribute to our life-saving mission.`;
            }
            break;
        case "only name matches":
            emailBody = `Dear ${user.fullName},

Thank you for submitting your blood group card. Unfortunately, the blood group type on the card does not match the blood group type you provided during registration. For your safety and to ensure accurate matching, both blood group types must be identical. Please recheck and submit the correct blood group information.`;
            break;
        case "only blood group matches":
            emailBody = `Dear ${user.fullName},

Thank you for submitting your blood group card. We noticed that the name on the card does not match the name you registered with on our website. Please update your profile with your official name or provide a blood group card that matches your registered name to proceed with donating or receiving blood.`;
            break;
        case "neither matches":
            emailBody = `Dear ${user.fullName},

We have reviewed the blood group card you provided, and unfortunately, both the name and blood group type do not match the details you registered with. Please ensure that the blood group card contains your registered name and the correct blood group type to proceed with your registration.`;
            break;
    }
    return emailBody;
};

const handleEligibility = async (eligibility, userDisease, user) => {
    let emailBody = null;
    const { canDonate, canReceive } = eligibility;

    if (canDonate && canReceive) {
        emailBody = `Dear ${user.fullName},

Despite your medical condition (${userDisease}), we are pleased to inform you that you are eligible to both donate and receive blood. Thank you for your willingness to contribute to our life-saving mission.`;

    } else if (canDonate && !canReceive) {
        emailBody = `Dear ${user.fullName},

Due to your medical condition (${userDisease}), you are eligible to donate blood but unfortunately, you cannot receive blood. We appreciate your understanding and your contribution to our life-saving mission.`;

    } else if (!canDonate && canReceive) {
        emailBody = `Dear ${user.fullName},

Due to your medical condition (${userDisease}), you are not eligible to donate blood but you may still be able to receive blood if needed. We appreciate your understanding and are here to support you.`;

    } else if (!canDonate && !canReceive) {
        emailBody = `Dear ${user.fullName},

Unfortunately, due to your medical condition (${userDisease}), you are neither eligible to donate blood nor to receive blood through our platform. We recommend consulting with a medical professional for further guidance and support.`;
    }

    // ✅ Update the user in DB
    await user.updateOne({
        canDonate: canDonate,
        canReceive: canReceive
    });

    return emailBody;
};

const sendEMail = async (email, emailBody, subject) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: process.env.APP_PORT,
            secure: true,
            requireTLS: true,
            auth: {
                user: process.env.APP_EMAIL,
                pass: process.env.APP_PASSWORD
            }
        });

        const mailOptions = {
            from: `"Blood Donor Nepal" <blooddonornepal@gmail.com>`,
            to: email,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6; background-color: #f0f0f0; padding: 30px 0;">
            <div style="background-color: #e2e0e0; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 5px; text-align: center;">
                <header style="padding: 20px 0;">
                    <img src="${process.env.DOMAIN}/images/blood-donor.png" alt="Blood Donor Nepal Logo" style="width: 150px; margin-bottom: 20px;">
                    <h1 style="color: #D32F2F; margin: 0;">Blood Donor Nepal</h1>
                </header>
                <main style="background: #f7f7f7; padding: 20px; border-radius: 10px;">
                    <p>${emailBody}</p>
                </main>
                <footer style="margin-top: 20px; text-align: center; color: #777;">
                    <p>Best regards,<br><span style="color: #D32F2F; font-weight: bold;">Blood Donor Nepal Team</span></p>
                    <p style="font-size: 14px;">This email was sent to you by Blood Donor Nepal. If you have any questions, please contact us at <a href="mailto:blooddonornepal@gmail.com" style="color: #D32F2F;">blooddonornepal@gmail.com</a>.</p>
                </footer>
            </div>
        </div>
        `
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error)
            }
            else {
                console.log('Email sent: ' + info.response);
            }
        })
    }
    catch (error) {
        console.log(error)
    }
}
const searchFamilyMembers = async (req, res) => {
    try {
        const query = req.query.q;
        const userId = req.session.user;

        if (!query) {
            return res.status(400).json({ message: 'Query is required' });
        }

        const user = await User.findById(userId);
        const familyMemberIds = user.familyMembers.map(member => member.memberId.toString());

        const users = await User.find({
            fullName: { $regex: query, $options: 'i' },
            _id: { $ne: userId, $nin: familyMemberIds },
            approved: true
        })
            .limit(10)
            .select("fullName userImage address gender contactNumber disease bloodDetails ") // Include only required fields
            .lean();

        return res.json(users);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}



const familyMembersDetails = async (req, res) => {
    try {
        const { userIds } = req.body;
        const senderId = req.session.user;
        const user = await User.findById(senderId)
        const senderName = user.fullName;
        const senderAddress = user.address.city + ", " + user.address.district + ", " + user.address.province;
        if (userIds) {
            const userIdArray = userIds.split(',');
            for (const userId of userIdArray) {
                let user = await User.findById(userId);
                let email = user.email
                let name = user.fullName
                const emailBody = `
                Dear ${name},<p>You have received a family member request from ${senderName} who lives in ${senderAddress}. If you recognize him/her as your family member
                you can approve him/her as your family members, But if you don't recognize him/her to be part of your family you can decline their request.</p><a href="${process.env.DOMAIN}user/familymember/${userId}">Click here to approve or decline the request.</a>`
                const subject = "Family Member Request"
                //sendEMail(email, emailBody, subject);
                let newMessage = {
                    type: 'request',
                    title: subject,
                    status: "pending",
                    message: `You have received a family member request from ${senderName} who lives in ${senderAddress}. If you recognize him/her as your family member
                you can approve him/her as your family members, But if you don't recognize him/her to be part of your family you can decline their request.  <a href=${process.env.DOMAIN}user/familymember-request>Click here to approve or decline the request</a> 
                `,
                    acceptordecline: false,
                    senderId: senderId
                }
                saveNotification(newMessage, userId)

            };

        }
        req.session.message = "Family request sent successfully."
        return res.redirect('/user/familymembers')
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error." });
    }
}
const saveNotification = async (newMessage, userId) => {
    try {
        let notification = await Notification.findOne({ userId });
        let newMessageId;
        if (notification) {
            newMessageId = `message${notification.messages.length + 1}`;
        } else {
            newMessageId = `message1`;
        }
        const result = await Notification.findOneAndUpdate(
            { userId: userId },
            {
                $push: {
                    messages: {
                        id: newMessageId,
                        sender_id: newMessage.senderId,
                        type: newMessage.type,
                        title: newMessage.title,
                        status: newMessage.status,
                        message: newMessage.message,
                        acceptordecline: newMessage.acceptordecline,
                        createdAt: new Date(),
                        read: false
                    }
                }
            },
            {
                new: true,
                upsert: true
            }
        );
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Internal server error." });
    }
}
const addFamilyMember = async (senderId, receiverId) => {
    try {
        const receiver = await User.findById(receiverId);
        //console.log(receiver)
        if (!receiver) {
            console.log("receiver not found")
        }

        const updateResult = await User.findByIdAndUpdate(
            senderId,
            {
                $addToSet: {
                    familyMembers: {
                        memberId: receiver._id,
                        name: receiver.fullName,
                    }
                }
            }
        );
        if (!updateResult) {
            throw new Error('Sender not found or update failed');
        }

        // console.log(`Successfully added ${receiver.fullName} as a family member to the sender.`);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const handleRequestStatus = async (req, res) => {
    const { notificationId, messageId, action } = req.body;
    const Action = action.toLowerCase();
    const userId = req.session.user;
    const user = await User.findById(userId)

    try {
        await Notification.updateOne(
            { _id: notificationId, 'messages.id': messageId },
            { $set: { 'messages.$.acceptordecline': true, 'messages.$.status': Action } }
        );

        if (Action === "accept") {
            const notification = await Notification.findOne({ _id: notificationId });

            if (!notification) {
                throw new Error("Notification not found.");
            }

            const message = notification.messages.find(m => m.id === messageId);
            if (!message) {
                throw new Error("Message not found.");
            }

            const senderId = message.sender_id;

            if (!senderId) {
                throw new Error("Sender ID not found.");
            }

            await addFamilyMember(senderId, userId);
            await addFamilyMember(userId, senderId);

            const newMessage = {
                type: 'info',
                title: "Request Accepted",
                status: "accept",
                message: `${user.fullName} has accepted your request and is now added as your family member.<a href=${process.env.DOMAIN}user/familymembers>Click here to view your family members</a>`,
                acceptordecline: true,
                senderId: userId
            };

            await saveNotification(newMessage, senderId);
        }
        if (Action === "decline") {
            const notification = await Notification.findOne({ _id: notificationId });

            if (!notification) {
                throw new Error("Notification not found.");
            }

            const message = notification.messages.find(m => m.id === messageId);
            if (!message) {
                throw new Error("Message not found.");
            }

            const senderId = message.sender_id;

            if (!senderId) {
                throw new Error("Sender ID not found.");
            }

            const newMessage = {
                type: 'info',
                title: "Request Declined",
                status: "decline",
                message: `${user.fullName} has declined your request.`,
                acceptordecline: true,
                senderId: userId
            };

            await saveNotification(newMessage, senderId);
        }

        return res.redirect("/user/familymember-request");
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

const removeFamilyMembers = async (req, res) => {
    try {
        const { memberId } = req.body;
        const userId = req.session.user;

        if (!memberId) {
            throw new Error("Member ID is required.");
        }

        const member = await User.findById(memberId);
        const user = await User.findById(userId);

        if (!member || !user) {
            return res.status(404).json({ message: 'User or family member not found.' });
        }

        const senderName = user.fullName;
        const senderAddress = user.address.city + ", " + user.address.district + ", " + user.address.province;

        const result = await User.updateOne(
            { _id: userId },
            { $pull: { familyMembers: { memberId } } }
        );

        const result2 = await User.updateOne(
            { _id: memberId },
            { $pull: { familyMembers: { memberId: userId } } }
        );

        if (result.modifiedCount === 0 || result2.modifiedCount === 0) {
            return res.status(404).json({ message: 'Family member not found or already removed.' });
        }

        let newMessage = {
            type: 'info',
            title: 'Removed from family member',
            status: 'others',
            message: `You have been removed from family member by ${senderName} who lives in ${senderAddress}.`,
            senderId: userId
        };

        saveNotification(newMessage, memberId);

        return res.redirect("/user/familymembers");

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "An error occurred while removing the family member." });
    }
};
const updateUserLocation = async (userId, latitude, longitude) => {
    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Update only the location fields
        user.location = {
            latitude,
            longitude,
        };

        // Save changes
        await user.save();

        return {
            success: true,
            message: "Location updated successfully",
            location: user.location,
        };
    } catch (error) {
        console.error("Error updating location:", error);
        return {
            success: false,
            message: error.message || "Failed to update location",
        };
    }
};



module.exports = { bloodGroupValidation, searchFamilyMembers, familyMembersDetails, handleRequestStatus, saveNotification, removeFamilyMembers, updateUserLocation, sendEMail };
