import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  FiHome, 
  FiPackage, 
  FiUsers, 
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiShield,
  FiChevronDown,
  FiKey
} from 'react-icons/fi'

export default function AdminLayout({ children, user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Admin Dashboard', href: '/user-admin', icon: FiHome },
    { name: 'Manage Items', href: '/user-admin/items', icon: FiPackage },
    { name: 'Analytics', href: '/user-admin/analytics', icon: FiBarChart2 },
    { name: 'Settings', href: '/user-admin/settings', icon: FiSettings },
  ]

  const isActive = (href) => {
    return location.pathname === href || (href === '/user-admin' && location.pathname === '/user-admin/')
  }

  const handleExitAdmin = () => {
    localStorage.removeItem('userAdminToken')
    localStorage.removeItem('userAdminSession')
    navigate('/dashboard')
    setUserMenuOpen(false)
  }

  // Check if admin session is valid (for re-authentication)
  const checkAdminSession = () => {
    const session = localStorage.getItem('userAdminSession')
    if (!session) {
      setShowAdminPasswordPrompt(true)
      return false
    }
    
    // Session expires after 1 hour of inactivity
    const sessionTime = parseInt(session)
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    if (now - sessionTime > oneHour) {
      localStorage.removeItem('userAdminSession')
      setShowAdminPasswordPrompt(true)
      return false
    }
    
    // Update session time on activity
    localStorage.setItem('userAdminSession', now.toString())
    return true
  }

  // Check session on component mount and navigation
  useEffect(() => {
    checkAdminSession()
  }, [location.pathname])

  // Update session on user activity
  useEffect(() => {
    const updateSession = () => {
      const session = localStorage.getItem('userAdminSession')
      if (session) {
        localStorage.setItem('userAdminSession', Date.now().toString())
      }
    }

    const events = ['click', 'keypress', 'scroll', 'mousemove']
    events.forEach(event => {
      document.addEventListener(event, updateSession)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateSession)
      })
    }
  }, [])

  const handleAdminPasswordVerification = async (e) => {
    e.preventDefault()
    setVerifying(true)

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ adminPassword })
      })

      if (response.ok) {
        // Store admin session
        localStorage.setItem('userAdminSession', Date.now().toString())
        setShowAdminPasswordPrompt(false)
        setAdminPassword('')
      } else {
        const error = await response.json()
        alert(error.message || 'Invalid admin password')
      }
    } catch (error) {
      alert('Error verifying admin password')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Password Re-authentication Modal */}
      {showAdminPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiKey className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Admin Access Required
              </h3>
              <p className="text-sm text-gray-600">
                Please enter your admin password to continue accessing the admin panel
              </p>
            </div>
            
            <form onSubmit={handleAdminPasswordVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your admin password"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleExitAdmin}
                  className="flex-1 btn-secondary"
                >
                  Exit Admin
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-red-600 shadow-sm border-b border-red-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/user-admin" className="flex items-center">
                <FiShield className="w-6 h-6 text-white mr-2" />
                <h1 className="text-xl font-bold text-white">
                  Admin Panel
                </h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-red-700 text-white'
                        : 'text-red-100 hover:text-white hover:bg-red-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Admin Status Indicator */}
              <div className="hidden sm:flex items-center space-x-2 bg-red-700 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-red-100">Admin Mode</span>
              </div>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <img
                    src={user?.profileImage || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=dc2626&color=fff`}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-red-300"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-red-200">Administrator</p>
                  </div>
                  <FiChevronDown className="w-4 h-4 text-red-200" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-red-600 font-medium">Admin Mode Active</p>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FiHome className="w-4 h-4 mr-3" />
                        User Dashboard
                      </Link>
                      
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      <button
                        onClick={handleExitAdmin}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiLogOut className="w-4 h-4 mr-3" />
                        Exit Admin Mode
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-red-700"
              >
                {mobileMenuOpen ? (
                  <FiX className="w-5 h-5 text-white" />
                ) : (
                  <FiMenu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-red-700 bg-red-600">
            <div className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-red-700 text-white'
                        : 'text-red-100 hover:text-white hover:bg-red-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Click outside to close dropdowns */}
      {(userMenuOpen || mobileMenuOpen) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setUserMenuOpen(false)
            setMobileMenuOpen(false)
          }}
        />
      )}
    </div>
  )
}