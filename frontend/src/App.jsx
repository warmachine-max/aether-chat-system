import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import { SocketProvider } from './context/SocketContext';
import Signup from './authPages/Signup';
import Login from './authPages/Login';
import Home from './HomePage';

import Chat from '../pages/Chat';

function AppRoutes() {
  const { user, loading } = useAuth();

  // Show a dark screen while checking if user is logged in
  if (loading) return <div className="bg-[#050505] min-h-screen" />; 

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Routes */}
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/home" />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        
        {/* 2. Protected Route */}
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
        
        {/* 3. Global Redirect */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/home" : "/signup"} />} 
        />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

// THIS IS THE MAIN WRAPPER
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        {/* FIX: Call AppRoutes here, NOT App */}
        <AppRoutes /> 
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;