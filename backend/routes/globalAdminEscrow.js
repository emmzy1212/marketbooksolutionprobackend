import express from 'express'
import EscrowTicket from '../models/EscrowTicket.js'
import { authenticateToken, requireGlobalAdmin } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'

const router = express.Router()

// Get all escrow tickets (Global Admin only)
router.get('/tickets', authenticateToken, requireGlobalAdmin, async (req, res) => {
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
router.get('/tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
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
router.post('/tickets/:id/message', authenticateToken, requireGlobalAdmin, async (req, res) => {
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
router.patch('/tickets/:id/status', authenticateToken, requireGlobalAdmin, async (req, res) => {
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
router.patch('/tickets/:id/reopen', authenticateToken, requireGlobalAdmin, async (req, res) => {
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
router.delete('/tickets/:id', authenticateToken, requireGlobalAdmin, async (req, res) => {
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

// Add admin notes to escrow ticket
router.patch('/tickets/:id/notes', authenticateToken, requireGlobalAdmin, async (req, res) => {
  try {
    const { notes } = req.body
    const ticketId = req.params.id

    const ticket = await EscrowTicket.findOne({
      _id: ticketId,
      isDeleted: false
    })

    if (!ticket) {
      return res.status(404).json({ message: 'Escrow ticket not found' })
    }

    ticket.adminNotes = notes
    await ticket.save()

    res.json({
      message: 'Admin notes updated successfully',
      ticket
    })
  } catch (error) {
    console.error('Error updating admin notes:', error)
    res.status(500).json({ message: 'Error updating admin notes', error: error.message })
  }
})

export default router







