import { useState, useEffect } from 'react'
import { 
  FiUsers, 
  FiPackage, 
  FiMessageSquare, 
  FiDollarSign,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiUpload,
  FiSend,
  FiRefreshCw,
  FiStar,
  FiEye,
  FiCornerUpLeft,
  FiShield,
  FiUserPlus,
  FiKey,
  FiSettings,
  FiActivity
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function GlobalAdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [advertisements, setAdvertisements] = useState([])
  const [globalAdmins, setGlobalAdmins] = useState([])
  const [escrowTickets, setEscrowTickets] = useState([])
  const [selectedEscrowTicket, setSelectedEscrowTicket] = useState(null)
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdForm, setShowAdForm] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [adFormData, setAdFormData] = useState({
    name: '',
    description: '',
    duration: 'week',
    mediaUrl: ''
  })
  const [messageData, setMessageData] = useState({
    subject: '',
    message: ''
  })
  const [broadcastData, setBroadcastData] = useState({
    subject: '',
    message: ''
  })
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: ''
  })
  const [replyMessage, setReplyMessage] = useState('')
  const [escrowReplyMessage, setEscrowReplyMessage] = useState('')
  const [adFile, setAdFile] = useState(null)

  useEffect(() => {
    fetchCurrentAdmin()
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'advertisements') {
      fetchAdvertisements()
    } else if (activeTab === 'tickets') {
      fetchTickets()
    } else if (activeTab === 'admins') {
      fetchGlobalAdmins()
    } else if (activeTab === 'escrow') {
      fetchEscrowTickets()
    }
  }, [activeTab])

  const fetchCurrentAdmin = async () => {
    try {
      const response = await axios.get('/global-admin/profile')
      setCurrentAdmin(response.data.admin)
      console.log('Current admin loaded:', response.data.admin)
    } catch (error) {
      console.error('Error fetching current admin:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/global-admin/dashboard')
      setStats(response.data.stats)
    } catch (error) {
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/global-admin/users')
      setUsers(response.data.users)
    } catch (error) {
      toast.error('Error loading users')
    }
  }

  const fetchTickets = async () => {
    try {
      const response = await axios.get('/global-admin/tickets')
      setTickets(response.data.tickets)
    } catch (error) {
      toast.error('Error loading tickets')
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await axios.get(`/global-admin/tickets/${ticketId}`)
      setSelectedTicket(response.data)
    } catch (error) {
      toast.error('Error loading ticket details')
    }
  }

  const fetchAdvertisements = async () => {
    try {
      const response = await axios.get('/global-admin/advertisements')
      setAdvertisements(response.data.advertisements)
    } catch (error) {
      toast.error('Error loading advertisements')
    }
  }

  const fetchGlobalAdmins = async () => {
    try {
      console.log('Fetching global admins...')
      const response = await axios.get('/global-admin/admins')
      console.log('Global admins response:', response.data)
      setGlobalAdmins(response.data.admins || [])
    } catch (error) {
      console.error('Error loading global admins:', error)
      if (error.response?.status === 403) {
        toast.error('Only the original Global Admin can view admin list')
      } else {
        toast.error('Error loading global admins')
      }
      setGlobalAdmins([])
    }
  }

  const fetchEscrowTickets = async () => {
    try {
      const response = await axios.get('/global-admin/escrow-tickets')
      setEscrowTickets(response.data.tickets)
    } catch (error) {
      toast.error('Error loading escrow tickets')
    }
  }

  const fetchEscrowTicketDetails = async (ticketId) => {
    try {
      const response = await axios.get(`/global-admin/escrow-tickets/${ticketId}`)
      setSelectedEscrowTicket(response.data)
    } catch (error) {
      toast.error('Error loading escrow ticket details')
    }
  }

  const handleToggleUserStatus = async (userId) => {
    try {
      await axios.patch(`/global-admin/users/${userId}/toggle-status`)
      toast.success('User status updated successfully')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating user status')
    }
  }

  const handleToggleRecommendation = async (userId) => {
    try {
      await axios.patch(`/global-admin/users/${userId}/toggle-recommendation`)
      toast.success('User recommendation status updated')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating recommendation')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await axios.delete(`/global-admin/users/${userId}`)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user')
    }
  }

  const handleRecoverUser = async (userId) => {
    try {
      await axios.patch(`/global-admin/users/${userId}/recover`)
      toast.success('User recovered successfully')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error recovering user')
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    
    try {
      console.log('Creating admin with data:', newAdminData)
      console.log('Current admin status:', currentAdmin)
      
      const response = await axios.post('/global-admin/create-admin', newAdminData)
      console.log('Create admin response:', response.data)
      
      toast.success('Global admin created successfully')
      setShowCreateAdminModal(false)
      setNewAdminData({ email: '', password: '' })
      fetchGlobalAdmins()
    } catch (error) {
      console.error('Error creating admin:', error.response?.data)
      toast.error(error.response?.data?.message || 'Error creating global admin')
    }
  }

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this global admin?')) return

    try {
      await axios.delete(`/global-admin/admins/${adminId}`)
      toast.success('Global admin deleted successfully')
      fetchGlobalAdmins()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting global admin')
    }
  }

  const handleCreateAd = async (e) => {
    e.preventDefault()
    
    try {
      const formData = new FormData()
      formData.append('name', adFormData.name)
      formData.append('description', adFormData.description)
      formData.append('duration', adFormData.duration)
      formData.append('mediaUrl', adFormData.mediaUrl)
      
      if (adFile) {
        formData.append('media', adFile)
      }

      await axios.post('/global-admin/advertisements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Advertisement created successfully')
      setShowAdForm(false)
      setAdFormData({ name: '', description: '', duration: 'week', mediaUrl: '' })
      setAdFile(null)
      fetchAdvertisements()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating advertisement')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post(`/global-admin/send-message/${selectedUser._id}`, messageData)
      toast.success('Message sent successfully')
      setShowMessageModal(false)
      setMessageData({ subject: '', message: '' })
      setSelectedUser(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending message')
    }
  }

  const handleBroadcastMessage = async (e) => {
    e.preventDefault()
    
    try {
      const response = await axios.post('/global-admin/broadcast-message', broadcastData)
      toast.success(`Broadcast sent to ${response.data.recipientCount} users`)
      setShowBroadcastModal(false)
      setBroadcastData({ subject: '', message: '' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error broadcasting message')
    }
  }

  const handleTicketReply = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post(`/global-admin/tickets/${selectedTicket._id}/reply`, {
        message: replyMessage
      })
      toast.success('Reply sent successfully')
      setReplyMessage('')
      fetchTicketDetails(selectedTicket._id)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending reply')
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to delete this support ticket?')) return

    try {
      await axios.delete(`/global-admin/tickets/${ticketId}`)
      toast.success('Support ticket deleted successfully')
      fetchTickets()
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket(null)
      }
    } catch (error) {
      console.error('Delete ticket error:', error.response?.data)
      if (error.response?.status === 403) {
        toast.error('Only the original Global Admin can delete support tickets')
      } else {
        toast.error(error.response?.data?.message || 'Error deleting ticket')
      }
    }
  }

  const handleEscrowReply = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post(`/global-admin/escrow-tickets/${selectedEscrowTicket._id}/message`, {
        message: escrowReplyMessage
      })
      toast.success('Message sent successfully')
      setEscrowReplyMessage('')
      fetchEscrowTicketDetails(selectedEscrowTicket._id)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending message')
    }
  }

  const handleDeleteAd = async (adId) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return

    try {
      await axios.delete(`/global-admin/advertisements/${adId}`)
      toast.success('Advertisement deleted successfully')
      fetchAdvertisements()
    } catch (error) {
      toast.error('Error deleting advertisement')
    }
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: FiActivity },
    { id: 'users', name: 'Users', icon: FiUsers },
    { id: 'tickets', name: 'Support Tickets', icon: FiMessageSquare },
    { id: 'escrow', name: 'Escrow Tickets', icon: FiShield },
    { id: 'advertisements', name: 'Advertisements', icon: FiUpload },
    ...(currentAdmin?.isOriginal ? [{ id: 'admins', name: 'Global Admins', icon: FiUserPlus }] : [])
  ]

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: FiUsers,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers || 0,
      icon: FiUsers,
      color: 'bg-green-500'
    },
    {
      title: 'Total Items',
      value: stats.totalItems || 0,
      icon: FiPackage,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Revenue',
      value: `₦${stats.totalRevenue?.toLocaleString() || '0'}`,
      icon: FiDollarSign,
      color: 'bg-yellow-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Global Admin Dashboard</h1>
                <p className="text-gray-600">Manage your entire platform from here</p>
                {currentAdmin && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Logged in as:</span>
                    <span className="text-sm font-medium text-gray-900">{currentAdmin.email}</span>
                    {currentAdmin.isOriginal && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        Original Admin
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="btn-primary"
              >
                <FiSend className="w-4 h-4 mr-2" />
                Broadcast Message
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <div key={index} className="card">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${card.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {card.value}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Status</span>
                    <span className="text-green-600 font-medium">Operational</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Open Tickets</span>
                    <span className="font-medium">{stats.openTickets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Tickets</span>
                    <span className="font-medium">{stats.totalTickets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Escrow Tickets</span>
                    <span className="font-medium">{stats.totalEscrowTickets || 0}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <FiUsers className="w-5 h-5 text-blue-500 mr-3" />
                      <span>Manage Users</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <FiMessageSquare className="w-5 h-5 text-green-500 mr-3" />
                      <span>Support Tickets</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('escrow')}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <FiShield className="w-5 h-5 text-purple-500 mr-3" />
                      <span>Escrow Management</span>
                    </div>
                  </button>
                  {currentAdmin?.isOriginal && (
                    <button
                      onClick={() => setActiveTab('admins')}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <FiUserPlus className="w-5 h-5 text-red-500 mr-3" />
                        <span>Manage Global Admins</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Admins Tab - Only for Original Admin */}
        {activeTab === 'admins' && currentAdmin?.isOriginal && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Global Admin Management</h2>
                <p className="text-sm text-gray-600">Create and manage global administrator accounts</p>
              </div>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="btn-primary"
              >
                <FiUserPlus className="w-4 h-4 mr-2" />
                Create Global Admin
              </button>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {globalAdmins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {admin.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {admin._id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            admin.isOriginal 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {admin.isOriginal ? 'Original Admin' : 'Created Admin'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!admin.isOriginal && (
                            <button
                              onClick={() => handleDeleteAdmin(admin._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Admin"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {globalAdmins.length === 0 && (
                <div className="text-center py-8">
                  <FiUserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No global admins found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={fetchUsers}
                className="btn-secondary"
              >
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommended
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=3b82f6&color=fff`}
                              alt="Profile"
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.adminConfig?.isAdmin 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.adminConfig?.isAdmin ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleRecommendation(user._id)}
                            className={`p-2 rounded-lg ${
                              user.isRecommended 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={user.isRecommended ? 'Remove Recommendation' : 'Mark as Recommended'}
                          >
                            <FiStar className={`w-4 h-4 ${user.isRecommended ? 'fill-current' : ''}`} />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleUserStatus(user._id)}
                              className={`p-2 rounded-lg ${
                                user.isActive 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Disable User' : 'Enable User'}
                            >
                              {user.isActive ? <FiToggleRight className="w-4 h-4" /> : <FiToggleLeft className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowMessageModal(true)
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Send Message"
                            >
                              <FiSend className="w-4 h-4" />
                            </button>
                            {user.isDeleted ? (
                              <button
                                onClick={() => handleRecoverUser(user._id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Recover User"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete User"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Support Tickets</h3>
                  <button onClick={fetchTickets} className="text-gray-400 hover:text-gray-600">
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                {tickets.length > 0 ? (
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
                            {ticket.subject}
                          </h4>
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {ticket.status.replace('-', ' ')}
                            </span>
                            {ticket.type === 'public' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Public
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {ticket.displayName} ({ticket.displayEmail})
                        </p>
                        
                        <p className="text-xs text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No support tickets yet</p>
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
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedTicket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          selectedTicket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTicket.status.replace('-', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          From: {selectedTicket.displayName} ({selectedTicket.displayEmail})
                        </span>
                        {selectedTicket.type === 'public' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Public Support
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {currentAdmin?.isOriginal && (
                      <button
                        onClick={() => handleDeleteTicket(selectedTicket._id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        title="Delete Ticket (Original Admin Only)"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {selectedTicket.messages?.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            message.sender === 'admin'
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'admin' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {message.sender === 'admin' ? 'Admin' : 'User'} • {' '}
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  {selectedTicket.status !== 'closed' && (
                    <form onSubmit={handleTicketReply} className="border-t pt-4">
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
                          disabled={!replyMessage.trim()}
                          className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiCornerUpLeft className="w-4 h-4" />
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
        )}

        {/* Escrow Tickets Tab */}
        {activeTab === 'escrow' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Escrow Tickets List */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Escrow Tickets</h3>
                  <button onClick={fetchEscrowTickets} className="text-gray-400 hover:text-gray-600">
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                {escrowTickets.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {escrowTickets.map((ticket) => (
                      <div
                        key={ticket._id}
                        onClick={() => fetchEscrowTicketDetails(ticket._id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedEscrowTicket?._id === ticket._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                            {ticket.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
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
                            ₦{ticket.transactionAmount.toLocaleString()} {ticket.currency}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          {new Date(ticket.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiShield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No escrow tickets yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Escrow Ticket Details */}
            <div className="lg:col-span-2">
              {selectedEscrowTicket ? (
                <div className="card">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedEscrowTicket.title}
                      </h2>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedEscrowTicket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedEscrowTicket.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedEscrowTicket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedEscrowTicket.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {selectedEscrowTicket.category.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <img
                            src={selectedEscrowTicket.initiatorId.profileImage || `https://ui-avatars.com/api/?name=${selectedEscrowTicket.initiatorId.firstName}+${selectedEscrowTicket.initiatorId.lastName}&background=3b82f6&color=fff`}
                            alt="Initiator"
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedEscrowTicket.initiatorId.firstName} {selectedEscrowTicket.initiatorId.lastName}
                            </p>
                            <p className="text-xs text-gray-500">Initiator</p>
                          </div>
                        </div>
                        
                        <span className="text-gray-400">↔</span>
                        
                        <div className="flex items-center space-x-2">
                          <img
                            src={selectedEscrowTicket.recipientId.profileImage || `https://ui-avatars.com/api/?name=${selectedEscrowTicket.recipientId.firstName}+${selectedEscrowTicket.recipientId.lastName}&background=3b82f6&color=fff`}
                            alt="Recipient"
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedEscrowTicket.recipientId.firstName} {selectedEscrowTicket.recipientId.lastName}
                            </p>
                            <p className="text-xs text-gray-500">Recipient</p>
                          </div>
                        </div>
                      </div>

                      {selectedEscrowTicket.transactionAmount > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <p className="text-sm font-medium text-green-800">
                            Transaction Amount: ₦{selectedEscrowTicket.transactionAmount.toLocaleString()} {selectedEscrowTicket.currency}
                          </p>
                        </div>
                      )}

                      <p className="text-gray-600 text-sm">{selectedEscrowTicket.description}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {selectedEscrowTicket.messages?.map((message, index) => (
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

                  {/* Admin Reply Form */}
                  <form onSubmit={handleEscrowReply} className="border-t pt-4">
                    <div className="flex space-x-3">
                      <textarea
                        value={escrowReplyMessage}
                        onChange={(e) => setEscrowReplyMessage(e.target.value)}
                        placeholder="Send message as Global Admin..."
                        rows="3"
                        className="flex-1 input-field resize-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={!escrowReplyMessage.trim()}
                        className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
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
        )}

        {/* Advertisements Tab */}
        {activeTab === 'advertisements' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Advertisement Management</h2>
              <button
                onClick={() => setShowAdForm(true)}
                className="btn-primary"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Create Advertisement
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advertisements.map((ad) => (
                <div key={ad._id} className="card">
                  <div className="mb-4">
                    {ad.mediaType === 'image' ? (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={ad.mediaUrl}
                        className="w-full h-48 object-cover rounded-lg"
                        controls
                      />
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{ad.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{ad.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      ad.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ad.duration}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteAd(ad._id)}
                      className="flex-1 text-red-600 hover:bg-red-50 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Global Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create Global Admin
            </h3>
            
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="Enter admin email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field"
                  placeholder="Enter admin password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Created admins will have full platform access except:
                </p>
                <ul className="text-sm text-yellow-700 mt-1 ml-4 list-disc">
                  <li>Cannot delete support tickets</li>
                  <li>Cannot manage other global admins</li>
                  <li>Cannot modify the original admin account</li>
                </ul>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Advertisement Modal */}
      {showAdForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create Advertisement
            </h3>
            
            <form onSubmit={handleCreateAd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advertisement Name *
                </label>
                <input
                  type="text"
                  required
                  value={adFormData.name}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter advertisement name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={adFormData.description}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows="3"
                  placeholder="Enter advertisement description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration *
                </label>
                <select
                  value={adFormData.duration}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, duration: e.target.value }))}
                  className="input-field"
                >
                  <option value="day">1 Day</option>
                  <option value="week">1 Week</option>
                  <option value="month">1 Month</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Media
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setAdFile(e.target.files[0])}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Media URL
                </label>
                <input
                  type="url"
                  value={adFormData.mediaUrl}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create Advertisement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Message to {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={messageData.subject}
                  onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field"
                  placeholder="Enter message subject"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  value={messageData.message}
                  onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
                  className="input-field"
                  rows="4"
                  placeholder="Enter your message"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Message Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Broadcast Message to All Users
            </h3>
            
            <form onSubmit={handleBroadcastMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastData.subject}
                  onChange={(e) => setBroadcastData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field"
                  placeholder="Enter broadcast subject"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                  className="input-field"
                  rows="4"
                  placeholder="Enter your broadcast message"
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  This message will be sent to all active users on the platform.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}