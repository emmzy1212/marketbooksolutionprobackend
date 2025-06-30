import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import AuthLayout from './components/layouts/AuthLayout'
import DashboardLayout from './components/layouts/DashboardLayout'
import AdminLayout from './components/layouts/AdminLayout'
import GlobalAdminLayout from './components/layouts/GlobalAdminLayout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import EmailConfirm from './pages/auth/EmailConfirm'
import ResetPassword from './pages/auth/ResetPassword'
import Dashboard from './pages/user/Dashboard'
import Profile from './pages/user/Profile'
import Items from './pages/user/Items'
import AddItem from './pages/user/AddItem'
import Tickets from './pages/user/Tickets'
import EscrowTickets from './pages/user/EscrowTickets'
import AdminAccess from './pages/user/AdminAccess'
import UserAdminDashboard from './pages/admin/UserAdminDashboard'
import UserAdminSettings from './pages/admin/UserAdminSettings'
import GlobalAdminLogin from './pages/global-admin/GlobalAdminLogin'
import GlobalAdminDashboard from './pages/global-admin/GlobalAdminDashboard'
import ProtectedRoute from './components/common/ProtectedRoute'
import NotificationSystem from './components/common/NotificationSystem'
import LoadingSpinner from './components/common/LoadingSpinner'
import toast from 'react-hot-toast'

// Configure axios defaults - use relative URLs for WebContainer compatibility
axios.defaults.baseURL = '/api'

// Add axios interceptor for token expiration handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname
      
      // Don't redirect if already on auth pages
      if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/global-admin-login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('globalAdminToken')
        localStorage.removeItem('userAdminToken')
        localStorage.removeItem('userAdminSession')
        delete axios.defaults.headers.common['Authorization']
        
        toast.error('Session expired. Please login again.')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const globalAdminToken = localStorage.getItem('globalAdminToken')
      
      if (globalAdminToken) {
        // Check global admin status
        try {
          const response = await axios.get('/global-admin/profile', {
            headers: { Authorization: `Bearer ${globalAdminToken}` }
          })
          setIsGlobalAdmin(true)
          axios.defaults.headers.common['Authorization'] = `Bearer ${globalAdminToken}`
        } catch (error) {
          localStorage.removeItem('globalAdminToken')
          setIsGlobalAdmin(false)
        }
      } else if (token) {
        // Check user status
        try {
          const response = await axios.get('/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          })
          setUser(response.data.user)
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('userAdminToken')
          localStorage.removeItem('userAdminSession')
          setUser(null)
        }
      }
    } catch (error) {
      // Clear all tokens on error
      localStorage.removeItem('token')
      localStorage.removeItem('globalAdminToken')
      localStorage.removeItem('userAdminToken')
      localStorage.removeItem('userAdminSession')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
      setIsGlobalAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const login = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    setUser(null)
    setIsGlobalAdmin(false)
    localStorage.removeItem('token')
    localStorage.removeItem('globalAdminToken')
    localStorage.removeItem('userAdminToken')
    localStorage.removeItem('userAdminSession')
    delete axios.defaults.headers.common['Authorization']
  }

  const globalAdminLogin = (token) => {
    setIsGlobalAdmin(true)
    localStorage.setItem('globalAdminToken', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const globalAdminLogout = () => {
    setIsGlobalAdmin(false)
    localStorage.removeItem('globalAdminToken')
    if (user) {
      const userToken = localStorage.getItem('token')
      if (userToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
      }
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <NotificationSystem />
      <Routes>
        {/* Global Admin Routes */}
        {isGlobalAdmin ? (
          <Route path="/*" element={
            <GlobalAdminLayout onLogout={globalAdminLogout}>
              <Routes>
                <Route path="/" element={<GlobalAdminDashboard />} />
                <Route path="/global-admin/*" element={<GlobalAdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </GlobalAdminLayout>
          } />
        ) : (
          <>
            {/* Auth Routes */}
            <Route path="/login" element={
              user ? <Navigate to="/dashboard" replace /> : 
              <AuthLayout>
                <Login onLogin={login} />
              </AuthLayout>
            } />
            <Route path="/register" element={
              user ? <Navigate to="/dashboard" replace /> : 
              <AuthLayout>
                <Register onRegister={login} />
              </AuthLayout>
            } />
            <Route path="/global-admin-login" element={
              <AuthLayout>
                <GlobalAdminLogin onLogin={globalAdminLogin} />
              </AuthLayout>
            } />
            <Route path="/confirm-email/:token" element={<EmailConfirm />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected User Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/items" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <Items />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/add-item" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <AddItem />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/escrow-tickets" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <EscrowTickets />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/tickets" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <Tickets />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin-access" element={
              <ProtectedRoute user={user}>
                <DashboardLayout user={user} onLogout={logout}>
                  <AdminAccess />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* User Admin Routes */}
            <Route path="/user-admin" element={
              <ProtectedRoute user={user}>
                <AdminLayout user={user} onLogout={logout}>
                  
                  <UserAdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/user-admin/settings" element={
              <ProtectedRoute user={user}>
                <AdminLayout user={user} onLogout={logout}>
                  <UserAdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Default Routes */}
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}

export default App