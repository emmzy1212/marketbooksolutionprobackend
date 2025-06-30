import Notification from '../models/Notification.js'

export const createNotification = async (userId, title, message, type = 'info', data = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      data
    })
    
    await notification.save()
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export const sendSocketNotification = (io, userId, notification) => {
  io.to(userId.toString()).emit('notification', {
    id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    timestamp: notification.createdAt
  })
}

export const notifyUser = async (io, userId, title, message, type = 'info', data = null) => {
  try {
    const notification = await createNotification(userId, title, message, type, data)
    sendSocketNotification(io, userId, notification)
    return notification
  } catch (error) {
    console.error('Error notifying user:', error)
    throw error
  }
}