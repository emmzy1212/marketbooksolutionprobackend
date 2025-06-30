import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiPlus, 
  FiSearch, 
  FiFilter, 
  FiDownload,
  FiMail,
  FiEye,
  FiPackage,
  FiCheck,
  FiX,
  FiShield
} from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Items() {
  const [items, setItems] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [invoiceData, setInvoiceData] = useState({
    customerEmail: '',
    customerName: '',
    customerAddress: '',
    notes: ''
  })

  useEffect(() => {
    fetchItems()
    fetchUserProfile()
  }, [currentPage, statusFilter, searchTerm])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/profile')
      setUser(response.data.user)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/items', {
        params: {
          page: currentPage,
          limit: 12,
          status: statusFilter,
          search: searchTerm
        }
      })
      
      setItems(response.data.items)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      toast.error('Error loading items')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async (itemId) => {
    try {
      const response = await axios.get(`/items/${itemId}/invoice`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${itemId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Invoice downloaded successfully')
    } catch (error) {
      toast.error('Error downloading invoice')
    }
  }

  const handleSendInvoice = async (e) => {
    e.preventDefault()
    
    try {
      await axios.post(`/items/${selectedItem._id}/send-invoice`, invoiceData)
      toast.success('Invoice sent successfully')
      setShowInvoiceModal(false)
      setInvoiceData({
        customerEmail: '',
        customerName: '',
        customerAddress: '',
        notes: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending invoice')
    }
  }

  const handlePaymentApproval = async (itemId, approve) => {
    try {
      await axios.post(`/items/${itemId}/approve-payment`, { approve })
      toast.success(`Payment ${approve ? 'approved' : 'rejected'} successfully`)
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing payment approval')
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

  const statusOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'pending', label: 'Pending' }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Items</h1>
          <p className="text-gray-600">Manage your marketplace items and invoices</p>
        </div>
        <Link to="/add-item" className="btn-primary mt-4 sm:mt-0">
          <FiPlus className="w-4 h-4 mr-2" />
          Add New Item
        </Link>
      </div>

      {/* Admin Access Notice - Only show if user is NOT an admin */}
      {!user?.adminConfig?.isAdmin && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FiShield className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Edit & Delete Permissions</h3>
              <p className="text-sm text-blue-800">
                Only User Admins have permission to edit or delete items (Paid, Unpaid, and Pending Items). 
                Regular users are restricted from performing these actions to ensure data integrity and proper oversight.
              </p>
              <Link 
                to="/admin-access" 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
              >
                Get Admin Access →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {items.map((item) => (
              <div key={item._id} className="card hover:shadow-lg transition-shadow">
                {item.image && (
                  <div className="mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-primary-600">
                      ₦{item.price?.toLocaleString()}
                    </span>
                    {item.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Invoice: {item.invoiceNumber}</p>
                    <p>Created: {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Payment Request Notification */}
                  {item.paymentRequest && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 mb-2">
                        Payment confirmation requested
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePaymentApproval(item._id, true)}
                          className="flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          <FiCheck className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handlePaymentApproval(item._id, false)}
                          className="flex items-center px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          <FiX className="w-3 h-3 mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only show download and send invoice for regular users */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadInvoice(item._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download Invoice"
                    >
                      <FiDownload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item)
                        setShowInvoiceModal(true)
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Send Invoice"
                    >
                      <FiMail className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Show admin notice for regular users */}
                  {!user?.adminConfig?.isAdmin && (
                    <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                      Admin Only: Edit/Delete
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 border rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first item'
            }
          </p>
          <Link to="/add-item" className="btn-primary">
            <FiPlus className="w-4 h-4 mr-2" />
            Add Your First Item
          </Link>
        </div>
      )}

      {/* Send Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Invoice - {selectedItem?.name}
            </h3>
            
            <form onSubmit={handleSendInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email *
                </label>
                <input
                  type="email"
                  required
                  value={invoiceData.customerEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="input-field"
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={invoiceData.customerName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-field"
                  placeholder="Customer Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Address
                </label>
                <textarea
                  value={invoiceData.customerAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, customerAddress: e.target.value }))}
                  className="input-field"
                  rows="3"
                  placeholder="Customer billing address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                  rows="2"
                  placeholder="Additional notes for the invoice"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Send Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}