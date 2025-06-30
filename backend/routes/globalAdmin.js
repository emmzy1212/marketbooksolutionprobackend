import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import GlobalAdmin from '../models/GlobalAdmin.js'
import User from '../models/User.js'
import Item from '../models/Item.js'
import Ticket from '../models/Ticket.js'
import PublicSupportTicket from '../models/PublicSupportTicket.js'
import Advertisement from '../models/Advertisement.js'
import EscrowTicket from '../models/EscrowTicket.js'
import { authenticateToken, requireGlobalAdmin } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'
import { sendPasswordResetEmail } from '../utils/email.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

const router = express.Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image and video files are allowed'), false)
    }
  }
})

// Initialize global admin (run once)
router.post('/initialize', async (req, res) => {
  try {
    const existingAdmin = await GlobalAdmin.findOne()
    if (existingAdmin) {
      return res.status(400).json({ message: 'Global admin already exists' })
    }

    const admin = new GlobalAdmin({
      email: process.env.GLOBAL_ADMIN_EMAIL || 'admin@marketbook.com',
      password: process.env.GLOBAL_ADMIN_PASSWORD || 'admin123456',
      isOriginal: true
    })

    await admin.save()
    res.json({ message: 'Global admin initialized successfully' })
  } catch (error) {
    console.error('Error initializing global admin:', error)
    res.status(500).json({ message: 'Error initializing global admin', error: error.message })
  }
})

// Global admin login - ENHANCED
router.post('/login', async (req, res) => {
  try {
    const { email, password, resetCode } = req.body

    console.log('Global admin login attempt:', { email, hasResetCode: !!resetCode })

    let admin = await GlobalAdmin.findOne({ email })
    
    // If no admin exists and this is the main admin email, create one
    if (!admin && email === (process.env.GLOBAL_ADMIN_EMAIL || 'admin@marketbook.com')) {
      console.log('Creating original global admin...')
      admin = new GlobalAdmin({
        email: email,
        password: process.env.GLOBAL_ADMIN_PASSWORD || 'admin123456',
        isOriginal: true
      })
      await admin.save()
      console.log('Original global admin created')
    }

    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Handle reset code
    if (resetCode) {
      if (resetCode !== admin.resetCode) {
        return res.status(400).json({ message: 'Invalid reset code' })
      }
      
      // Reset password to default
      admin.password = process.env.GLOBAL_ADMIN_PASSWORD || 'admin123456'
      admin.loginAttempts = 0
      admin.lockUntil = null
      await admin.save()
      
      return res.json({ message: 'Password reset successfully. Please login with the default password.' })
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({ 
        message: 'Account is locked due to too many failed attempts. Use reset code 3237 to unlock.' 
      })
    }

    // Verify password
    const isMatch = await admin.comparePassword(password)
    if (!isMatch) {
      await admin.incLoginAttempts()
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts()
    admin.lastLogin = new Date()
    await admin.save()

    console.log('Global admin login successful:', { 
      adminId: admin._id, 
      email: admin.email, 
      isOriginal: admin.isOriginal 
    })

    // Generate token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email,
        type: 'global-admin',
        isOriginal: admin.isOriginal
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        lastLogin: admin.lastLogin,
        isOriginal: admin.isOriginal
      }
    })
  } catch (error) {
    console.error('Global admin login error:', error)
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// Get global admin profile
router.get('/profile', authenticateToken, requireGlobalAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.globalAdmin._id,
      email: req.globalAdmin.email,
      lastLogin: req.globalAdmin.lastLogin,
      isOriginal: req.globalAdmin.isOriginal
    }
  })
})

