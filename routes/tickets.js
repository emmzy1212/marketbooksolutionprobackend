import express from 'express'
import Ticket from '../models/Ticket.js'
import { requireUser } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'

const router = express.Router()

// Get user tickets
router.get('/', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const query = { userId: req.user._id, isDeleted: false }

    if (status && status !== 'all') {
      query.status = status
    }

    const tickets = await Ticket.find(query)
      .sort({ lastReply: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Ticket.countDocuments(query)

    res.json({
      tickets,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    res.status(500).json({ message: 'Error fetching tickets', error: error.message })
  }
})

// Get single ticket
router.get('/:id', requireUser, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Mark admin messages as read
    ticket.messages.forEach(message => {
      if (message.sender === 'admin') {
        message.read = true
      }
    })
    await ticket.save()

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ message: 'Error fetching ticket', error: error.message })
  }
})

// Create new ticket
router.post('/', requireUser, async (req, res) => {
  try {
    const { subject, description, priority = 'medium', category = 'other' } = req.body

    const ticket = new Ticket({
      userId: req.user._id,
      subject,
      description,
      priority,
      category,
      messages: [{
        sender: 'user',
        message: description,
        timestamp: new Date()
      }]
    })

    await ticket.save()

    // Notify global admin (if socket connection exists)
    const io = req.app.get('io')
    io.emit('admin-notification', {
      type: 'new-ticket',
      message: `New support ticket: ${subject}`,
      ticketId: ticket._id,
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`
    })

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    })
  } catch (error) {
    console.error('Error creating ticket:', error)
    res.status(500).json({ message: 'Error creating ticket', error: error.message })
  }
})

// Reply to ticket
router.post('/:id/reply', requireUser, async (req, res) => {
  try {
    const { message } = req.body
    
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    ticket.messages.push({
      sender: 'user',
      message,
      timestamp: new Date()
    })

    ticket.status = 'open' // Reopen if closed
    ticket.lastReply = new Date()
    await ticket.save()

    // Notify global admin
    const io = req.app.get('io')
    io.emit('admin-notification', {
      type: 'ticket-reply',
      message: `New reply on ticket: ${ticket.subject}`,
      ticketId: ticket._id,
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`
    })

    res.json({
      message: 'Reply sent successfully',
      ticket
    })
  } catch (error) {
    console.error('Error replying to ticket:', error)
    res.status(500).json({ message: 'Error sending reply', error: error.message })
  }
})

// Close ticket
router.patch('/:id/close', requireUser, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    ticket.status = 'closed'
    await ticket.save()

    res.json({ message: 'Ticket closed successfully' })
  } catch (error) {
    console.error('Error closing ticket:', error)
    res.status(500).json({ message: 'Error closing ticket', error: error.message })
  }
})

export default router