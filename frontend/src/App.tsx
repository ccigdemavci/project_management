import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectDetail from "./pages/ProjectDetail"; 

const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === "true";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          MOCK_AUTH ? (
            <Dashboard />
          ) : (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )
        }
      />

      <Route path="/login" element={<LoginPage />} />

      {/* Proje detayı */}
      <Route path="/project/:id" element={<ProjectDetail />} />

      {/* bilinmeyen rota -> login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}