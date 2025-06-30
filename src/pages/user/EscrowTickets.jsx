import { useState, useEffect } from 'react'
import { 
  FiPlus, 
  FiSearch, 
  FiSend,
  FiCheck,
  FiX,
  FiClock,
  FiShield,
  FiUser,
  FiMail,
  FiDollarSign,
  FiMessageSquare,
  FiEye,
  FiXCircle
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function EscrowTickets() {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    recipientId: '',
    recipientName: '',
    transactionAmount: '',
    currency: 'NGN',
    category: 'other'
  })
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchTickets()
  }, [activeTab])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = { 
        limit: 50,
        ...(activeTab !== 'all' && { type: activeTab })
      }
      
      const response = await axios.get('/escrow/my-tickets', { params })
      setTickets(response.data.tickets)
    } catch (error) {
      toast.error('Error loading escrow tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await axios.get(`/escrow/tickets/${ticketId}`)
      setSelectedTicket(response.data)
    } catch (error) {
      toast.error('Error loading ticket details')
    }
  }

  const handleUserSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await axios.get(`/escrow/search-users?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectUser = (user) => {
    setNewTicketData(prev => ({
      ...prev,
      recipientId: user._id,
      recipientName: `${user.firstName} ${user.lastName}`
    }))
    setShowUserSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      await axios.post('/escrow/create', newTicketData)
      toast.success('Escrow invitation sent successfully')
      setShowCreateForm(false)
      setNewTicketData({
        title: '',
        description: '',
        recipientId: '',
        recipientName: '',
        transactionAmount: '',
        currency: 'NGN',
        category: 'other'
      })
      fetchTickets()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating escrow ticket')
    } finally {
      setSending(false)
    }
  }

  const handleRespondToInvitation = async (ticketId, action) => {
    try {
      await axios.patch(`/escrow/tickets/${ticketId}/respond`, { action })
      toast.success(`Invitation ${action}ed successfully`)
      fetchTickets()
      if (selectedTicket?._id === ticketId) {
        fetchTicketDetails(ticketId)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error responding to invitation')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSending(true)
    try {
      await axios.post(`/escrow/tickets/${selectedTicket._id}/message`, {
        message: newMessage
      })
      
      setNewMessage('')
      fetchTicketDetails(selectedTicket._id)
      toast.success('Message sent successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending message')
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to close this escrow ticket?')) return

    try {
      await axios.patch(`/escrow/tickets/${ticketId}/close`)
      toast.success('Escrow ticket closed successfully')
      fetchTickets()
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket(null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error closing ticket')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return badges[status] || badges.pending
  }

  const getInvitationBadge = (status) => {
    const badges = {
      pending: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800'
    }
    return badges[status] || badges.pending
  }

  const categoryOptions = [
    { value: 'goods', label: 'Physical Goods' },
    { value: 'services', label: 'Services' },
    { value: 'digital', label: 'Digital Products' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'other', label: 'Other' }
  ]

  const tabs = [
    { id: 'all', name: 'All Tickets', count: tickets.length },
    { id: 'initiated', name: 'Initiated', count: tickets.filter(t => t.initiatorId._id === tickets[0]?.initiatorId._id).length },
    { id: 'received', name: 'Received', count: tickets.filter(t => t.recipientId._id === tickets[0]?.recipientId._id).length }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Escrow Tickets</h1>
          <p className="text-gray-600">Secure transaction management with third-party mediation</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary mt-4 sm:mt-0"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Create Escrow
        </button>
      </div>

      {/* Info Banner */}
      <div className="card bg-blue-50 border-blue-200 mb-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FiShield className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Secure Escrow System</h3>
            <p className="text-sm text-blue-800">
              Create secure transaction environments with neutral third-party mediation. Global admins 
              oversee all escrow conversations to ensure fairness and transparency throughout the process.
              All amounts are in Nigerian Naira (₦).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="card">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.name}
                    {tab.count > 0 && (
                      <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
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
                        {ticket.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <img
                        src={ticket.initiatorId.profileImage || `https://ui-avatars.com/api/?name=${ticket.initiatorId.firstName}+${ticket.initiatorId.lastName}&background=3b82f6&color=fff`}
                        alt="Initiator"
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-xs text-gray-600">↔</span>
                      <img
                        src={ticket.recipientId.profileImage || `https://ui-avatars.com/api/?name=${ticket.recipientId.firstName}+${ticket.recipientId.lastName}&background=3b82f6&color=fff`}
                        alt="Recipient"
                        className="w-6 h-6 rounded-full"
                      />
                    </div>

                    {ticket.transactionAmount > 0 && (
                      <p className="text-sm font-medium text-green-600 mb-2">
                        ₦{ticket.transactionAmount.toLocaleString()}
                      </p>
                    )}

                    {ticket.invitationStatus === 'pending' && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInvitationBadge(ticket.invitationStatus)}`}>
                        Invitation Pending
                      </span>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(ticket.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiShield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No escrow tickets yet</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Create Your First Escrow
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
                    {selectedTicket.title}
                  </h2>
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                    {selectedTicket.invitationStatus === 'pending' && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getInvitationBadge(selectedTicket.invitationStatus)}`}>
                        Invitation {selectedTicket.invitationStatus}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {selectedTicket.category.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <img
                        src={selectedTicket.initiatorId.profileImage || `https://ui-avatars.com/api/?name=${selectedTicket.initiatorId.firstName}+${selectedTicket.initiatorId.lastName}&background=3b82f6&color=fff`}
                        alt="Initiator"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTicket.initiatorId.firstName} {selectedTicket.initiatorId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">Initiator</p>
                      </div>
                    </div>
                    
                    <span className="text-gray-400">↔</span>
                    
                    <div className="flex items-center space-x-2">
                      <img
                        src={selectedTicket.recipientId.profileImage || `https://ui-avatars.com/api/?name=${selectedTicket.recipientId.firstName}+${selectedTicket.recipientId.lastName}&background=3b82f6&color=fff`}
                        alt="Recipient"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTicket.recipientId.firstName} {selectedTicket.recipientId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">Recipient</p>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.transactionAmount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-green-800">
                        Transaction Amount: ₦{selectedTicket.transactionAmount.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-600 text-sm">{selectedTicket.description}</p>
                </div>
                
                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCloseTicket(selectedTicket._id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              {/* Invitation Response (for recipients) */}
              {selectedTicket.invitationStatus === 'pending' && 
               selectedTicket.recipientId._id === selectedTicket.recipientId._id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-yellow-800 mb-2">Escrow Invitation</h4>
                  <p className="text-sm text-yellow-700 mb-4">
                    You have been invited to participate in this escrow transaction. 
                    Please review the details and respond to the invitation.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRespondToInvitation(selectedTicket._id, 'accept')}
                      className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      <FiCheck className="w-4 h-4 mr-2" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondToInvitation(selectedTicket._id, 'decline')}
                      className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      <FiX className="w-4 h-4 mr-2" />
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {selectedTicket.messages?.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.sender === 'admin' ? 'justify-center' :
                      message.sender === 'initiator' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.sender === 'admin'
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : message.sender === 'initiator'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-green-100 text-green-900'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'admin' ? 'text-red-600' :
                        message.sender === 'initiator' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {message.sender === 'admin' ? 'Global Admin' :
                         message.sender === 'initiator' ? 'Initiator' : 'Recipient'} • {' '}
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Form */}
              {selectedTicket.status === 'active' && (
                <form onSubmit={handleSendMessage} className="border-t pt-4">
                  <div className="flex space-x-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows="3"
                      className="flex-1 input-field resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
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
              <FiShield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an escrow ticket to view details
              </h3>
              <p className="text-gray-600">
                Choose a ticket from the list to see the conversation and manage the transaction
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Escrow Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Escrow Ticket
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketData.title}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="Enter escrow title"
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
                  rows="3"
                  className="input-field"
                  placeholder="Describe the transaction details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient *
                </label>
                {newTicketData.recipientName ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">
                      {newTicketData.recipientName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewTicketData(prev => ({ ...prev, recipientId: '', recipientName: '' }))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUserSearch(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-left text-gray-500 hover:bg-gray-50"
                  >
                    Click to search and select recipient
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦) - Optional
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTicketData.transactionAmount}
                    onChange={(e) => setNewTicketData(prev => ({ ...prev, transactionAmount: e.target.value }))}
                    className="input-field pl-8"
                    placeholder="0.00"
                  />
                </div>
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
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !newTicketData.recipientId}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Creating...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Users
              </h3>
              <button
                onClick={() => setShowUserSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleUserSearch(e.target.value)
                }}
                className="input-field pl-10"
                autoFocus
              />
            </div>

            {searching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=3b82f6&color=fff`}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.isRecommended && (
                            <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.businessInfo?.businessName && (
                          <p className="text-sm text-primary-600">
                            {user.businessInfo.businessName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center py-8">
                <FiUser className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No users found</p>
              </div>
            
            )}
          </div>
        </div>
      )}
    </div>
  )
}