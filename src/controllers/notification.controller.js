const Notification = require("../models/notification.model.js");
const updateReadStatus = async (req, res) => {
    const { notificationId, messageId } = req.body;
    try {
        await Notification.updateOne(
            { _id: notificationId, 'messages.id': messageId },
            { $set: { 'messages.$.read': true } }
        );
        return res.redirect('/user/notifications');
    } catch (error) {
        console.error('Error updating read status:', error);
        return res.status(500).send('Internal Server Error');
    }
}
const updateUnreadStatus = async (req, res) => {
    const { notificationId, messageId } = req.body;
    try {
        await Notification.updateOne(
            { _id: notificationId, 'messages.id': messageId },
            { $set: { 'messages.$.read': false } }
        );
        return res.redirect('/user/notifications');
    } catch (error) {
        console.error('Error updating read status:', error);
        return res.status(500).send('Internal Server Error');
    }
}
const removeNotification = async (req, res) => {
    const { notificationId, messageId } = req.body;
    try {
        await Notification.updateOne(
            { _id: notificationId, 'messages.id': messageId },
            { $set: { 'messages.$.removed': true } }
        );
        return res.redirect('/user/notifications');
    } catch (error) {
        console.error('Error updating read status:', error);
        return res.status(500).send('Internal Server Error');
    }
}

module.exports = { updateReadStatus, removeNotification, updateUnreadStatus };