// Create new global admin (only original admin can do this) - FIXED
router.post('/create-admin', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { email, password } = req.body
    
    console.log('Create admin request:', { 
      requestingAdminId: req.globalAdmin._id,
      requestingAdminEmail: req.globalAdmin.email,
      requestingAdminIsOriginal: req.globalAdmin.isOriginal,
      targetEmail: email 
    })
    
    // CRITICAL: Check if current admin is original
    if (!req.globalAdmin.isOriginal) {
      console.log('Access denied: Not original admin')
      return res.status(403).json({ 
        message: 'Only the original Global Admin can create new admins',
        currentAdmin: {
          email: req.globalAdmin.email,
          isOriginal: req.globalAdmin.isOriginal
        }
      })
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }

    // Check if admin with email already exists
    const existingAdmin = await GlobalAdmin.findOne({ email })
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' })
    }

    console.log('Creating new global admin...')

    const newAdmin = new GlobalAdmin({
      email: email.trim(),
      password: password,
      createdBy: req.globalAdmin._id,
      isOriginal: false
    })

    await newAdmin.save()

    console.log('New global admin created:', { 
      id: newAdmin._id, 
      email: newAdmin.email,
      createdBy: req.globalAdmin._id 
    })

    res.json({
      message: 'Global admin created successfully',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        createdBy: req.globalAdmin._id,
        isOriginal: false,
        createdAt: newAdmin.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating global admin:', error)
    res.status(500).json({ message: 'Error creating global admin', error: error.message })
  }
})

// Get all global admins (only original admin can see this) - ENHANCED
router.get('/admins', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    console.log('Fetch admins request:', { 
      requestingAdminId: req.globalAdmin._id,
      requestingAdminEmail: req.globalAdmin.email,
      requestingAdminIsOriginal: req.globalAdmin.isOriginal
    })

    if (!req.globalAdmin.isOriginal) {
      return res.status(403).json({ 
        message: 'Only the original Global Admin can view all admins',
        currentAdmin: {
          email: req.globalAdmin.email,
          isOriginal: req.globalAdmin.isOriginal
        }
      })
    }

    const admins = await GlobalAdmin.find()
      .select('-password -resetCode')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })

    console.log(`Found ${admins.length} global admins`)

    res.json({ admins })
  } catch (error) {
    console.error('Error fetching global admins:', error)
    res.status(500).json({ message: 'Error fetching global admins', error: error.message })
  }
})

// Revoke global admin (only original admin can do this) - ENHANCED
router.delete('/admins/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const targetAdminId = req.params.id
    
    console.log('Delete admin request:', { 
      requestingAdminId: req.globalAdmin._id,
      requestingAdminEmail: req.globalAdmin.email,
      requestingAdminIsOriginal: req.globalAdmin.isOriginal,
      targetAdminId 
    })

    const targetAdmin = await GlobalAdmin.findById(targetAdminId)
    
    if (!targetAdmin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Prevent deletion of original admin
    if (targetAdmin.isOriginal) {
      return res.status(403).json({ message: 'Cannot delete the original Global Admin' })
    }

    // Only original admin can delete other admins
    if (!req.globalAdmin.isOriginal) {
      return res.status(403).json({ 
        message: 'Only the original Global Admin can delete other admins',
        currentAdmin: {
          email: req.globalAdmin.email,
          isOriginal: req.globalAdmin.isOriginal
        }
      })
    }

    await GlobalAdmin.findByIdAndDelete(targetAdminId)

    console.log('Global admin deleted:', { deletedAdminId: targetAdminId, deletedBy: req.globalAdmin.email })

    res.json({ message: 'Global admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting global admin:', error)
    res.status(500).json({ message: 'Error deleting global admin', error: error.message })
  }
})

// Reset user admin password
router.post('/reset-user-password/:userId', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (!user.adminConfig.isAdmin) {
      return res.status(400).json({ message: 'User is not an admin' })
    }

    // Generate new admin password
    const newAdminPassword = crypto.randomBytes(8).toString('hex')
    
    user.adminConfig.adminPassword = newAdminPassword
    await user.save()

    // Send email with new password
    await sendPasswordResetEmail(user.email, null, {
      type: 'admin-password-reset',
      newPassword: newAdminPassword,
      userName: `${user.firstName} ${user.lastName}`
    })

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Admin Password Reset',
      'Your admin password has been reset by Global Admin. Check your email for the new password.',
      'info'
    )

    res.json({ 
      message: 'Admin password reset successfully',
      newPassword: newAdminPassword // Only for immediate display
    })
  } catch (error) {
    console.error('Error resetting user admin password:', error)
    res.status(500).json({ message: 'Error resetting admin password', error: error.message })
  }
})

