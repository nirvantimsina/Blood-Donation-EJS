const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});
const uploadInCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath)
            return null;
        const result = await cloudinary.uploader.upload(localFilePath, { resource_type: "image" });
        fs.unlinkSync(localFilePath);
        return result;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            console.log("Local file deleted due to error.");
        }
        return null;
    }
}
module.exports = { uploadInCloudinary };
