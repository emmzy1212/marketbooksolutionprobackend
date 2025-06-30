import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { FiChevronLeft, FiChevronRight, FiShield, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

export default function AuthLayout({ children }) {
  const [advertisements, setAdvertisements] = useState([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdvertisements()
  }, [])

  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
      }, 5000) // Change ad every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [advertisements.length])

  const fetchAdvertisements = async () => {
    try {
      const response = await axios.get('/advertisements/active')
      setAdvertisements(response.data.advertisements || [])
    } catch (error) {
      console.error('Error fetching advertisements:', error)
      setAdvertisements([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const nextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
  }

  const prevAd = () => {
    setCurrentAdIndex((prev) => (prev - 1 + advertisements.length) % advertisements.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100">
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mr-3">
                  <FiShield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Marketbook<span className="text-primary-600">&solution</span>
                  </h1>
                  <p className="text-xs text-gray-500">Professional Marketplace</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#about" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">
                About
              </a>
              <a href="#contact" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Contact
              </a>
              <Link 
                to="/global-admin-login" 
                className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors"
              >
                Admin Portal
              </Link>
            </nav>

            {/* Contact Info */}
            <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <FiMail className="w-4 h-4 mr-1" />
                <span>support@marketbook.com</span>
              </div>
              <div className="flex items-center">
                <FiPhone className="w-4 h-4 mr-1" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Side - Enhanced Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-gradient-to-br from-primary-600 to-primary-800">
          <div className="max-w-md text-center text-white">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiShield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Welcome to Marketbook<span className="text-primary-200">&solution</span>
              </h1>
              <p className="text-xl text-primary-100 mb-8">
                The complete professional marketplace management system
              </p>
            </div>
            
            <div className="space-y-6 text-left">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Professional Invoice Generation</h3>
                  <p className="text-primary-100 text-sm">Create, send, and track professional invoices with ease</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Advanced Admin Controls</h3>
                  <p className="text-primary-100 text-sm">Comprehensive management tools for power users</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Real-time Notifications</h3>
                  <p className="text-primary-100 text-sm">Stay updated with instant notifications and alerts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">24/7 Support System</h3>
                  <p className="text-primary-100 text-sm">Get help when you need it with our dedicated support</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-primary-100 text-sm">
                Trusted by thousands of businesses worldwide
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Advertisement Carousel - Enhanced */}
          {!loading && advertisements.length > 0 && (
            <div className="bg-white shadow-sm border-b border-gray-200">
              <div className="relative h-32 md:h-40 overflow-hidden">
                {advertisements.map((ad, index) => (
                  <div
                    key={ad._id}
                    className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
                      index === currentAdIndex ? 'translate-x-0' : 
                      index < currentAdIndex ? '-translate-x-full' : 'translate-x-full'
                    }`}
                  >
                    <div className="flex items-center justify-center h-full px-6 bg-gradient-to-r from-gray-50 to-white">
                      {ad.mediaType === 'image' ? (
                        <img 
                          src={ad.mediaUrl} 
                          alt={ad.name}
                          className="max-h-full max-w-[200px] object-contain rounded-lg shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <video 
                          src={ad.mediaUrl} 
                          autoPlay 
                          muted 
                          loop
                          className="max-h-full max-w-[200px] object-contain rounded-lg shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="ml-6 flex-1 max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{ad.name}</h3>
                        <p className="text-sm text-gray-600">{ad.description}</p>
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                            Featured
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {advertisements.length > 1 && (
                  <>
                    <button
                      onClick={prevAd}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all hover:scale-105"
                    >
                      <FiChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={nextAd}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all hover:scale-105"
                    >
                      <FiChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </>
                )}
              </div>
              
              {advertisements.length > 1 && (
                <div className="flex justify-center py-3 space-x-2 bg-gray-50">
                  {advertisements.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAdIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentAdIndex ? 'bg-primary-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auth Form Container - Enhanced */}
          <div className="flex-1 flex items-center justify-center p-6 bg-white">
            <div className="w-full max-w-md">
              <div className="lg:hidden text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FiShield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Marketbook<span className="text-primary-600">&solution</span>
                </h1>
                <p className="text-gray-600">Professional marketplace management</p>
              </div>
              
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mr-3">
                  <FiShield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Marketbook<span className="text-primary-400">&solution</span>
                  </h3>
                  <p className="text-gray-400 text-sm">Professional Marketplace</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Empowering businesses with professional marketplace management tools. 
                Create, manage, and grow your business with our comprehensive platform.
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-gray-300">
                  <FiMail className="w-4 h-4 mr-2" />
                  <span className="text-sm">support@marketbook.com</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <FiPhone className="w-4 h-4 mr-2" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <FiMapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">123 Business Ave, Suite 100, City, State 12345</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm">Pricing</a></li>
                <li><a href="#about" className="text-gray-300 hover:text-white transition-colors text-sm">About Us</a></li>
                <li><a href="#contact" className="text-gray-300 hover:text-white transition-colors text-sm">Contact</a></li>
                <li><Link to="/global-admin-login" className="text-gray-300 hover:text-white transition-colors text-sm">Admin Portal</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#help" className="text-gray-300 hover:text-white transition-colors text-sm">Help Center</a></li>
                <li><a href="#documentation" className="text-gray-300 hover:text-white transition-colors text-sm">Documentation</a></li>
                <li><a href="#privacy" className="text-gray-300 hover:text-white transition-colors text-sm">Privacy Policy</a></li>
                <li><a href="#terms" className="text-gray-300 hover:text-white transition-colors text-sm">Terms of Service</a></li>
                <li><a href="#security" className="text-gray-300 hover:text-white transition-colors text-sm">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Marketbook&solution. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}