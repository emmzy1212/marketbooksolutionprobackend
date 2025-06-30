import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiLogOut, 
  FiPackage, 
  FiDollarSign, 
  FiClock, 
  FiXCircle,
  FiEdit3,
  FiTrash2,
  FiTrendingUp
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function UserAdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [dashboardResponse, itemsResponse] = await Promise.all([
        axios.get('/admin/dashboard'),
        axios.get('/admin/items?limit=20')
      ])
      
      setStats(dashboardResponse.data.stats)
      setItems(itemsResponse.data.items)
    } catch (error) {
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAdmin = () => {
    localStorage.removeItem('userAdminToken')
    toast.success('Logged out from admin panel')
    navigate('/dashboard')
  }

  const handleEditItem = (item) => {
    setEditingItem(item._id)
    setEditData({
      name: item.name,
      description: item.description,
      price: item.price,
      status: item.status,
      category: item.category
    })
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault()
    
    try {
      await axios.put(`/admin/items/${editingItem}`, editData)
      toast.success('Item updated successfully')
      setEditingItem(null)
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating item')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await axios.delete(`/admin/items/${itemId}`)
      toast.success('Item deleted successfully')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting item')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-success-100 text-success-800',
      unpaid: 'bg-error-100 text-error-800',
      pending: 'bg-warning-100 text-warning-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems || 0,
      icon: FiPackage,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Paid Items',
      value: stats.paidItems || 0,
      icon: FiDollarSign,
      color: 'bg-success-500',
      textColor: 'text-success-600'
    },
    {
      title: 'Unpaid Items',
      value: stats.unpaidItems || 0,
      icon: FiXCircle,
      color: 'bg-error-500',
      textColor: 'text-error-600'
    },
    {
      title: 'Pending Items',
      value: stats.pendingItems || 0,
      icon: FiClock,
      color: 'bg-warning-500',
      textColor: 'text-warning-600'
    }
  ]

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-24 bg-gray-200"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Advanced management and analytics</p>
        </div>
        <button
          onClick={handleLogoutAdmin}
          className="flex items-center px-4 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <FiLogOut className="w-4 h-4 mr-2" />
          Exit Admin
        </button>
      </div>

      {/* Stats Cards */}
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
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Revenue Card */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
          <FiTrendingUp className="w-5 h-5 text-success-500" />
        </div>
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-success-600">
            ${stats.totalRevenue?.toLocaleString() || '0'}
          </span>
          <span className="ml-2 text-sm text-gray-500">from paid items</span>
        </div>
      </div>

      {/* Items Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Items Management</h3>
          <span className="text-sm text-gray-500">
            {items.length} items
          </span>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          {item.category && (
                            <div className="text-sm text-gray-500">
                              {item.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${item.price?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No items to manage</p>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Item
            </h3>
            
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editData.price}
                    onChange={(e) => setEditData(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                    className="input-field"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={editData.category}
                  onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}