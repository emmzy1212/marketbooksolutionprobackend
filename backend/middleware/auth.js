import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import GlobalAdmin from '../models/GlobalAdmin.js'

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Check if it's a global admin token
    if (decoded.type === 'global-admin') {
      const admin = await GlobalAdmin.findById(decoded.adminId)
      if (!admin) {
        return res.status(401).json({ message: 'Invalid token' })
      }
      req.globalAdmin = admin
      req.userType = 'global-admin'
      
      // CRITICAL: Set isOriginal from the token payload, not the database
      req.globalAdmin.isOriginal = decoded.isOriginal
      
      console.log('Global admin authenticated:', {
        adminId: admin._id,
        email: admin.email,
        isOriginal: decoded.isOriginal,
        tokenIsOriginal: decoded.isOriginal
      })
    } else {
      // Regular user token
      const user = await User.findById(decoded.userId).select('-password')
      if (!user || user.isDeleted || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token or account disabled' })
      }
      req.user = user
      req.userType = 'user'
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'User access required' })
  }
  next()
}

export const requireGlobalAdmin = (req, res, next) => {
  if (!req.globalAdmin) {
    return res.status(403).json({ message: 'Global admin access required' })
  }
  next()
}

export const requireUserAdmin = async (req, res, next) => {
  if (!req.user || !req.user.adminConfig.isAdmin) {
    return res.status(403).json({ message: 'User admin access required' })
  }
  next()
}