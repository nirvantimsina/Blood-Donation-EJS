const Notification = require("../models/notification.model.js");
const getUnreadNotificationsCount = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user;
            const notifications = await Notification.find({ userId: userId }).exec();
            let unreadCount = 0;
            notifications.forEach(notification => {
                if (notification.messages) {
                    notification.messages.forEach(msg => {
                        if (msg.read==false && msg.removed==false){
                             unreadCount++;
                             }
                    });
                }
            });
            res.locals.unreadCount = unreadCount;
        } else {
            res.locals.unreadCount = 0; 
        }
        next(); 
    } catch (error) {
        console.error('Error fetching notifications count:', error);
        res.locals.unreadCount = 0; 
        next();
    }
};
const getUnreadRequestsCount = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user;
            const notifications = await Notification.find({ userId: userId }).exec();
            let unreadRequestCount = 0;
            notifications.forEach(notification => {
                if (notification.messages) {
                    notification.messages.forEach(msg => {
                        if (msg.type === "request" && (msg.status === "pending" || msg.status === "removed") && msg.acceptordecline == false) {
                            unreadRequestCount++;
                          }                          
                    });
                }
            });
            res.locals.unreadRequestCount = unreadRequestCount;
        } else {
            res.locals.unreadRequestCount = 0; 
        }
        next(); 
    } catch (error) {
        console.error('Error fetching notifications count:', error);
        res.locals.unreadRequestCount = 0; 
        next();
    }
};
module.exports={getUnreadNotificationsCount,getUnreadRequestsCount};