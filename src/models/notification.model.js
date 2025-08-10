const mongoose = require('mongoose');
const { Schema } = mongoose;


const MessageSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  sender_id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['request', 'advertisement', 'info', 'other'], 
    required: true
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accept', 'decline','others'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  acceptordecline: {
    type: Boolean,
    default: false
  },
  removed:{
    type:Boolean,
    default:false
  }
});

const NotificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [MessageSchema]
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
