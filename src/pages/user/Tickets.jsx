import { useState, useEffect } from 'react'
import { 
  FiPlus, 
  FiMessageSquare, 
  FiClock, 
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiArrowLeft
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewTicketForm, setShowNewTicketForm] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'other'
  })
  const [replyMessage, setReplyMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await axios.get('/tickets')
      setTickets(response.data.tickets)
    } catch (error) {
      toast.error('Error loading tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await axios.get(`/tickets/${ticketId}`)
      setSelectedTicket(response.data)
    } catch (error) {
      toast.error('Error loading ticket details')
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      await axios.post('/tickets', newTicketData)
      toast.success('Support ticket created successfully')
      setShowNewTicketForm(false)
      setNewTicketData({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'other'
      })
      fetchTickets()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating ticket')
    } finally {
      setSending(false)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim()) return

    setSending(true)

    try {
      await axios.post(`/tickets/${selectedTicket._id}/reply`, {
        message: replyMessage
      })
      
      setReplyMessage('')
      fetchTicketDetails(selectedTicket._id)
      toast.success('Reply sent successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending reply')
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to close this ticket?')) return

    try {
      await axios.patch(`/tickets/${ticketId}/close`)
      toast.success('Ticket closed successfully')
      fetchTickets()
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket(null)
      }
    } catch (error) {
      toast.error('Error closing ticket')
    }
  }

  const getStatusIcon = (status) => {
    const icons = {
      open: <FiMessageSquare className="w-4 h-4 text-blue-500" />,
      'in-progress': <FiClock className="w-4 h-4 text-yellow-500" />,
      resolved: <FiCheckCircle className="w-4 h-4 text-green-500" />,
      closed: <FiXCircle className="w-4 h-4 text-gray-500" />
    }
    return icons[status] || icons.open
  }

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.open
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return badges[priority] || badges.medium
  }

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const categoryOptions = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing' },
    { value: 'account', label: 'Account' },
    { value: 'feature-request', label: 'Feature Request' },
    { value: 'other', label: 'Other' }
  ]

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="card h-96 bg-gray-200"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Tickets</h1>
          <p className="text-gray-600">Get help and support from our team</p>
        </div>
        <button
          onClick={() => setShowNewTicketForm(true)}
          className="btn-primary mt-4 sm:mt-0"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Your Tickets</h3>
            
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => fetchTicketDetails(ticket._id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedTicket?._id === ticket._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {ticket.subject}
                      </h4>
                      {getStatusIcon(ticket.status)}
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                        {ticket.status.replace('-', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No support tickets yet</p>
                <button
                  onClick={() => setShowNewTicketForm(true)}
                  className="btn-primary"
                >
                  Create Your First Ticket
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="card">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedTicket.subject}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('-', ' ')}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(selectedTicket.priority)}`}>
                      {selectedTicket.priority} priority
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedTicket.category.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                
                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={() => handleCloseTicket(selectedTicket._id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {selectedTicket.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {message.sender === 'user' ? 'You' : 'Support'} • {' '}
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleSendReply} className="border-t pt-4">
                  <div className="flex space-x-3">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      rows="3"
                      className="flex-1 input-field resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyMessage.trim()}
                      className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FiMessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a ticket to view details
              </h3>
              <p className="text-gray-600">
                Choose a ticket from the list to see the conversation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Support Ticket
              </h3>
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketData.subject}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field"
                  placeholder="Brief description of your issue"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={newTicketData.description}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                  rows="4"
                  className="input-field"
                  placeholder="Provide detailed information about your issue"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTicketData.priority}
                    onChange={(e) => setNewTicketData(prev => ({ ...prev, priority: e.target.value }))}
                    className="input-field"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTicketData.category}
                    onChange={(e) => setNewTicketData(prev => ({ ...prev, category: e.target.value }))}
                    className="input-field"
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}