import express from 'express'
import EscrowTicket from '../models/EscrowTicket.js'
import User from '../models/User.js'
import { requireUser } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'

const router = express.Router()

// Search users for escrow invitation
router.get('/search-users', requireUser, async (req, res) => {
  try {
    const { q } = req.query
    const currentUserId = req.user._id
    
    if (!q || q.trim().length < 2) {
      return res.json({ users: [] })
    }

    const searchRegex = new RegExp(q.trim(), 'i')
    
    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
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
    .select('firstName lastName email businessInfo profileImage isRecommended')
    .limit(20)
    .sort({ isRecommended: -1, firstName: 1 })

    res.json({ users })
  } catch (error) {
    console.error('User search error:', error)
    res.status(500).json({ message: 'Search failed', error: error.message })
  }
})

// Create escrow ticket (send invitation)
router.post('/create', requireUser, async (req, res) => {
  try {
    const { title, description, recipientId, transactionAmount, currency, category } = req.body
    const initiatorId = req.user._id

    // Validate recipient exists and is not the same as initiator
    if (initiatorId.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot create escrow with yourself' })
    }

    const recipient = await User.findById(recipientId)
    if (!recipient || recipient.isDeleted || !recipient.isActive) {
      return res.status(404).json({ message: 'Recipient not found or inactive' })
    }

    const escrowTicket = new EscrowTicket({
      title: title.trim(),
      description: description.trim(),
      initiatorId,
      recipientId,
      transactionAmount: parseFloat(transactionAmount) || 0,
      currency: currency || 'USD',
      category: category || 'other',
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        source: 'web'
      }
    })

    await escrowTicket.save()

    // Populate the ticket for response
    await escrowTicket.populate([
      { path: 'initiatorId', select: 'firstName lastName email profileImage' },
      { path: 'recipientId', select: 'firstName lastName email profileImage' }
    ])

    // Send notification to recipient
    const io = req.app.get('io')
    await notifyUser(
      io,
      recipientId,
      'New Escrow Invitation',
      `${req.user.firstName} ${req.user.lastName} has invited you to an escrow transaction: ${title}`,
      'info',
      { 
        escrowTicketId: escrowTicket._id,
        action: 'escrow-invitation',
        initiatorName: `${req.user.firstName} ${req.user.lastName}`
      }
    )

    res.status(201).json({
      message: 'Escrow invitation sent successfully',
      escrowTicket
    })
  } catch (error) {
    console.error('Error creating escrow ticket:', error)
    res.status(500).json({ message: 'Error creating escrow ticket', error: error.message })
  }
})

// Get user's escrow tickets
router.get('/my-tickets', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query
    const userId = req.user._id
    
    let query = {
      $or: [
        { initiatorId: userId },
        { recipientId: userId }
      ],
      isDeleted: false
    }

    if (status && status !== 'all') {
      query.status = status
    }

    // Filter by user type (initiated vs received)
    if (type === 'initiated') {
      query = { initiatorId: userId, isDeleted: false }
    } else if (type === 'received') {
      query = { recipientId: userId, isDeleted: false }
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

// Get single escrow ticket
router.get('/tickets/:id', requireUser, async (req, res) => {
  try {
    const userId = req.user._id
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      $or: [
        { initiatorId: userId },
        { recipientId: userId }
      ],
      isDeleted: false
    })
    .populate('initiatorId', 'firstName lastName email profileImage')
    .populate('recipientId', 'firstName lastName email profileImage')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    // Mark messages as read for current user
    const userRole = ticket.initiatorId._id.toString() === userId.toString() ? 'initiator' : 'recipient'
    
    ticket.messages.forEach(message => {
      if (message.sender !== userRole && message.sender !== 'admin') {
        message.read = true
      }
    })
    
    await ticket.save()

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching escrow ticket:', error)
    res.status(500).json({ message: 'Error fetching escrow ticket', error: error.message })
  }
})

