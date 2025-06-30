import express from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import Item from '../models/Item.js'
import { requireUser, requireUserAdmin } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'

const router = express.Router()

// Register as admin (one-time setup per user)
router.post('/register', requireUser, async (req, res) => {
  try {
    const user = req.user

    // Check if user already has admin access
    if (user.adminConfig.isAdmin) {
      return res.status(400).json({ message: 'Admin access already configured for this account' })
    }

    // Generate random admin password
    const adminPassword = crypto.randomBytes(8).toString('hex')

    user.adminConfig = {
      isAdmin: true,
      adminPassword: adminPassword,
      adminCreatedAt: new Date()
    }

    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Admin Access Created',
      'Your admin access has been set up successfully',
      'success'
    )

    res.json({
      message: 'Admin access created successfully',
      adminPassword: adminPassword
    })
  } catch (error) {
    console.error('Error creating admin access:', error)
    res.status(500).json({ message: 'Error creating admin access', error: error.message })
  }
})

// Login as admin
router.post('/login', requireUser, async (req, res) => {
  try {
    const { adminPassword } = req.body
    const user = req.user

    if (!user.adminConfig.isAdmin) {
      return res.status(400).json({ message: 'Admin access not configured for this account' })
    }

    const isMatch = await user.compareAdminPassword(adminPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin password' })
    }

    // Generate admin token
    const adminToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        type: 'user-admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Admin login successful',
      adminToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage,
        isAdmin: true
      }
    })
  } catch (error) {
    console.error('Error logging in as admin:', error)
    res.status(500).json({ message: 'Admin login failed', error: error.message })
  }
})

// Verify admin password (for re-authentication)
router.post('/verify-password', requireUser, async (req, res) => {
  try {
    const { adminPassword } = req.body
    const user = req.user

    if (!user.adminConfig.isAdmin) {
      return res.status(400).json({ message: 'Admin access not configured for this account' })
    }

    const isMatch = await user.compareAdminPassword(adminPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin password' })
    }

    res.json({
      message: 'Admin password verified successfully',
      verified: true
    })
  } catch (error) {
    console.error('Error verifying admin password:', error)
    res.status(500).json({ message: 'Error verifying admin password', error: error.message })
  }
})

// Change admin password
router.put('/change-password', requireUserAdmin, async (req, res) => {
  try {
    const { currentAdminPassword, newAdminPassword } = req.body
    const user = req.user

    // Verify current admin password
    const isMatch = await user.compareAdminPassword(currentAdminPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Current admin password is incorrect' })
    }

    if (newAdminPassword.length < 6) {
      return res.status(400).json({ message: 'New admin password must be at least 6 characters long' })
    }

    user.adminConfig.adminPassword = newAdminPassword
    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Admin Password Changed',
      'Your admin password has been changed successfully',
      'success'
    )

    res.json({ message: 'Admin password changed successfully' })
  } catch (error) {
    console.error('Error changing admin password:', error)
    res.status(500).json({ message: 'Error changing admin password', error: error.message })
  }
})

// Get admin dashboard stats
router.get('/dashboard', requireUserAdmin, async (req, res) => {
  try {
    const userId = req.user._id

    const [totalItems, paidItems, unpaidItems, pendingItems] = await Promise.all([
      Item.countDocuments({ userId, isDeleted: false }),
      Item.countDocuments({ userId, status: 'paid', isDeleted: false }),
      Item.countDocuments({ userId, status: 'unpaid', isDeleted: false }),
      Item.countDocuments({ userId, status: 'pending', isDeleted: false })
    ])

    // Get recent activity
    const recentItems = await Item.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)

    // Calculate revenue
    const revenueResult = await Item.aggregate([
      { $match: { userId, status: 'paid', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ])

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    res.json({
      stats: {
        totalItems,
        paidItems,
        unpaidItems,
        pendingItems,
        totalRevenue
      },
      recentItems
    })
  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message })
  }
})

// Admin: Get all items with advanced filtering
router.get('/items', requireUserAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query
    const userId = req.user._id
    
    const query = { userId, isDeleted: false }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ]
    }

    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

    const items = await Item.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Item.countDocuments(query)

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    })
  } catch (error) {
    console.error('Error fetching admin items:', error)
    res.status(500).json({ message: 'Error fetching items', error: error.message })
  }
})

// Admin: Update item
router.put('/items/:id', requireUserAdmin, async (req, res) => {
  try {
    const { name, description, price, status, category } = req.body
    const userId = req.user._id

    const item = await Item.findOne({
      _id: req.params.id,
      userId,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    // Update fields
    if (name) item.name = name
    if (description) item.description = description
    if (price) item.price = parseFloat(price)
    if (status) item.status = status
    if (category) item.category = category

    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      userId,
      'Item Updated by Admin',
      `Item "${item.name}" has been updated by admin`,
      'info'
    )

    res.json({
      message: 'Item updated successfully',
      item
    })
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ message: 'Error updating item', error: error.message })
  }
})

// Admin: Delete item
router.delete('/items/:id', requireUserAdmin, async (req, res) => {
  try {
    const userId = req.user._id

    const item = await Item.findOne({
      _id: req.params.id,
      userId,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    item.isDeleted = true
    item.deletedAt = new Date()
    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      userId,
      'Item Deleted by Admin',
      `Item "${item.name}" has been deleted by admin`,
      'warning'
    )

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ message: 'Error deleting item', error: error.message })
  }
})

export default router