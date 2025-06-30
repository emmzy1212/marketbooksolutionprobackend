import mongoose from 'mongoose'

const publicSupportTicketSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Anonymous'
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'account', 'feature-request', 'other'],
    default: 'general'
  },
  source: {
    type: String,
    default: 'public-form'
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
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
  responses: [{
    message: {
      type: String,
      required: true
    },
    respondedBy: {
      type: String,
      default: 'global-admin'
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastResponseAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Update lastResponseAt when responses are added
publicSupportTicketSchema.pre('save', function(next) {
  if (this.responses && this.responses.length > 0) {
    this.lastResponseAt = this.responses[this.responses.length - 1].respondedAt
  }
  next()
})

export default mongoose.model('PublicSupportTicket', publicSupportTicketSchema)