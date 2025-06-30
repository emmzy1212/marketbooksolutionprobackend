import { FiShield, FiLogOut } from 'react-icons/fi'

export default function GlobalAdminLayout({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <FiShield className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Marketbook<span className="text-red-500">&solution</span>
                </h1>
                <p className="text-xs text-gray-400">Global Administration Panel</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  )
}