import React, { useContext } from "react";
import { MyContext } from "../Context";
import RoleBasedDashboard from "../components/RoleBasedDashboard";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Dashboard() {
  const context = useContext(MyContext);

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager', 'staff']}>
      <div className="container-fluid pt-4">
        <RoleBasedDashboard />
      </div>
    </ProtectedRoute>
  );
}
