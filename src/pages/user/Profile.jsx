import { useState, useEffect } from 'react'
import { FiUser, FiMail, FiLock, FiSave } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/auth/profile')
      setUser(response.data.user)
    } catch (error) {
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long')
      return
    }

    setUpdating(true)

    try {
      await axios.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error changing password')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="card h-96 bg-gray-200"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your login credentials</p>
      </div>

      {/* Profile Information (Read-only) */}
      <div className="card mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
        
        <div className="flex items-center space-x-6 mb-6">
          <img
            src={user?.profileImage || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=3b82f6&color=fff`}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
          />
          <div>
            <h4 className="text-lg font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </h4>
            <p className="text-sm text-gray-600">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Profile management is handled by User Admin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={user?.firstName || ''}
              disabled
              className="input-field bg-gray-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={user?.lastName || ''}
              disabled
              className="input-field bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input-field bg-gray-50 cursor-not-allowed"
          />
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Profile information, billing details, and bank information can only be updated by a User Admin. 
            Contact your User Admin to make changes to these details.
          </p>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Change Password</h3>
        <p className="text-sm text-gray-600 mb-6">
          Update your login password to keep your account secure
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="input-field"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="input-field"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="input-field"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiLock className="w-4 h-4 mr-2" />
            {updating ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}