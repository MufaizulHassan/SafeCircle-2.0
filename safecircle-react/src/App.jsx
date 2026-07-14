import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EvidenceViewer from "./pages/EvidenceViewer";
import VolunteerRegister from "./pages/VolunteerRegister";




function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/volunteer-dashboard" element={<ProtectedRoute role="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/evidence" element={<ProtectedRoute><EvidenceViewer /></ProtectedRoute>} />
        <Route path="/volunteer-register" element={<ProtectedRoute><VolunteerRegister /></ProtectedRoute>} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;