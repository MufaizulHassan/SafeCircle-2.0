import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}