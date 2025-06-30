import express from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import PublicSupportTicket from '../models/PublicSupportTicket.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendConfirmationEmail, sendPasswordResetEmail } from '../utils/email.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' })
    }

    // Generate email confirmation token
    const emailConfirmToken = crypto.randomBytes(32).toString('hex')

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      emailConfirmToken
    })

    await user.save()

    // Send confirmation email
    await sendConfirmationEmail(email, emailConfirmToken)

    res.status(201).json({
      message: 'User registered successfully. Please check your email to confirm your account.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailConfirmed: user.isEmailConfirmed
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email, isDeleted: false })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is disabled. Please contact support.' })
    }

    // Check if email is confirmed
    if (!user.isEmailConfirmed) {
      return res.status(400).json({ message: 'Please confirm your email address before logging in' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage,
        isEmailConfirmed: user.isEmailConfirmed,
        adminConfig: {
          isAdmin: user.adminConfig.isAdmin
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email, isDeleted: false })
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email address' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 3600000 // 1 hour
    await user.save()

    // Send reset email
    await sendPasswordResetEmail(email, resetToken)

    res.json({ message: 'Password reset link sent to your email' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ message: 'Error sending password reset email', error: error.message })
  }
})

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
      isDeleted: false
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ message: 'Error resetting password', error: error.message })
  }
})

// Search users (public endpoint) - Enhanced with profile and billing info
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    
    if (!q || q.trim().length < 2) {
      return res.json({ users: [] })
    }

    const searchRegex = new RegExp(q.trim(), 'i')
    
    const users = await User.find({
      isDeleted: false,
      isActive: true,
      isEmailConfirmed: true,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { 'businessInfo.businessName': searchRegex }
      ]
    })
    .select('firstName lastName email businessInfo profileImage isRecommended billingAddress')
    .limit(20)
    .sort({ isRecommended: -1, firstName: 1 })

    res.json({ users })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ message: 'Search failed', error: error.message })
  }
})

// Submit support ticket (public endpoint) - FIXED
router.post('/support-ticket', async (req, res) => {
  try {
    const { name, email, message } = req.body

    if (!email || !message) {
      return res.status(400).json({ message: 'Email and message are required' })
    }

    console.log('Creating public support ticket:', { name, email, messageLength: message.length })

    // Create a public support ticket in the database
    const publicTicket = new PublicSupportTicket({
      name: name || 'Anonymous',
      email: email.trim(),
      message: message.trim(),
      status: 'open',
      priority: 'medium',
      category: 'general',
      source: 'public-form',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    })

    await publicTicket.save()
    console.log('Public support ticket created:', publicTicket._id)

    // Notify global admins via socket
    const io = req.app.get('io')
    if (io) {
      io.emit('admin-notification', {
        type: 'public-support-ticket',
        message: `New public support ticket from ${email}`,
        ticketId: publicTicket._id,
        data: {
          id: publicTicket._id,
          name: publicTicket.name,
          email: publicTicket.email,
          message: publicTicket.message,
          createdAt: publicTicket.createdAt
        }
      })
      console.log('Admin notification sent via socket')
    }

    res.json({ 
      message: 'Support ticket submitted successfully. We will get back to you soon.',
      ticketId: publicTicket._id
    })
  } catch (error) {
    console.error('Support ticket error:', error)
    res.status(500).json({ message: 'Error submitting support ticket', error: error.message })
  }
})

// Confirm email
router.post('/confirm-email/:token', async (req, res) => {
  try {
    const { token } = req.params

    const user = await User.findOne({ emailConfirmToken: token })
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired confirmation token' })
    }

    user.isEmailConfirmed = true
    user.emailConfirmToken = null
    await user.save()

    res.json({ message: 'Email confirmed successfully! You can now log in.' })
  } catch (error) {
    console.error('Email confirmation error:', error)
    res.status(500).json({ message: 'Email confirmation failed', error: error.message })
  }
})

// Get profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      profileImage: req.user.profileImage,
      bankDetails: req.user.bankDetails,
      billingAddress: req.user.billingAddress,
      businessInfo: req.user.businessInfo,
      isRecommended: req.user.isRecommended,
      adminConfig: {
        isAdmin: req.user.adminConfig.isAdmin
      }
    }
  })
})

export default router