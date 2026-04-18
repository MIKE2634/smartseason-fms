import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function FieldDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [field, setField] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    stage: '',
    notes: '',
    observations: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFieldDetails();
    fetchUpdates();
  }, [id]);

  const fetchFieldDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/fields`);
      const foundField = response.data.find(f => f.id === parseInt(id));
      if (foundField) {
        setField(foundField);
      } else {
        navigate('/fields');
      }
    } catch (error) {
      console.error('Error fetching field:', error);
      navigate('/fields');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      const response = await axios.get(`${API_URL}/updates/field/${id}`);
      setUpdates(response.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/updates`, {
        field_id: parseInt(id),
        ...updateForm,
      });
      setShowUpdateModal(false);
      setUpdateForm({ stage: '', notes: '', observations: '' });
      fetchFieldDetails();
      fetchUpdates();
    } catch (error) {
      console.error('Error creating update:', error);
      alert('Error creating update');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'At Risk': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  if (!field) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/fields')} className="text-green-600 hover:text-green-900">
          ← Back to Fields
        </button>
      </div>

      {/* Field Information */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{field.name}</h1>
              <p className="text-gray-600 mt-1">Crop: {field.crop_type}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(field.status)}`}>
                {field.status}
              </span>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Planting Date</label>
            <p className="text-gray-800">{new Date(field.planting_date).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Current Stage</label>
            <p className="text-gray-800">{field.current_stage}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Assigned Agent</label>
            <p className="text-gray-800">{field.agent_name || 'Unassigned'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Created At</label>
            <p className="text-gray-800">{new Date(field.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Add Update Button */}
      {user.role === 'agent' && (
        <div className="mb-6">
          <button
            onClick={() => setShowUpdateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Add Field Update
          </button>
        </div>
      )}

      {/* Updates History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Update History</h2>
        </div>
        {updates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No updates yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {updates.map((update) => (
              <div key={update.id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-semibold text-gray-800">{update.agent_name}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      updated stage to {update.stage}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(update.created_at).toLocaleString()}
                  </span>
                </div>
                {update.notes && (
                  <div className="mt-2">
                    <label className="text-sm text-gray-500">Notes:</label>
                    <p className="text-gray-700 mt-1">{update.notes}</p>
                  </div>
                )}
                {update.observations && (
                  <div className="mt-2">
                    <label className="text-sm text-gray-500">Observations:</label>
                    <p className="text-gray-700 mt-1">{update.observations}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Field Update</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={updateForm.stage}
                  onChange={(e) => setUpdateForm({ ...updateForm, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select stage</option>
                  <option value="Planted">Planted</option>
                  <option value="Growing">Growing</option>
                  <option value="Ready">Ready</option>
                  <option value="Harvested">Harvested</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add your notes here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea
                  value={updateForm.observations}
                  onChange={(e) => setUpdateForm({ ...updateForm, observations: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add observations..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  Submit Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdateForm({ stage: '', notes: '', observations: '' });
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

export default FieldDetails;