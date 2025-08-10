const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const FamilyMemberSchema = new Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    }
});

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        userImage: {
            type: String
        },
        address: {
            type: Object,
            required: true,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
        },
        contactNumber: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        lastDonationDate: {
            type: Date,
        },
        password: {
            type: String,
            required: true,
        },
        salt: {
            type: String,
        },
        disease: {
            type: String
        },
        bloodDetails: {
            type: Object
        },
        canDonate: {
            type: Boolean
        },
        canReceive: {
            type: Boolean
        },
        approved: {
            type: Boolean
        },
        location: {
            type: {
                latitude: {
                    type: Number,

                },
                longitude: {
                    type: Number,
                },
            },
        },
        familyMembers: [FamilyMemberSchema]
    },
    { timestamps: true }
);


userSchema.pre("save", async function (next) {
    try {
        if (!this.isModified('password')) {
            return next();  // password not changed, skip hashing
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        this.salt = salt;
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.statics.matchPasswordAndGenerateToken = async function (identifier, password) {
    let user
    if (identifier.includes("@")) {
        user = await this.findOne({ email: identifier });
    }
    else {
        user = await this.findOne({ contactNumber: identifier });
    }
    if (!user) {
        throw new Error("User not Registered")
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        return user;
    } else {
        throw new Error("Password doesn't match")
    }
};

const User = mongoose.model("User", userSchema);
module.exports = User;
