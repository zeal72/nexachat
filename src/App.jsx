import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./Components/Pages/Authentication/onboarding";
import SignIn from "./Components/Pages/Authentication/signIn";
import SignUp from "./Components/Pages/Authentication/signUp";
import Home from "./Components/Pages/Home/Home";
import ChatPanel from "./Components/Pages/Home/ChatPanel";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth } from "./../firebaseConfig"

const App = () => {
  return (
    <Router>
      {/* Toast notifications available globally */}
      <ToastContainer />

      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/Signin" element={<SignIn />} />
        <Route path="/Signup" element={<SignUp />} />
        <Route path="/Home" element={<Home />} />

        {/* Protect chat route if not authenticated */}
        <Route
          path="/chat"
          element={<ChatPanel />} />

        {/* Redirect unknown routes to onboarding */}
        < Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
