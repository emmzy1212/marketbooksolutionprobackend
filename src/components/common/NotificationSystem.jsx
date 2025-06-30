import { useEffect } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

let socket = null

export default function NotificationSystem() {
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !socket) {
      // Use relative URL for WebContainer compatibility
      socket = io(window.location.origin, {
        auth: { token }
      })

      socket.on('notification', (notification) => {
        toast.success(notification.message, {
          duration: 5000,
          position: 'top-right',
        })
      })

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
      })
    }

    return () => {
      if (socket) {
        socket.disconnect()
        socket = null
      }
    }
  }, [])

  return null
}