// Accept/Decline escrow invitation
router.patch('/tickets/:id/respond', requireUser, async (req, res) => {
  try {
    const { action } = req.body // 'accept' or 'decline'
    const userId = req.user._id
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      recipientId: userId,
      invitationStatus: 'pending',
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow invitation not found or already responded' })
    }

    if (action === 'accept') {
      ticket.invitationStatus = 'accepted'
      ticket.status = 'active'
      ticket.acceptedAt = new Date()
    } else if (action === 'decline') {
      ticket.invitationStatus = 'declined'
      ticket.status = 'cancelled'
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "accept" or "decline"' })
    }

    await ticket.save()

    // Notify initiator
    const io = req.app.get('io')
    await notifyUser(
      io,
      ticket.initiatorId._id,
      `Escrow Invitation ${action === 'accept' ? 'Accepted' : 'Declined'}`,
      `${req.user.firstName} ${req.user.lastName} has ${action}ed your escrow invitation: ${ticket.title}`,
      action === 'accept' ? 'success' : 'warning',
      { 
        escrowTicketId: ticket._id,
        action: `escrow-${action}ed`
      }
    )

    res.json({
      message: `Escrow invitation ${action}ed successfully`,
      ticket
    })
  } catch (error) {
    console.error('Error responding to escrow invitation:', error)
    res.status(500).json({ message: 'Error responding to invitation', error: error.message })
  }
})

// Send message in escrow ticket
router.post('/tickets/:id/message', requireUser, async (req, res) => {
  try {
    const { message } = req.body
    const userId = req.user._id
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      $or: [
        { initiatorId: userId },
        { recipientId: userId }
      ],
      status: { $in: ['active', 'pending'] },
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found or not accessible' })
    }

    const senderRole = ticket.initiatorId._id.toString() === userId.toString() ? 'initiator' : 'recipient'
    const otherPartyId = senderRole === 'initiator' ? ticket.recipientId._id : ticket.initiatorId._id
    const otherPartyName = senderRole === 'initiator' ? 
      `${ticket.recipientId.firstName} ${ticket.recipientId.lastName}` :
      `${ticket.initiatorId.firstName} ${ticket.initiatorId.lastName}`

    ticket.messages.push({
      sender: senderRole,
      senderId: userId,
      message: message.trim(),
      timestamp: new Date()
    })

    ticket.lastActivity = new Date()
    await ticket.save()

    // Notify other party
    const io = req.app.get('io')
    await notifyUser(
      io,
      otherPartyId,
      'New Escrow Message',
      `${req.user.firstName} ${req.user.lastName} sent a message in escrow: ${ticket.title}`,
      'info',
      { 
        escrowTicketId: ticket._id,
        action: 'escrow-message'
      }
    )

    res.json({
      message: 'Message sent successfully',
      ticket
    })
  } catch (error) {
    console.error('Error sending escrow message:', error)
    res.status(500).json({ message: 'Error sending message', error: error.message })
  }
})

// Close escrow ticket (user can close their own tickets)
router.patch('/tickets/:id/close', requireUser, async (req, res) => {
  try {
    const userId = req.user._id
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      $or: [
        { initiatorId: userId },
        { recipientId: userId }
      ],
      status: { $in: ['active', 'pending'] },
      isDeleted: false
    }).populate('initiatorId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found or cannot be closed' })
    }

    const userRole = ticket.initiatorId._id.toString() === userId.toString() ? 'initiator' : 'recipient'
    const otherPartyId = userRole === 'initiator' ? ticket.recipientId._id : ticket.initiatorId._id

    ticket.status = 'closed'
    ticket.closedAt = new Date()
    ticket.closedBy = userRole
    await ticket.save()

    // Notify other party
    const io = req.app.get('io')
    await notifyUser(
      io,
      otherPartyId,
      'Escrow Ticket Closed',
      `${req.user.firstName} ${req.user.lastName} has closed the escrow ticket: ${ticket.title}`,
      'info',
      { 
        escrowTicketId: ticket._id,
        action: 'escrow-closed'
      }
    )

    res.json({
      message: 'Escrow ticket closed successfully',
      ticket
    })
  } catch (error) {
    console.error('Error closing escrow ticket:', error)
    res.status(500).json({ message: 'Error closing escrow ticket', error: error.message })
  }
})

export default router