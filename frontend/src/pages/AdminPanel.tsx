import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { capitalizeStatus } from '../utils/format';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    cost_points: 0,
    icon: '🎁',
  });

  useEffect(() => {
    checkAdminAccess();
    fetchRewards();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (user.role !== 'admin') {
        navigate('/my-account');
      }
    } catch (error) {
      navigate('/my-account');
    }
  };

  const fetchRewards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/wallet/rewards/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRewards(response.data.data || []);
    } catch (error: any) {
      setErrorMessage('Failed to fetch rewards');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');

      if (editingId) {
        // Update existing reward
        await axios.put(
          `${import.meta.env.VITE_API_URL || window.location.origin}/api/wallet/rewards/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMessage('✅ Reward updated successfully!');
      } else {
        // Create new reward
        await axios.post(
          `${import.meta.env.VITE_API_URL || window.location.origin}/api/wallet/rewards`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMessage('✅ Reward created successfully!');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'other',
        cost_points: 0,
        icon: '🎁',
      });
      setEditingId(null);
      setShowForm(false);

      // Refresh rewards
      fetchRewards();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to save reward');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reward: any) => {
    setEditingId(reward.id);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      category: reward.category || 'other',
      cost_points: reward.cost_points,
      icon: reward.icon || '🎁',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/wallet/rewards/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('✅ Reward deleted successfully!');
      fetchRewards();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to delete reward');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      category: 'other',
      cost_points: 0,
      icon: '🎁',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-lg shadow-lg mb-6">
          <h1 className="text-3xl font-bold mb-2">⚙️ Admin Panel - Reward Management</h1>
          <p className="text-blue-100">Manage all available rewards for users</p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Add New Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition"
          >
            + Add New Reward
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Reward' : 'Create New Reward'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Icon */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    maxLength="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., $5 Discount"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Brief description of the reward"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="discount">Discount</option>
                    <option value="voucher">Voucher</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Cost Points */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cost (EP) *</label>
                  <input
                    type="number"
                    value={formData.cost_points}
                    onChange={(e) => setFormData({ ...formData, cost_points: parseInt(e.target.value) })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., 50"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? '⏳ Saving...' : (editingId ? '💾 Update Reward' : '✅ Create Reward')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rewards List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
            <h2 className="text-xl font-bold">Rewards ({rewards.length})</h2>
          </div>

          {rewards.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No rewards found</p>
            </div>
          ) : (
            <div className="divide-y">
              {rewards.map((reward) => (
                <div key={reward.id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold">
                      {reward.icon} {reward.name}
                    </p>
                    {reward.description && (
                      <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {reward.category}
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {reward.cost_points} EP
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${
                          reward.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {capitalizeStatus(reward.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(reward)}
                      className="bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-600 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-600 transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/my-account')}
          className="mt-6 bg-gray-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition"
        >
          ← Back to My Account
        </button>
      </div>
    </div>
  );
}
