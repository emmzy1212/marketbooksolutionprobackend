import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['initiator', 'recipient', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.sender !== 'admin'
    }
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
})

const escrowTicketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'closed', 'cancelled'],
    default: 'pending'
  },
  invitationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  transactionAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  category: {
    type: String,
    enum: ['goods', 'services', 'digital', 'real-estate', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  messages: [messageSchema],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  invitationSentAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  closedBy: {
    type: String,
    enum: ['initiator', 'recipient', 'admin'],
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: String,
    default: null
  },
  adminNotes: {
    type: String,
    default: null
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      default: 'web'
    }
  }
}, {
  timestamps: true
})

// Update lastActivity when new message is added
escrowTicketSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastActivity = this.messages[this.messages.length - 1].timestamp
  }
  next()
})

// Indexes for better performance
escrowTicketSchema.index({ initiatorId: 1, status: 1 })
escrowTicketSchema.index({ recipientId: 1, status: 1 })
escrowTicketSchema.index({ status: 1, lastActivity: -1 })
escrowTicketSchema.index({ invitationStatus: 1 })

export default mongoose.model('EscrowTicket', escrowTicketSchema)