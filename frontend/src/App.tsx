import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import StandardMatrix from '@/pages/StandardMatrix'
import Schedule from '@/pages/Schedule'
import NCR from '@/pages/NCR'
import CustomerList from '@/pages/customers/CustomerList'
import ProjectOverview from '@/pages/ProjectOverview'
import EquipmentList from '@/pages/EquipmentList'
import VendorList from '@/pages/VendorList'
import SOPList from '@/pages/SOPList'
import GapReport from '@/pages/GapReport'
import QuarterlyKPI from '@/pages/QuarterlyKPI'
import DataExport from '@/pages/DataExport'
import ItemList from '@/pages/ItemList'
import ItemCreatePage from '@/pages/ItemCreatePage'
import VehicleModelList from '@/pages/VehicleModelList'
import VehicleModelCreatePage from '@/pages/VehicleModelCreatePage'
import WorkAssignment from '@/pages/WorkAssignment'
import ProjectCreatePage from '@/pages/ProjectCreatePage'
import CustomerCreatePage from '@/pages/customers/CustomerCreatePage'
import UserManagement from '@/pages/UserManagement'
import SingleTestRequest from '@/pages/SingleTestRequest'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function HomeRedirect() {
  const role = useAuthStore((s) => s.user?.role)
  return <Navigate to={role === '의뢰자' ? '/single-tests' : '/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="standards" element={<StandardMatrix />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="ncr" element={<NCR />} />
          <Route path="single-tests" element={<SingleTestRequest />} />
          <Route path="workload" element={<WorkAssignment />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerCreatePage />} />
          <Route path="items" element={<ItemList />} />
          <Route path="items/new" element={<ItemCreatePage />} />
          <Route path="vehicle-models" element={<VehicleModelList />} />
          <Route path="vehicle-models/new" element={<VehicleModelCreatePage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="projects" element={<ProjectOverview />} />
          <Route path="projects/new" element={<ProjectCreatePage />} />
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="sop" element={<SOPList />} />
          <Route path="reports/gap-analysis" element={<GapReport />} />
          <Route path="reports/quarterly-kpi" element={<QuarterlyKPI />} />
          <Route path="export" element={<DataExport />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
