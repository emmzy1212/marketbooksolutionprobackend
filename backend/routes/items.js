import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import Item from '../models/Item.js'
import { requireUser } from '../middleware/auth.js'
import { notifyUser } from '../utils/notifications.js'
import { generateInvoicePDF } from '../utils/invoiceGenerator.js'
import { sendInvoiceEmail } from '../utils/email.js'

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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Get user's items with pagination and filtering
router.get('/', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query
    const query = { userId: req.user._id, isDeleted: false }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    }

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Item.countDocuments(query)

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({ message: 'Error fetching items', error: error.message })
  }
})

// Get item statistics
router.get('/stats', requireUser, async (req, res) => {
  try {
    const userId = req.user._id

    const [totalItems, paidItems, unpaidItems, pendingItems] = await Promise.all([
      Item.countDocuments({ userId, isDeleted: false }),
      Item.countDocuments({ userId, status: 'paid', isDeleted: false }),
      Item.countDocuments({ userId, status: 'unpaid', isDeleted: false }),
      Item.countDocuments({ userId, status: 'pending', isDeleted: false })
    ])

    // Calculate total revenue from paid items
    const revenueResult = await Item.aggregate([
      { $match: { userId, status: 'paid', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ])

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    res.json({
      totalItems,
      paidItems,
      unpaidItems,
      pendingItems,
      totalRevenue
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ message: 'Error fetching statistics', error: error.message })
  }
})

// Get single item
router.get('/:id', requireUser, async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.json(item)
  } catch (error) {
    console.error('Error fetching item:', error)
    res.status(500).json({ message: 'Error fetching item', error: error.message })
  }
})

// Create new item
router.post('/', requireUser, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, status = 'pending', category, tags, imageUrl } = req.body
    let imageUploadUrl = imageUrl

    // Handle image upload to Cloudinary
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'marketbook-items' },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        ).end(req.file.buffer)
      })
      imageUploadUrl = result.secure_url
    }

    const item = new Item({
      name,
      description,
      price: parseFloat(price),
      status,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      image: imageUploadUrl,
      userId: req.user._id
    })

    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      req.user._id,
      'Item Added',
      `Your item "${name}" has been added successfully`,
      'success'
    )

    res.status(201).json({
      message: 'Item created successfully',
      item
    })
  } catch (error) {
    console.error('Error creating item:', error)
    res.status(500).json({ message: 'Error creating item', error: error.message })
  }
})

// Update item (only for user admins)
router.put('/:id', requireUser, upload.single('image'), async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.adminConfig.isAdmin) {
      return res.status(403).json({ message: 'Admin access required to edit items' })
    }

    const { name, description, price, status, category, tags, imageUrl } = req.body
    
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    let imageUploadUrl = item.image

    // Handle new image upload
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'marketbook-items' },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        ).end(req.file.buffer)
      })
      imageUploadUrl = result.secure_url
    } else if (imageUrl && imageUrl !== item.image) {
      imageUploadUrl = imageUrl
    }

    // Update item fields
    item.name = name || item.name
    item.description = description || item.description
    item.price = price ? parseFloat(price) : item.price
    item.status = status || item.status
    item.category = category || item.category
    item.tags = tags ? tags.split(',').map(tag => tag.trim()) : item.tags
    item.image = imageUploadUrl

    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      req.user._id,
      'Item Updated',
      `Your item "${item.name}" has been updated successfully`,
      'info'
    )

    res.json({
      message: 'Item updated successfully',
      item
    })
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ message: 'Error updating item', error: error.message })
  }
})

// Delete item (only for user admins)
router.delete('/:id', requireUser, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.adminConfig.isAdmin) {
      return res.status(403).json({ message: 'Admin access required to delete items' })
    }

    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    item.isDeleted = true
    item.deletedAt = new Date()
    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      req.user._id,
      'Item Deleted',
      `Your item "${item.name}" has been deleted`,
      'warning'
    )

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ message: 'Error deleting item', error: error.message })
  }
})

// Generate and download invoice
router.get('/:id/invoice', requireUser, async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    }).populate('userId')

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const pdfBuffer = await generateInvoicePDF(item, req.user)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${item.invoiceNumber}.pdf`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error generating invoice:', error)
    res.status(500).json({ message: 'Error generating invoice', error: error.message })
  }
})

// Send invoice via email
router.post('/:id/send-invoice', requireUser, async (req, res) => {
  try {
    const { customerEmail, customerName, customerAddress, notes } = req.body
    
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    // Update invoice data
    item.invoiceData = {
      customerEmail,
      customerName,
      customerAddress,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes
    }
    await item.save()

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(item, req.user)

    // Send email
    await sendInvoiceEmail(customerEmail, {
      invoiceNumber: item.invoiceNumber,
      itemName: item.name,
      amount: item.price,
      status: item.status,
      customerName
    }, pdfBuffer)

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      req.user._id,
      'Invoice Sent',
      `Invoice ${item.invoiceNumber} has been sent to ${customerEmail}`,
      'success'
    )

    res.json({ message: 'Invoice sent successfully' })
  } catch (error) {
    console.error('Error sending invoice:', error)
    res.status(500).json({ message: 'Error sending invoice', error: error.message })
  }
})

// Mark item as paid (public endpoint for invoice recipients)
router.post('/mark-paid/:invoiceNumber', async (req, res) => {
  try {
    const { invoiceNumber } = req.params
    
    const item = await Item.findOne({ invoiceNumber, isDeleted: false })
    if (!item) {
      return res.status(404).json({ message: 'Invoice not found' })
    }

    if (item.status === 'paid') {
      return res.status(400).json({ message: 'Invoice is already marked as paid' })
    }

    // Set payment request status
    item.paymentRequest = {
      requestedAt: new Date(),
      status: 'pending'
    }
    await item.save()

    // Send notification to item owner for approval
    const io = req.app.get('io')
    await notifyUser(
      io,
      item.userId,
      'Payment Confirmation Request',
      `Someone has marked invoice ${invoiceNumber} as paid. Please review and approve.`,
      'info',
      { itemId: item._id, invoiceNumber, action: 'payment-request' }
    )

    res.json({ message: 'Payment confirmation request sent to the invoice owner' })
  } catch (error) {
    console.error('Error marking invoice as paid:', error)
    res.status(500).json({ message: 'Error processing payment', error: error.message })
  }
})

// Approve payment request
router.post('/:id/approve-payment', requireUser, async (req, res) => {
  try {
    const { approve } = req.body
    
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    })

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (!item.paymentRequest) {
      return res.status(400).json({ message: 'No payment request found' })
    }

    if (approve) {
      item.status = 'paid'
      item.markedAsPaidBy = 'customer'
      item.markedAsPaidAt = new Date()
      item.paymentRequest = undefined
    } else {
      // Keep the payment request but mark as rejected for audit
      item.paymentRequest.status = 'rejected'
      item.paymentRequest.rejectedAt = new Date()
    }

    await item.save()

    // Send notification
    const io = req.app.get('io')
    await notifyUser(
      io,
      req.user._id,
      approve ? 'Payment Approved' : 'Payment Rejected',
      `Invoice ${item.invoiceNumber} payment has been ${approve ? 'approved and moved to paid items' : 'rejected'}`,
      approve ? 'success' : 'warning'
    )

    res.json({ 
      message: `Payment ${approve ? 'approved' : 'rejected'} successfully`,
      item 
    })
  } catch (error) {
    console.error('Error processing payment approval:', error)
    res.status(500).json({ message: 'Error processing payment approval', error: error.message })
  }
})

export default router