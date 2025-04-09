import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./Components/Pages/Authentication/onboarding";
import SignIn from "./Components/Pages/Authentication/signIn";
import SignUp from "./Components/Pages/Authentication/signUp";
import Home from "./Components/Pages/Home/Home";
import ChatPanel from "./Components/Pages/Home/ChatPanel";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth } from "./../firebaseConfig";
import { Toaster } from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import BlurLoader from "./Components/Pages/Home/Blur";

const App = () => {
  // Track current authenticated user and loading state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <BlurLoader />;
  }

  return (
    <Router>
      <ToastContainer autoClose={1700} />
      <Toaster />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Onboarding />}
        />
        <Route
          path="/signin"
          element={user ? <Navigate to="/home" /> : <SignIn />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/home" /> : <SignUp />}
        />

        {/* Protected Routes */}
        <Route
          path="/home"
          element={user ? <Home /> : <Navigate to="/signin" />}
        />
        <Route
          path="/chat"
          element={user ? <ChatPanel /> : <Navigate to="/signin" />}
        />

        {/* Catch-All Route */}
        <Route
          path="*"
          element={<Navigate to={user ? "/home" : "/"} />}
        />
      </Routes>
    </Router>
  );
};

export default App;
