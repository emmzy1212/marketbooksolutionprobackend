import express from 'express'
import Advertisement from '../models/Advertisement.js'

const router = express.Router()

// Get active advertisements (public endpoint)
router.get('/active', async (req, res) => {
  try {
    const now = new Date()
    const advertisements = await Advertisement.find({
      isActive: true,
      endDate: { $gt: now }
    }).sort({ createdAt: -1 })

    res.json({ advertisements })
  } catch (error) {
    console.error('Error fetching active advertisements:', error)
    res.status(500).json({ message: 'Error fetching advertisements', error: error.message })
  }
})

export default router