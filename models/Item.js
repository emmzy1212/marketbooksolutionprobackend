import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid', 'pending'],
    default: 'pending'
  },
  image: {
    type: String,
    default: null
  },
  category: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  invoiceData: {
    customerEmail: String,
    customerName: String,
    customerAddress: String,
    invoiceDate: Date,
    dueDate: Date,
    notes: String
  },
  markedAsPaidBy: {
    type: String,
    default: null
  },
  markedAsPaidAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Generate invoice number before saving
itemSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    this.invoiceNumber = `INV-${timestamp}-${random}`.toUpperCase()
  }
  next()
})

// Ensure virtual fields are serialized
itemSchema.set('toJSON', {
  virtuals: true
})

export default mongoose.model('Item', itemSchema)