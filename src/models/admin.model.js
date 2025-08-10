const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const adminSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        salt: {
            type: String,
        },
    },
    { timestamps: true }
);


adminSchema.pre("save", async function (next) {
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

adminSchema.statics.matchPasswordAndGenerateToken = async function (email, password) {
    let admin
    if (email) {
        admin = await this.findOne({ email: email });
    }
    if (!admin) {
        throw new Error("Admin not Registered")
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (isMatch) {
        return admin;
    } else {
        throw new Error("Password doesn't match")
    }
};

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