// Get dashboard statistics - ENHANCED
router.get('/dashboard', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    console.log('Fetching global admin dashboard data...')
    
    // Use Promise.allSettled to handle individual query failures gracefully
    const results = await Promise.allSettled([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, isActive: true }),
      Item.countDocuments({ isDeleted: false }),
      Ticket.countDocuments({ isDeleted: false }),
      Ticket.countDocuments({ isDeleted: false, status: { $in: ['open', 'in-progress'] } }),
      PublicSupportTicket.countDocuments({ isDeleted: false }),
      PublicSupportTicket.countDocuments({ isDeleted: false, status: { $in: ['open', 'in-progress'] } }),
      EscrowTicket.countDocuments({ isDeleted: false }),
      EscrowTicket.countDocuments({ isDeleted: false, status: { $in: ['pending', 'active'] } }),
      Item.aggregate([
        { $match: { status: 'paid', isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ])

    // Extract results with fallbacks
    const [
      totalUsersResult,
      activeUsersResult,
      totalItemsResult,
      totalTicketsResult,
      openTicketsResult,
      totalPublicTicketsResult,
      openPublicTicketsResult,
      totalEscrowTicketsResult,
      activeEscrowTicketsResult,
      revenueResult
    ] = results

    const stats = {
      totalUsers: totalUsersResult.status === 'fulfilled' ? totalUsersResult.value : 0,
      activeUsers: activeUsersResult.status === 'fulfilled' ? activeUsersResult.value : 0,
      totalItems: totalItemsResult.status === 'fulfilled' ? totalItemsResult.value : 0,
      totalTickets: (totalTicketsResult.status === 'fulfilled' ? totalTicketsResult.value : 0) + 
                   (totalPublicTicketsResult.status === 'fulfilled' ? totalPublicTicketsResult.value : 0),
      openTickets: (openTicketsResult.status === 'fulfilled' ? openTicketsResult.value : 0) + 
                   (openPublicTicketsResult.status === 'fulfilled' ? openPublicTicketsResult.value : 0),
      totalEscrowTickets: totalEscrowTicketsResult.status === 'fulfilled' ? totalEscrowTicketsResult.value : 0,
      activeEscrowTickets: activeEscrowTicketsResult.status === 'fulfilled' ? activeEscrowTicketsResult.value : 0,
      totalRevenue: revenueResult.status === 'fulfilled' && revenueResult.value.length > 0 
        ? revenueResult.value[0].total : 0
    }

    console.log('Dashboard stats calculated:', stats)

    // Get recent activity with error handling
    let recentUsers = []
    let recentTickets = []

    try {
      recentUsers = await User.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email createdAt isActive')
    } catch (error) {
      console.error('Error fetching recent users:', error)
    }

    try {
      // Combine user tickets and public tickets
      const [userTickets, publicTickets] = await Promise.all([
        Ticket.find({ isDeleted: false })
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .limit(3),
        PublicSupportTicket.find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(3)
      ])

      // Format tickets for consistent display
      const formattedUserTickets = userTickets.map(ticket => ({
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
        type: 'user',
        user: ticket.userId ? {
          firstName: ticket.userId.firstName,
          lastName: ticket.userId.lastName,
          email: ticket.userId.email
        } : null
      }))

      const formattedPublicTickets = publicTickets.map(ticket => ({
        _id: ticket._id,
        subject: `Public Support: ${ticket.message.substring(0, 50)}...`,
        status: ticket.status,
        createdAt: ticket.createdAt,
        type: 'public',
        user: {
          firstName: ticket.name,
          lastName: '',
          email: ticket.email
        }
      }))

      // Combine and sort by creation date
      recentTickets = [...formattedUserTickets, ...formattedPublicTickets]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)

    } catch (error) {
      console.error('Error fetching recent tickets:', error)
    }

    console.log('Dashboard data fetched successfully')

    res.json({
      stats,
      recentUsers,
      recentTickets
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    res.status(500).json({ 
      message: 'Error fetching dashboard data', 
      error: error.message,
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        totalItems: 0,
        totalTickets: 0,
        openTickets: 0,
        totalEscrowTickets: 0,
        activeEscrowTickets: 0,
        totalRevenue: 0
      },
      recentUsers: [],
      recentTickets: []
    })
  }
})

// Get all users with pagination
router.get('/users', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query
    const query = { isDeleted: false }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    if (status === 'active') {
      query.isActive = true
    } else if (status === 'inactive') {
      query.isActive = false
    }

    const users = await User.find(query)
      .select('-password -emailConfirmToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Error fetching users', error: error.message })
  }
})

