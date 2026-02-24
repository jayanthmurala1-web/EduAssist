import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (!sessionId) {
          navigate('/login');
          return;
        }

        // Process session with backend
        const response = await axios.post(`${API}/auth/session`, null, {
          params: { session_id: sessionId },
          withCredentials: true
        });

        if (response.data.success) {
          // Store user data
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('authMethod', 'oauth');
          
          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          navigate('/login');
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
