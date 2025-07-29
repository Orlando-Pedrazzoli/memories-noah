import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import YearDetailPage from './pages/YearDetailPage';
import UploadPage from './pages/UploadPage';
import TravelsPage from './pages/TravelsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className='App'>
          <Routes>
            {/* Public Routes */}
            <Route path='/login' element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path='/'
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path='/year/:year'
              element={
                <ProtectedRoute>
                  <YearDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path='/upload'
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />

            <Route
              path='/travels'
              element={
                <ProtectedRoute>
                  <TravelsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position='top-right'
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
