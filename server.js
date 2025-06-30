import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

// Import routes
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import globalAdminRoutes from './routes/globalAdmin.js'
import notificationRoutes from './routes/notifications.js'
import ticketRoutes from './routes/tickets.js'
import advertisementRoutes from './routes/advertisements.js'
import escrowRoutes from './routes/escrow.js'
import globalAdminEscrowRoutes from './routes/globalAdminEscrow.js'

// Import middleware
import { authenticateToken } from './middleware/auth.js'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
})
app.use('/api/', limiter)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Socket.io setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined room`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Make io available to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/items', authenticateToken, itemRoutes)
app.use('/api/users', authenticateToken, userRoutes)
app.use('/api/admin', authenticateToken, adminRoutes)
app.use('/api/global-admin', globalAdminRoutes)
app.use('/api/notifications', authenticateToken, notificationRoutes)
app.use('/api/tickets', authenticateToken, ticketRoutes)
app.use('/api/advertisements', advertisementRoutes)
app.use('/api/escrow', authenticateToken, escrowRoutes)
app.use('/api/global-admin/escrow', globalAdminEscrowRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

const PORT = process.env.PORT || 5000

// Async function to start the server
async function startServer() {
  try {
    // Connect to MongoDB with proper error handling
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketbook-solution')
    
    console.log('Connected to MongoDB successfully')
    
    // Start the server only after successful database connection
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
    })
    
  } catch (error) {
    console.error('Failed to start server:', error.message)
    console.error('Error details:', error)
    
    // Exit the process if we can't connect to the database
    process.exit(1)
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  try {
    await mongoose.connection.close()
    console.log('MongoDB connection closed')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
})

// Start the server
startServer()

export { io }