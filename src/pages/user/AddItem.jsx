import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUpload, FiImage, FiSave, FiArrowLeft } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AddItem() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    status: 'pending',
    category: '',
    tags: '',
    imageUrl: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB')
        return
      }
      
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
        setFormData(prev => ({ ...prev, imageUrl: '' }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUrlChange = (e) => {
    const url = e.target.value
    setFormData(prev => ({ ...prev, imageUrl: url }))
    if (url) {
      setImagePreview(url)
      setImageFile(null)
    } else {
      setImagePreview('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields')
      return
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0')
      return
    }

    setLoading(true)

    try {
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('description', formData.description)
      submitData.append('price', formData.price)
      submitData.append('status', formData.status)
      submitData.append('category', formData.category)
      submitData.append('tags', formData.tags)
      submitData.append('imageUrl', formData.imageUrl)
      
      if (imageFile) {
        submitData.append('image', imageFile)
      }

      await axios.post('/items', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('Item added successfully!')
      navigate('/items')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding item')
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/items')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <FiArrowLeft className="w-4 h-4 mr-2" />
          Back to Items
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Add New Item</h1>
        <p className="text-gray-600">Create a new marketplace item with invoice generation</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter item name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="input-field"
              placeholder="Describe your item..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className="input-field pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Electronics, Clothing, Services"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter tags separated by commas"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple tags with commas (e.g., new, premium, limited)
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Item Image</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload from Device
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Image URL
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={handleImageUrlChange}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Enter a valid image URL above
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="border rounded-lg p-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-48 object-cover rounded-lg mx-auto"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/items')}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {loading ? 'Adding Item...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  )
}