// Toggle user status (enable/disable)
router.patch('/users/:id/toggle-status', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.isActive = !user.isActive
    await user.save()

    // Send notification to user
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      user.isActive ? 'Account Enabled' : 'Account Disabled',
      user.isActive ? 'Your account has been enabled by admin' : 'Your account has been disabled by admin',
      user.isActive ? 'success' : 'warning'
    )

    res.json({
      message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive
      }
    })
  } catch (error) {
    console.error('Error toggling user status:', error)
    res.status(500).json({ message: 'Error updating user status', error: error.message })
  }
})

// Toggle user recommendation status
router.patch('/users/:id/toggle-recommendation', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.isRecommended = !user.isRecommended
    await user.save()

    res.json({
      message: `User ${user.isRecommended ? 'marked as recommended' : 'removed from recommended'} successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isRecommended: user.isRecommended
      }
    })
  } catch (error) {
    console.error('Error toggling user recommendation:', error)
    res.status(500).json({ message: 'Error updating user recommendation', error: error.message })
  }
})

// Soft delete user
router.delete('/users/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.isDeleted = true
    user.deletedAt = new Date()
    user.isActive = false
    await user.save()

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ message: 'Error deleting user', error: error.message })
  }
})

// Recover deleted user
router.patch('/users/:id/recover', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.isDeleted = false
    user.deletedAt = null
    user.isActive = true
    await user.save()

    // Send notification to user
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Account Recovered',
      'Your account has been recovered by admin',
      'success'
    )

    res.json({ message: 'User recovered successfully' })
  } catch (error) {
    console.error('Error recovering user:', error)
    res.status(500).json({ message: 'Error recovering user', error: error.message })
  }
})

// Get all tickets (both user and public) - ENHANCED WITH PERMISSION CHECK
router.get('/tickets', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    console.log('Fetching tickets for global admin...')
    
    const { page = 1, limit = 20, status, type } = req.query
    let tickets = []

    try {
      // Fetch user tickets
      if (!type || type === 'user') {
        const userTicketQuery = { isDeleted: false }
        if (status && status !== 'all') {
          userTicketQuery.status = status
        }

        const userTickets = await Ticket.find(userTicketQuery)
          .populate({
            path: 'userId',
            select: 'firstName lastName email',
            match: { isDeleted: false }
          })
          .sort({ lastReply: -1 })
          .lean()

        // Format user tickets
        const formattedUserTickets = userTickets
          .filter(ticket => ticket.userId !== null)
          .map(ticket => ({
            ...ticket,
            type: 'user',
            displayName: `${ticket.userId.firstName} ${ticket.userId.lastName}`,
            displayEmail: ticket.userId.email
          }))

        tickets = [...tickets, ...formattedUserTickets]
      }

      // Fetch public support tickets
      if (!type || type === 'public') {
        const publicTicketQuery = { isDeleted: false }
        if (status && status !== 'all') {
          publicTicketQuery.status = status
        }

        const publicTickets = await PublicSupportTicket.find(publicTicketQuery)
          .sort({ createdAt: -1 })
          .lean()

        // Format public tickets to match user ticket structure
        const formattedPublicTickets = publicTickets.map(ticket => ({
          _id: ticket._id,
          subject: `Public Support: ${ticket.message.substring(0, 50)}${ticket.message.length > 50 ? '...' : ''}`,
          description: ticket.message,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          createdAt: ticket.createdAt,
          lastReply: ticket.lastResponseAt || ticket.createdAt,
          type: 'public',
          displayName: ticket.name,
          displayEmail: ticket.email,
          responses: ticket.responses || [],
          source: ticket.source
        }))

        tickets = [...tickets, ...formattedPublicTickets]
      }

      // Sort all tickets by lastReply/createdAt
      tickets.sort((a, b) => {
        const aDate = new Date(a.lastReply || a.createdAt)
        const bDate = new Date(b.lastReply || b.createdAt)
        return bDate - aDate
      })

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + parseInt(limit)
      const paginatedTickets = tickets.slice(startIndex, endIndex)

      console.log(`Found ${tickets.length} total tickets, returning ${paginatedTickets.length}`)

      res.json({
        tickets: paginatedTickets,
        totalPages: Math.ceil(tickets.length / limit),
        currentPage: parseInt(page),
        total: tickets.length
      })

    } catch (error) {
      console.error('Error in ticket fetching:', error)
      throw error
    }

  } catch (error) {
    console.error('Error fetching tickets:', error)
    res.status(500).json({ 
      message: 'Error fetching tickets', 
      error: error.message,
      tickets: [],
      totalPages: 0,
      currentPage: 1,
      total: 0
    })
  }
})

// Get single ticket (both user and public) - ENHANCED
router.get('/tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id
    console.log('Fetching ticket details for:', ticketId)

    // Try to find as user ticket first
    let ticket = await Ticket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('userId', 'firstName lastName email').lean()

    if (ticket && ticket.userId) {
      // Mark user messages as read
      await Ticket.updateOne(
        { _id: ticketId },
        { $set: { 'messages.$[elem].read': true } },
        { arrayFilters: [{ 'elem.sender': 'user' }] }
      )

      ticket.type = 'user'
      ticket.displayName = `${ticket.userId.firstName} ${ticket.userId.lastName}`
      ticket.displayEmail = ticket.userId.email
    } else {
      // Try to find as public support ticket
      ticket = await PublicSupportTicket.findOne({
        _id: ticketId,
        isDeleted: false
      }).lean()

      if (ticket) {
        // Format public ticket to match user ticket structure
        ticket = {
          _id: ticket._id,
          subject: `Public Support: ${ticket.message.substring(0, 50)}${ticket.message.length > 50 ? '...' : ''}`,
          description: ticket.message,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          createdAt: ticket.createdAt,
          lastReply: ticket.lastResponseAt || ticket.createdAt,
          type: 'public',
          displayName: ticket.name,
          displayEmail: ticket.email,
          messages: [
            {
              sender: 'user',
              message: ticket.message,
              timestamp: ticket.createdAt,
              read: true
            },
            ...(ticket.responses || []).map(response => ({
              sender: 'admin',
              message: response.message,
              timestamp: response.respondedAt,
              read: true
            }))
          ],
          source: ticket.source
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    console.log('Ticket found:', { id: ticket._id, type: ticket.type })
    res.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ message: 'Error fetching ticket', error: error.message })
  }
})

// Reply to ticket (both user and public) - ENHANCED
router.post('/tickets/:id/reply', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { message } = req.body
    const ticketId = req.params.id
    
    console.log('Replying to ticket:', ticketId)

    // Try user ticket first
    let ticket = await Ticket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('userId')

    if (ticket && ticket.userId) {
      // Handle user ticket
      ticket.messages.push({
        sender: 'admin',
        message,
        timestamp: new Date()
      })

      ticket.status = 'in-progress'
      ticket.lastReply = new Date()
      await ticket.save()

      // Notify user if user exists and is not deleted
      if (ticket.userId && !ticket.userId.isDeleted) {
        const io = req.app.get('io')
        await notifyUser(
          io,
          ticket.userId._id,
          'Support Reply',
          `You have a new reply on your support ticket: ${ticket.subject}`,
          'info'
        )
      }

      res.json({
        message: 'Reply sent successfully',
        ticket
      })
    } else {
      // Try public support ticket
      const publicTicket = await PublicSupportTicket.findOne({
        _id: ticketId,
        isDeleted: false
      })

      if (publicTicket) {
        publicTicket.responses.push({
          message,
          respondedBy: 'global-admin',
          respondedAt: new Date()
        })

        publicTicket.status = 'in-progress'
        publicTicket.lastResponseAt = new Date()
        await publicTicket.save()

        res.json({
          message: 'Reply sent successfully',
          ticket: publicTicket
        })
      } else {
        return res.status(404).json({ message: 'Ticket not found' })
      }
    }
  } catch (error) {
    console.error('Error replying to ticket:', error)
    res.status(500).json({ message: 'Error sending reply', error: error.message })
  }
})

// Update ticket status (both user and public) - ENHANCED
router.patch('/tickets/:id/status', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const ticketId = req.params.id
    
    // Try user ticket first
    let ticket = await Ticket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('userId')

    if (ticket && ticket.userId) {
      ticket.status = status
      await ticket.save()

      // Notify user if user exists and is not deleted
      if (ticket.userId && !ticket.userId.isDeleted) {
        const io = req.app.get('io')
        await notifyUser(
          io,
          ticket.userId._id,
          'Ticket Status Updated',
          `Your support ticket status has been updated to: ${status}`,
          'info'
        )
      }
    } else {
      // Try public support ticket
      const publicTicket = await PublicSupportTicket.findOne({
        _id: ticketId,
        isDeleted: false
      })

      if (publicTicket) {
        publicTicket.status = status
        await publicTicket.save()
      } else {
        return res.status(404).json({ message: 'Ticket not found' })
      }
    }

    res.json({ message: 'Ticket status updated successfully' })
  } catch (error) {
    console.error('Error updating ticket status:', error)
    res.status(500).json({ message: 'Error updating ticket status', error: error.message })
  }
})

// Delete ticket (both user and public) - ENHANCED WITH PERMISSION CHECK
router.delete('/tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id
    
    console.log('Delete ticket request:', { 
      ticketId,
      requestingAdminEmail: req.globalAdmin.email,
      requestingAdminIsOriginal: req.globalAdmin.isOriginal
    })

    // PERMISSION CHECK: Only original admin can delete support tickets
    if (!req.globalAdmin.isOriginal) {
      return res.status(403).json({ 
        message: 'Only the original Global Admin can delete support tickets',
        currentAdmin: {
          email: req.globalAdmin.email,
          isOriginal: req.globalAdmin.isOriginal
        }
      })
    }

    // Try user ticket first
    let ticket = await Ticket.findOne({
      _id: ticketId,
      isDeleted: false
    })

    if (ticket) {
      ticket.isDeleted = true
      await ticket.save()
      
      console.log('User ticket deleted:', { ticketId, deletedBy: req.globalAdmin.email })
      res.json({ message: 'User ticket deleted successfully' })
    } else {
      // Try public support ticket
      const publicTicket = await PublicSupportTicket.findOne({
        _id: ticketId,
        isDeleted: false
      })

      if (publicTicket) {
        publicTicket.isDeleted = true
        publicTicket.deletedAt = new Date()
        publicTicket.deletedBy = req.globalAdmin.email
        await publicTicket.save()
        
        console.log('Public support ticket deleted:', { ticketId, deletedBy: req.globalAdmin.email })
        res.json({ message: 'Public support ticket deleted successfully' })
      } else {
        return res.status(404).json({ message: 'Ticket not found' })
      }
    }
  } catch (error) {
    console.error('Error deleting ticket:', error)
    res.status(500).json({ message: 'Error deleting ticket', error: error.message })
  }
})

// Get all escrow tickets (Global Admin)
router.get('/escrow-tickets', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query
    let query = { isDeleted: false }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ]
    }

    const tickets = await EscrowTicket.find(query)
      .populate('initiatorId', 'firstName lastName email profileImage')
      .populate('recipientId', 'firstName lastName email profileImage')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await EscrowTicket.countDocuments(query)

    res.json({
      tickets,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    })
  } catch (error) {
    console.error('Error fetching escrow tickets:', error)
    res.status(500).json({ message: 'Error fetching escrow tickets', error: error.message })
  }
})

// Get single escrow ticket (Global Admin)
router.get('/escrow-tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const ticket = await EscrowTicket.findOne({
      _id: req.params.id,
      isDeleted: false
    })
    .populate('initiatorId', 'firstName lastName email profileImage')
    .populate('recipientId', 'firstName lastName email profileImage')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching escrow ticket:', error)
    res.status(500).json({ message: 'Error fetching escrow ticket', error: error.message })
  }
})

// Send admin message to escrow ticket
router.post('/escrow-tickets/:id/message', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { message } = req.body
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    ticket.messages.push({
      sender: 'admin',
      message: message.trim(),
      timestamp: new Date()
    })

    ticket.lastActivity = new Date()
    await ticket.save()

    // Notify both parties
    const io = req.app.get('io')
    
    await Promise.all([
      notifyUser(
        io,
        ticket.initiatorId._id,
        'Admin Message in Escrow',
        `Global Admin has sent a message in your escrow ticket: ${ticket.title}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'admin-message'
        }
      ),
      notifyUser(
        io,
        ticket.recipientId._id,
        'Admin Message in Escrow',
        `Global Admin has sent a message in your escrow ticket: ${ticket.title}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'admin-message'
        }
      )
    ])

    res.json({
      message: 'Admin message sent successfully',
      ticket
    })
  } catch (error) {
    console.error('Error sending admin message:', error)
    res.status(500).json({ message: 'Error sending admin message', error: error.message })
  }
})

// Update escrow ticket status (Global Admin)
router.patch('/escrow-tickets/:id/status', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    const oldStatus = ticket.status
    ticket.status = status

    if (status === 'closed' && oldStatus !== 'closed') {
      ticket.closedAt = new Date()
      ticket.closedBy = 'admin'
    }

    await ticket.save()

    // Notify both parties
    const io = req.app.get('io')
    
    await Promise.all([
      notifyUser(
        io,
        ticket.initiatorId._id,
        'Escrow Status Updated',
        `Your escrow ticket status has been updated to: ${status}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'status-update'
        }
      ),
      notifyUser(
        io,
        ticket.recipientId._id,
        'Escrow Status Updated',
        `Your escrow ticket status has been updated to: ${status}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'status-update'
        }
      )
    ])

    res.json({
      message: 'Escrow ticket status updated successfully',
      ticket
    })
  } catch (error) {
    console.error('Error updating escrow status:', error)
    res.status(500).json({ message: 'Error updating escrow status', error: error.message })
  }
})

// Reopen escrow ticket (Global Admin only)
router.patch('/escrow-tickets/:id/reopen', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    ticket.status = 'active'
    ticket.closedAt = null
    ticket.closedBy = null
    ticket.lastActivity = new Date()
    await ticket.save()

    // Notify both parties
    const io = req.app.get('io')
    
    await Promise.all([
      notifyUser(
        io,
        ticket.initiatorId._id,
        'Escrow Ticket Reopened',
        `Your escrow ticket has been reopened by Global Admin: ${ticket.title}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'escrow-reopened'
        }
      ),
      notifyUser(
        io,
        ticket.recipientId._id,
        'Escrow Ticket Reopened',
        `Your escrow ticket has been reopened by Global Admin: ${ticket.title}`,
        'info',
        { 
          escrowTicketId: ticket._id,
          action: 'escrow-reopened'
        }
      )
    ])

    res.json({
      message: 'Escrow ticket reopened successfully',
      ticket
    })
  } catch (error) {
    console.error('Error reopening escrow ticket:', error)
    res.status(500).json({ message: 'Error reopening escrow ticket', error: error.message })
  }
})

