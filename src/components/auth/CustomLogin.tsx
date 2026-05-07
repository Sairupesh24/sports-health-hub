import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function CustomLogin() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/request-login', { data: { email } });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ token: string; user: any }>('/auth/verify', {
        data: { email, otp }
      });
      
      // Store the JWT in localStorage
      localStorage.setItem('ishpo_jwt', response.token);
      
      // Redirect to a protected page
      navigate('/dashboard'); // Update with your actual default route
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Sign in to ISHPO
        </h2>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              We've sent a 6-digit code to <strong>{email}</strong>
            </p>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Login Code
              </label>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                className="w-full px-3 py-2 mt-1 text-center tracking-widest border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); setError(null); }}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
