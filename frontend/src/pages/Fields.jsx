import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://smartseason-api.onrender.com/api';

function Fields() {
  const { user } = useAuth();
  const [fields, setFields] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    planting_date: '',
    current_stage: 'Planted',
    assigned_agent_id: '',
  });

  useEffect(() => {
    fetchFields();
    if (user.role === 'admin') {
      fetchAgents();
    }
  }, [user]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/fields`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFields(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching fields:', error);
      setError('Failed to load fields. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/fields/agents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Prepare data - convert empty string to null for agent
      const submitData = {
        name: formData.name,
        crop_type: formData.crop_type,
        planting_date: formData.planting_date,
        current_stage: formData.current_stage,
        assigned_agent_id: formData.assigned_agent_id === '' ? null : parseInt(formData.assigned_agent_id),
      };
      
      if (editingField) {
        await axios.put(`${API_URL}/fields/${editingField.id}`, submitData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${API_URL}/fields`, submitData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      setShowModal(false);
      resetForm();
      fetchFields();
    } catch (error) {
      console.error('Error saving field:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.errors) {
        setError(error.response.data.errors.map(e => e.msg).join(', '));
      } else {
        setError('Error saving field. Please try again.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await axios.delete(`${API_URL}/fields/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchFields();
      } catch (error) {
        console.error('Error deleting field:', error);
        setError('Error deleting field. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setEditingField(null);
    setFormData({
      name: '',
      crop_type: '',
      planting_date: '',
      current_stage: 'Planted',
      assigned_agent_id: '',
    });
    setError('');
  };

  const editField = (field) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      crop_type: field.crop_type,
      planting_date: field.planting_date.split('T')[0],
      current_stage: field.current_stage,
      assigned_agent_id: field.assigned_agent_id || '',
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'At Risk': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Fields</h1>
        {user.role === 'admin' && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            + New Field
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading fields...</div>
      ) : fields.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No fields found. {user.role === 'admin' && 'Click "New Field" to get started.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planting Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.crop_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(field.planting_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.current_stage}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(field.status)}`}>
                      {field.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.agent_name || 'Unassigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <Link to={`/fields/${field.id}`} className="text-green-600 hover:text-green-900">
                      View
                    </Link>
                    {user.role === 'admin' && (
                      <>
                        <button onClick={() => editField(field)} className="text-blue-600 hover:text-blue-900">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(field.id)} className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for creating/editing fields */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingField ? 'Edit Field' : 'New Field'}</h2>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type *</label>
                <select
                  value={formData.crop_type}
                  onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select crop</option>
                  <option value="Corn">Corn</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Soybeans">Soybeans</option>
                  <option value="Rice">Rice</option>
                  <option value="Potatoes">Potatoes</option>
                  <option value="Tomatoes">Tomatoes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planting Date *</label>
                <input
                  type="date"
                  value={formData.planting_date}
                  onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Stage *</label>
                <select
                  value={formData.current_stage}
                  onChange={(e) => setFormData({ ...formData, current_stage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="Planted">Planted</option>
                  <option value="Growing">Growing</option>
                  <option value="Ready">Ready</option>
                  <option value="Harvested">Harvested</option>
                </select>
              </div>
              {user.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Agent</label>
                  <select
                    value={formData.assigned_agent_id}
                    onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  {editingField ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fields;