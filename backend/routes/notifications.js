import express from 'express'
import Notification from '../models/Notification.js'
import { requireUser } from '../middleware/auth.js'

const router = express.Router()

// Get user notifications
router.get('/', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query
    const query = { userId: req.user._id }

    if (unreadOnly === 'true') {
      query.read = false
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      read: false 
    })

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ message: 'Error fetching notifications', error: error.message })
  }
})

// Mark notification as read
router.patch('/:id/read', requireUser, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    notification.read = true
    await notification.save()

    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ message: 'Error updating notification', error: error.message })
  }
})

// Mark all notifications as read
router.patch('/mark-all-read', requireUser, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    )

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ message: 'Error updating notifications', error: error.message })
  }
})

// Delete notification
router.delete('/:id', requireUser, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    })

    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ message: 'Error deleting notification', error: error.message })
  }
})

export default router