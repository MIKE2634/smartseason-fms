import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

function Dashboard() {
  const { user } = useAuth();
  const [fields, setFields] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    atRisk: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${API_URL}/fields`);
      setFields(response.data);
      
      const statusCounts = {
        total: response.data.length,
        active: response.data.filter(f => f.status === 'Active').length,
        atRisk: response.data.filter(f => f.status === 'At Risk').length,
        completed: response.data.filter(f => f.status === 'Completed').length,
      };
      setStats(statusCounts);
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
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

  const recentFields = fields.slice(0, 5);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Fields</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Active Fields</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">At Risk Fields</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{stats.atRisk}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Completed Fields</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{stats.completed}</div>
        </div>
      </div>

      {/* Recent Fields */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Recent Fields</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : recentFields.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No fields found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentFields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.crop_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.current_stage}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(field.status)}`}>
                        {field.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{field.agent_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link to={`/fields/${field.id}`} className="text-green-600 hover:text-green-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-6 border-t border-gray-200">
          <Link to="/fields" className="text-green-600 hover:text-green-900">
            View All Fields →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;