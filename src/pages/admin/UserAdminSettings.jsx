import { useState, useEffect } from 'react'
import { FiUser, FiMail, FiCamera, FiSave, FiCreditCard, FiMapPin, FiLock, FiKey, FiBriefcase } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function UserAdminSettings() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    profileImageUrl: ''
  })
  const [businessData, setBusinessData] = useState({
    businessName: '',
    phoneNumber: '',
    address: '',
    description: ''
  })
  const [bankData, setBankData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: ''
  })
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [adminPasswordData, setAdminPasswordData] = useState({
    currentAdminPassword: '',
    newAdminPassword: '',
    confirmAdminPassword: ''
  })
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/auth/profile')
      const userData = response.data.user
      setUser(userData)
      
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profileImageUrl: userData.profileImage || ''
      })
      
      setBusinessData({
        businessName: userData.businessInfo?.businessName || '',
        phoneNumber: userData.businessInfo?.phoneNumber || '',
        address: userData.businessInfo?.address || '',
        description: userData.businessInfo?.description || ''
      })
      
      setBankData({
        bankName: userData.bankDetails?.bankName || '',
        accountName: userData.bankDetails?.accountName || '',
        accountNumber: userData.bankDetails?.accountNumber || '',
        routingNumber: userData.bankDetails?.routingNumber || '',
        swiftCode: userData.bankDetails?.swiftCode || ''
      })
      
      setAddressData({
        street: userData.billingAddress?.street || '',
        city: userData.billingAddress?.city || '',
        state: userData.billingAddress?.state || '',
        zipCode: userData.billingAddress?.zipCode || '',
        country: userData.billingAddress?.country || ''
      })
    } catch (error) {
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      const formData = new FormData()
      formData.append('firstName', profileData.firstName)
      formData.append('lastName', profileData.lastName)
      formData.append('profileImageUrl', profileData.profileImageUrl)
      
      if (profileImageFile) {
        formData.append('profileImage', profileImageFile)
      }

      const response = await axios.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setUser(response.data.user)
      toast.success('Profile updated successfully')
      setProfileImageFile(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating profile')
    } finally {
      setUpdating(false)
    }
  }

  const handleBusinessUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      await axios.put('/users/business-info', businessData)
      toast.success('Business information updated successfully')
      fetchProfile() // Refresh profile data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating business information')
    } finally {
      setUpdating(false)
    }
  }

  const handleBankUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      await axios.put('/users/bank-details', bankData)
      toast.success('Bank details updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating bank details')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddressUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      await axios.put('/users/billing-address', addressData)
      toast.success('Billing address updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating billing address')
    } finally {
      setUpdating(false)
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

  const handleAdminPasswordChange = async (e) => {
    e.preventDefault()
    
    if (adminPasswordData.newAdminPassword !== adminPasswordData.confirmAdminPassword) {
      toast.error('New admin passwords do not match')
      return
    }

    if (adminPasswordData.newAdminPassword.length < 6) {
      toast.error('New admin password must be at least 6 characters long')
      return
    }

    setUpdating(true)

    try {
      await axios.put('/admin/change-password', {
        currentAdminPassword: adminPasswordData.currentAdminPassword,
        newAdminPassword: adminPasswordData.newAdminPassword
      })
      
      toast.success('Admin password changed successfully')
      setAdminPasswordData({
        currentAdminPassword: '',
        newAdminPassword: '',
        confirmAdminPassword: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error changing admin password')
    } finally {
      setUpdating(false)
    }
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      setProfileImageFile(file)
      
      // Preview the image
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileData(prev => ({ ...prev, profileImageUrl: e.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile Info', icon: FiUser },
    { id: 'business', name: 'Business Info', icon: FiBriefcase },
    { id: 'bank', name: 'Bank Details', icon: FiCreditCard },
    { id: 'address', name: 'Billing Address', icon: FiMapPin },
    { id: 'password', name: 'Change Password', icon: FiLock },
    { id: 'admin-password', name: 'Admin Password', icon: FiKey }
  ]

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="card h-96 bg-gray-200"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Settings</h1>
        <p className="text-gray-600">Manage all profile information and settings as User Admin</p>
      </div>

      <div className="card">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
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

        {/* Profile Info Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={profileData.profileImageUrl || `https://ui-avatars.com/api/?name=${profileData.firstName}+${profileData.lastName}&background=3b82f6&color=fff`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
                  <FiCamera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                <p className="text-sm text-gray-600">Upload a new profile picture or enter an image URL</p>
                <div className="mt-2">
                  <input
                    type="url"
                    placeholder="Or enter image URL"
                    value={profileData.profileImageUrl}
                    onChange={(e) => setProfileData(prev => ({ ...prev, profileImageUrl: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input-field bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        )}

        {/* Business Info Tab */}
        {activeTab === 'business' && (
          <form onSubmit={handleBusinessUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Business Information</h3>
              <p className="text-sm text-gray-600 mb-6">
                This information will be displayed in search results and invoices
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessData.businessName}
                onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                className="input-field"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={businessData.phoneNumber}
                onChange={(e) => setBusinessData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="input-field"
                placeholder="Enter business phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={businessData.address}
                onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                className="input-field"
                placeholder="Enter business address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={businessData.description}
                onChange={(e) => setBusinessData(prev => ({ ...prev, description: e.target.value }))}
                className="input-field"
                rows="4"
                placeholder="Describe your business and services"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {updating ? 'Updating...' : 'Update Business Info'}
            </button>
          </form>
        )}

        {/* Bank Details Tab */}
        {activeTab === 'bank' && (
          <form onSubmit={handleBankUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Details</h3>
              <p className="text-sm text-gray-600 mb-6">
                These details will be included in unpaid invoices for payment processing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankData.bankName}
                  onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={bankData.accountName}
                  onChange={(e) => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter account holder name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankData.accountNumber}
                  onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="input-field"
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={bankData.routingNumber}
                  onChange={(e) => setBankData(prev => ({ ...prev, routingNumber: e.target.value }))}
                  className="input-field"
                  placeholder="Enter routing number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT Code (Optional)
              </label>
              <input
                type="text"
                value={bankData.swiftCode}
                onChange={(e) => setBankData(prev => ({ ...prev, swiftCode: e.target.value }))}
                className="input-field"
                placeholder="Enter SWIFT code for international transfers"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {updating ? 'Updating...' : 'Update Bank Details'}
            </button>
          </form>
        )}

        {/* Billing Address Tab */}
        {activeTab === 'address' && (
          <form onSubmit={handleAddressUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Address</h3>
              <p className="text-sm text-gray-600 mb-6">
                This address will appear on your invoices and official documents
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={addressData.street}
                onChange={(e) => setAddressData(prev => ({ ...prev, street: e.target.value }))}
                className="input-field"
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={addressData.city}
                  onChange={(e) => setAddressData(prev => ({ ...prev, city: e.target.value }))}
                  className="input-field"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={addressData.state}
                  onChange={(e) => setAddressData(prev => ({ ...prev, state: e.target.value }))}
                  className="input-field"
                  placeholder="Enter state or province"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={addressData.zipCode}
                  onChange={(e) => setAddressData(prev => ({ ...prev, zipCode: e.target.value }))}
                  className="input-field"
                  placeholder="Enter ZIP or postal code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={addressData.country}
                  onChange={(e) => setAddressData(prev => ({ ...prev, country: e.target.value }))}
                  className="input-field"
                  placeholder="Enter country"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {updating ? 'Updating...' : 'Update Billing Address'}
            </button>
          </form>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Change Login Password</h3>
              <p className="text-sm text-gray-600 mb-6">
                Update the main account password used for login
              </p>
            </div>

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
        )}

        {/* Admin Password Tab */}
        {activeTab === 'admin-password' && (
          <form onSubmit={handleAdminPasswordChange} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Change Admin Password</h3>
              <p className="text-sm text-gray-600 mb-6">
                Update the admin password used to access admin features
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPasswordData.currentAdminPassword}
                onChange={(e) => setAdminPasswordData(prev => ({ ...prev, currentAdminPassword: e.target.value }))}
                className="input-field"
                placeholder="Enter current admin password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPasswordData.newAdminPassword}
                onChange={(e) => setAdminPasswordData(prev => ({ ...prev, newAdminPassword: e.target.value }))}
                className="input-field"
                placeholder="Enter new admin password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPasswordData.confirmAdminPassword}
                onChange={(e) => setAdminPasswordData(prev => ({ ...prev, confirmAdminPassword: e.target.value }))}
                className="input-field"
                placeholder="Confirm new admin password"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiKey className="w-4 h-4 mr-2" />
              {updating ? 'Changing Admin Password...' : 'Change Admin Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}