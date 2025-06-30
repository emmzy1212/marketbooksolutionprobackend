import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import User from '../models/User.js'
import { requireUser } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'

const router = express.Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// Update profile
router.put('/profile', requireUser, upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, profileImageUrl } = req.body
    const user = req.user
    let profileImageUploadUrl = user.profileImage

    // Handle profile image upload
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { 
            resource_type: 'image', 
            folder: 'marketbook-profiles',
            transformation: [
              { width: 200, height: 200, crop: 'fill' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        ).end(req.file.buffer)
      })
      profileImageUploadUrl = result.secure_url
    } else if (profileImageUrl && profileImageUrl !== user.profileImage) {
      profileImageUploadUrl = profileImageUrl
    }

    // Update user fields
    user.firstName = firstName || user.firstName
    user.lastName = lastName || user.lastName
    user.profileImage = profileImageUploadUrl

    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Profile Updated',
      'Your profile has been updated successfully',
      'success'
    )

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage,
        bankDetails: user.bankDetails,
        billingAddress: user.billingAddress,
        businessInfo: user.businessInfo,
        adminConfig: {
          isAdmin: user.adminConfig.isAdmin
        }
      }
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ message: 'Error updating profile', error: error.message })
  }
})

// Update business information
router.put('/business-info', requireUser, async (req, res) => {
  try {
    const { businessName, phoneNumber, address, description } = req.body
    const user = req.user

    user.businessInfo = {
      businessName: businessName || user.businessInfo?.businessName,
      phoneNumber: phoneNumber || user.businessInfo?.phoneNumber,
      address: address || user.businessInfo?.address,
      description: description || user.businessInfo?.description
    }

    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Business Information Updated',
      'Your business information has been updated successfully',
      'info'
    )

    res.json({
      message: 'Business information updated successfully',
      businessInfo: user.businessInfo
    })
  } catch (error) {
    console.error('Error updating business information:', error)
    res.status(500).json({ message: 'Error updating business information', error: error.message })
  }
})

// Update bank details
router.put('/bank-details', requireUser, async (req, res) => {
  try {
    const { bankName, accountName, accountNumber, routingNumber, swiftCode } = req.body
    const user = req.user

    user.bankDetails = {
      bankName: bankName || user.bankDetails?.bankName,
      accountName: accountName || user.bankDetails?.accountName,
      accountNumber: accountNumber || user.bankDetails?.accountNumber,
      routingNumber: routingNumber || user.bankDetails?.routingNumber,
      swiftCode: swiftCode || user.bankDetails?.swiftCode
    }

    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Bank Details Updated',
      'Your bank details have been updated successfully',
      'info'
    )

    res.json({
      message: 'Bank details updated successfully',
      bankDetails: user.bankDetails
    })
  } catch (error) {
    console.error('Error updating bank details:', error)
    res.status(500).json({ message: 'Error updating bank details', error: error.message })
  }
})

// Update billing address
router.put('/billing-address', requireUser, async (req, res) => {
  try {
    const { street, city, state, zipCode, country } = req.body
    const user = req.user

    user.billingAddress = {
      street: street || user.billingAddress?.street,
      city: city || user.billingAddress?.city,
      state: state || user.billingAddress?.state,
      zipCode: zipCode || user.billingAddress?.zipCode,
      country: country || user.billingAddress?.country
    }

    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Billing Address Updated',
      'Your billing address has been updated successfully',
      'info'
    )

    res.json({
      message: 'Billing address updated successfully',
      billingAddress: user.billingAddress
    })
  } catch (error) {
    console.error('Error updating billing address:', error)
    res.status(500).json({ message: 'Error updating billing address', error: error.message })
  }
})

// Change password
router.put('/change-password', requireUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = req.user

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' })
    }

    user.password = newPassword
    await user.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      user._id,
      'Password Changed',
      'Your password has been changed successfully',
      'success'
    )

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ message: 'Error changing password', error: error.message })
  }
})

export default router