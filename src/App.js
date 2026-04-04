import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import PraxisHome from "./scenes/praxis-home/PraxisHome";
import IncidentDashboard from "./scenes/incident-dashboard/IncidentDashboard";
import IncidentsPage from "./scenes/incidents/IncidentsPage";
import SafetyDetail from "./scenes/safety-detail/SafetyDetail";
import MapView from "./scenes/map/MapView";
import UserRoles from "./scenes/team/UserRoles";
import Login from "./scenes/login/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

/**
 * Praxis GB / node Safety Dashboard - Main App Component
 * /               — Praxis GB homepage (public)
 * /node           — node product dashboard (protected)
 * /node/login     — node sign-in page
 * /node/incidents — protected incident clips view
 * /node/safety-detail — protected safety score deep-dive
 */
function App() {
  return (
    <div className="app">
      <Routes>
        {/* Praxis GB Homepage */}
        <Route path="/" element={<PraxisHome />} />

        {/* node Product Routes */}
        <Route path="/node/login" element={<Login />} />
        <Route
          path="/node"
          element={
            <ProtectedRoute>
              <IncidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/node/incidents"
          element={
            <ProtectedRoute>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/node/safety-detail"
          element={
            <ProtectedRoute>
              <SafetyDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/node/map"
          element={
            <ProtectedRoute>
              <MapView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/node/team"
          element={
            <ProtectedRoute>
              <UserRoles />
            </ProtectedRoute>
          }
        />

        {/* Legacy routes - redirect to /node equivalents */}
        <Route path="/login" element={<Navigate to="/node/login" replace />} />
        <Route path="/incidents" element={<Navigate to="/node/incidents" replace />} />
        <Route path="/safety-detail" element={<Navigate to="/node/safety-detail" replace />} />
        <Route path="/map" element={<Navigate to="/node/map" replace />} />
        <Route path="/team" element={<Navigate to="/node/team" replace />} />

        {/* Catch-all → homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;

