import mongoose from 'mongoose'

const advertisementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  duration: {
    type: String,
    enum: ['day', 'week', 'month'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    // Remove required: true to let the pre-save hook handle it
  },
  createdBy: {
    type: String,
    default: 'global-admin'
  }
}, {
  timestamps: true
})

// Set end date based on duration before saving
advertisementSchema.pre('save', function(next) {
  if (!this.endDate) {
    const now = this.startDate || new Date()
    switch (this.duration) {
      case 'day':
        this.endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'week':
        this.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        this.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        break
      default:
        this.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Default to 1 week
    }
  }
  next()
})

export default mongoose.model('Advertisement', advertisementSchema)