// Delete escrow ticket (Global Admin only)
router.delete('/escrow-tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      isDeleted: false
    })

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    ticket.isDeleted = true
    ticket.deletedAt = new Date()
    ticket.deletedBy = req.globalAdmin.email
    await ticket.save()

    res.json({
      message: 'Escrow ticket deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting escrow ticket:', error)
    res.status(500).json({ message: 'Error deleting escrow ticket', error: error.message })
  }
})

// Create advertisement - FIXED VERSION
router.post('/advertisements', authenticateToken, requireGlobalAdmin, upload.single('media'), async (req, res) => {
  try {
    const { name, description, duration, mediaUrl } = req.body
    
    console.log('Creating advertisement with data:', { name, description, duration, mediaUrl })
    console.log('File uploaded:', req.file ? 'Yes' : 'No')
    
    // Validate required fields
    if (!name || !description || !duration) {
      return res.status(400).json({ 
        message: 'Name, description, and duration are required fields' 
      })
    }

    let mediaUploadUrl = mediaUrl
    let mediaType = 'image'

    // Handle media upload to Cloudinary
    if (req.file) {
      try {
        const isVideo = req.file.mimetype.startsWith('video/')
        mediaType = isVideo ? 'video' : 'image'
        
        console.log('Uploading to Cloudinary:', { mediaType, fileSize: req.file.size })
        
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              resource_type: isVideo ? 'video' : 'image',
              folder: 'marketbook-ads',
              quality: 'auto',
              fetch_format: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error)
                reject(error)
              } else {
                console.log('Cloudinary upload success:', result.secure_url)
                resolve(result)
              }
            }
          )
          uploadStream.end(req.file.buffer)
        })
        
        mediaUploadUrl = result.secure_url
      } catch (uploadError) {
        console.error('Media upload failed:', uploadError)
        return res.status(400).json({ 
          message: 'Failed to upload media file. Please try again or use a URL instead.' 
        })
      }
    } else if (mediaUrl) {
      // Determine media type from URL
      mediaType = mediaUrl.match(/\.(mp4|webm|ogg|avi|mov)$/i) ? 'video' : 'image'
      console.log('Using provided URL:', { mediaUrl, mediaType })
    } else {
      return res.status(400).json({ 
        message: 'Either upload a media file or provide a media URL' 
      })
    }

    // Validate duration
    if (!['day', 'week', 'month'].includes(duration)) {
      return res.status(400).json({ 
        message: 'Duration must be one of: day, week, month' 
      })
    }

    console.log('Creating advertisement document...')

    const advertisement = new Advertisement({
      name: name.trim(),
      description: description.trim(),
      mediaUrl: mediaUploadUrl,
      mediaType,
      duration
      // endDate will be automatically set by the pre-save hook
    })

    await advertisement.save()
    
    console.log('Advertisement created successfully:', advertisement._id)

    res.status(201).json({
      message: 'Advertisement created successfully',
      advertisement
    })
  } catch (error) {
    console.error('Error creating advertisement:', error)
    res.status(500).json({ 
      message: 'Error creating advertisement', 
      error: error.message 
    })
  }
})

