import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profileImage: {
    type: String,
    default: null
  },
  isEmailConfirmed: {
    type: Boolean,
    default: false
  },
  emailConfirmToken: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    routingNumber: String,
    swiftCode: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  businessInfo: {
    businessName: String,
    phoneNumber: String,
    address: String,
    description: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  adminConfig: {
    isAdmin: {
      type: Boolean,
      default: false
    },
    adminPassword: {
      type: String,
      default: null
    },
    adminCreatedAt: {
      type: Date,
      default: null
    }
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Hash admin password before saving
userSchema.pre('save', async function (next) {
  if (
    !this.isModified('adminConfig.adminPassword') ||
    !this.adminConfig?.adminPassword
  ) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.adminConfig.adminPassword = await bcrypt.hash(this.adminConfig.adminPassword, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Compare admin password method
userSchema.methods.compareAdminPassword = async function (candidatePassword) {
  if (!this.adminConfig?.adminPassword) return false
  return bcrypt.compare(candidatePassword, this.adminConfig.adminPassword)
}

// Get full name virtual
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Ensure virtual fields are serialized safely
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    if (!ret) return ret // safeguard

    // Hide sensitive fields
    delete ret.password
    delete ret.emailConfirmToken
    delete ret.passwordResetToken

    if (ret.adminConfig && ret.adminConfig.adminPassword) {
      delete ret.adminConfig.adminPassword
    }

    return ret
  }
})

export default mongoose.model('User', userSchema)
