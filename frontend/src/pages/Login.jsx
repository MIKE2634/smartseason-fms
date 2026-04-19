import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = 'https://smartseason-api.onrender.com/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    if (passedChecks === 5) return { strength: 'strong', message: '✓ Strong password', color: 'text-green-600' };
    if (passedChecks >= 3) return { strength: 'medium', message: '⚠️ Medium password - add uppercase, numbers, or special characters', color: 'text-yellow-600' };
    return { strength: 'weak', message: '❌ Weak password - use 8+ chars with uppercase, number, and special character', color: 'text-red-600' };
  };

  // Validate registration form
  const validateRegistration = () => {
    // Name validation
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password length validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    // Password strength validation
    const strength = checkPasswordStrength(password);
    if (strength.strength === 'weak') {
      setError('Password is too weak. ' + strength.message);
      return false;
    }
    
    // Password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  // Validate login form
  const validateLogin = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    if (!password) {
      setError('Please enter your password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Validate registration
        if (!validateRegistration()) {
          setLoading(false);
          return;
        }

        // Role is always 'agent' - admin accounts are pre-seeded
        const role = 'agent';
        
        const response = await axios.post(`${API_URL}/auth/register`, {
          email,
          password,
          name,
          role,
        });
        
        // Show success message
        alert('Registration successful! Welcome ' + name + '!\nYou are registered as a Field Agent.');
        login(response.data.user, response.data.token);
        navigate('/');
      } else {
        // Validate login
        if (!validateLogin()) {
          setLoading(false);
          return;
        }
        
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });
        
        // Show welcome message with role
        const userRole = response.data.user.role === 'admin' ? 'Administrator' : 'Field Agent';
        alert(`Welcome back ${response.data.user.name}! You are logged in as ${userRole}.`);
        login(response.data.user, response.data.token);
        navigate('/');
      }
    } catch (err) {
      console.error('API Error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Backend may be starting up. Please wait 30 seconds and try again.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Invalid input. Please check your information.');
      } else if (err.response?.data?.error === 'Email already exists') {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(err.response?.data?.error || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password ? checkPasswordStrength(password) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700">SmartSeason</h1>
          <p className="text-gray-600 mt-2">Field Monitoring System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 2 characters</p>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "Minimum 8 characters" : "Enter your password"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            {isRegister && password && (
              <div className="mt-1">
                <p className={`text-xs ${passwordStrength?.color}`}>
                  {passwordStrength?.message}
                </p>
                <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                  <li className={password.length >= 8 ? "text-green-600" : ""}>
                    ✓ At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                    ✓ Uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                    ✓ Lowercase letter (a-z)
                  </li>
                  <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                    ✓ Number (0-9)
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-green-600" : ""}>
                    ✓ Special character (!@#$%^&* etc.)
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">✗ Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && password && (
                <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
              )}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-green-600 hover:text-green-700"
          >
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register as Field Agent'}
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center font-semibold">Demo Admin Account:</p>
          <p className="text-xs text-gray-500 text-center">Email: admin@shambarecords.com</p>
          <p className="text-xs text-gray-500 text-center">Password: admin123</p>
          <p className="text-xs text-gray-400 text-center mt-2">Field Agents can register above</p>
        </div>
      </div>
    </div>
  );
}

export default Login;