// Get all advertisements
router.get('/advertisements', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const advertisements = await Advertisement.find()
      .sort({ createdAt: -1 })

    res.json({ advertisements })
  } catch (error) {
    console.error('Error fetching advertisements:', error)
    res.status(500).json({ message: 'Error fetching advertisements', error: error.message })
  }
})

// Update advertisement
router.put('/advertisements/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { name, description, duration, isActive } = req.body
    
    const advertisement = await Advertisement.findById(req.params.id)
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' })
    }

    if (name) advertisement.name = name.trim()
    if (description) advertisement.description = description.trim()
    if (duration && ['day', 'week', 'month'].includes(duration)) {
      advertisement.duration = duration
      // Recalculate endDate if duration changes
      const now = advertisement.startDate || new Date()
      switch (duration) {
        case 'day':
          advertisement.endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case 'week':
          advertisement.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          advertisement.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
      }
    }
    if (typeof isActive === 'boolean') advertisement.isActive = isActive

    await advertisement.save()

    res.json({
      message: 'Advertisement updated successfully',
      advertisement
    })
  } catch (error) {
    console.error('Error updating advertisement:', error)
    res.status(500).json({ message: 'Error updating advertisement', error: error.message })
  }
})

// Delete advertisement
router.delete('/advertisements/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    await Advertisement.findByIdAndDelete(req.params.id)
    res.json({ message: 'Advertisement deleted successfully' })
  } catch (error) {
    console.error('Error deleting advertisement:', error)
    res.status(500).json({ message: 'Error deleting advertisement', error: error.message })
  }
})

