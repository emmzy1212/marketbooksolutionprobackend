import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiShield, FiKey, FiEye, FiEyeOff, FiLogIn, FiUserPlus } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AdminAccess() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/profile')
      setUser(response.data.user)
    } catch (error) {
      toast.error('Error loading profile')
    }
  }

  const handleRegisterAdmin = async () => {
    if (!confirm('Are you sure you want to register as admin? This can only be done once.')) {
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/admin/register')
      setGeneratedPassword(response.data.adminPassword)
      toast.success('Admin access created successfully!')
      fetchUserProfile()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating admin access')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/admin/login', {
        adminPassword
      })
      
      // Store admin token
      localStorage.setItem('userAdminToken', response.data.adminToken)
      toast.success('Admin login successful!')
      navigate('/user-admin')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
        <p className="text-gray-600">
          Manage your admin privileges and access advanced features
        </p>
      </div>

      <div className="card">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Admin Control Panel
          </h2>
          <p className="text-gray-600">
            Access advanced features to manage your items and data
          </p>
        </div>

        {!user?.adminConfig?.isAdmin ? (
          /* Register as Admin */
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Admin Access Not Configured
              </h3>
              <p className="text-blue-700 text-sm mb-4">
                Register as admin to unlock advanced features like editing and deleting items, 
                viewing detailed analytics, and managing your marketplace data.
              </p>
              <ul className="text-left text-sm text-blue-700 space-y-1 mb-4">
                <li>• Edit and delete any of your items</li>
                <li>• Access detailed analytics and reports</li>
                <li>• Advanced item management tools</li>
                <li>• Priority support access</li>
              </ul>
            </div>

            <button
              onClick={handleRegisterAdmin}
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiUserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Setting up...' : 'Register as Admin'}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Note: Admin registration can only be done once per account
            </p>
          </div>
        ) : (
          /* Login as Admin */
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <FiShield className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  Admin access is configured for your account
                </span>
              </div>
            </div>

            {generatedPassword && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  Your Admin Password
                </h4>
                <div className="flex items-center space-x-2">
                  <code className="bg-yellow-100 px-3 py-2 rounded text-yellow-900 font-mono">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword)
                      toast.success('Password copied to clipboard')
                    }}
                    className="text-yellow-700 hover:text-yellow-800 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-yellow-700 text-sm mt-2">
                  Save this password securely. You'll need it to access admin features.
                </p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="Enter your admin password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiLogIn className="w-4 h-4 mr-2" />
                {loading ? 'Logging in...' : 'Login as Admin'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Admin Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Full edit and delete access to your items</li>
                <li>• Advanced analytics and reporting</li>
                <li>• Bulk operations and management tools</li>
                <li>• Enhanced invoice management</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}