import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import { SocketProvider } from './context/SocketContext';
import Signup from './authPages/Signup';
import Login from './authPages/Login';
import Home from './HomePage';
import Profile from '../pages/Profile';
import Chat from '../pages/Chat';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { user, loading } = useAuth();

  // Show a themed loading screen while checking session
  if (loading) {
    return (
      <div className="bg-[#020202] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* --- 1. Public Routes --- */}
        {/* If user is logged in, redirect them away from auth pages to home */}
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/home" />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        
        {/* --- 2. Protected Routes --- */}
        {/* These check if 'user' exists; if not, redirect to login */}
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
        
        {/* SECURED: Profile now redirects to login if user is missing */}
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />

        {/* --- 3. Navigation Logic & Catch-all --- */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/home" : "/login"} />} 
        />
        
        {/* Catch-all for undefined URLs */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// THE MAIN WRAPPER
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes /> 
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;