// Send message to user
router.post('/send-message/:userId', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { subject, message } = req.body
    const userId = req.params.userId

    const user = await User.findById(userId)
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Create a new ticket from admin to user
    const ticket = new Ticket({
      userId,
      subject,
      description: message,
      status: 'open',
      priority: 'medium',
      category: 'other',
      messages: [{
        sender: 'admin',
        message,
        timestamp: new Date()
      }]
    })

    await ticket.save()

    // Send notification to user
    const io = req.app.get('io')
    await notifyUser(
      io,
      userId,
      'New Message from Admin',
      `You have received a new message: ${subject}`,
      'info'
    )

    res.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ message: 'Error sending message', error: error.message })
  }
})

// Broadcast message to all users
router.post('/broadcast-message', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { subject, message } = req.body

    // Get all active users
    const users = await User.find({ isDeleted: false, isActive: true }).select('_id')

    // Send notification to all users
    const io = req.app.get('io')
    for (const user of users) {
      await notifyUser(
        io,
        user._id,
        subject,
        message,
        'info'
      )
    }

    res.json({ 
      message: 'Broadcast message sent successfully',
      recipientCount: users.length
    })
  } catch (error) {
    console.error('Error broadcasting message:', error)
    res.status(500).json({ message: 'Error broadcasting message', error: error.message })
  }
})

export default router