import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";

const Login = lazy(() => import("@/pages/Login"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyDetail = lazy(() => import("@/pages/CompanyDetail"));
const Stations = lazy(() => import("@/pages/Stations"));
const UsersPage = lazy(() => import("@/pages/Users"));
const UserAccess = lazy(() => import("@/pages/UserAccess"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const FeatureFlags = lazy(() => import("@/pages/FeatureFlags"));
const Plans = lazy(() => import("@/pages/Plans"));
const Activity = lazy(() => import("@/pages/Activity"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const Support = lazy(() => import("@/pages/Support"));
const Settings = lazy(() => import("@/pages/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function Fallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<Fallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/companies/:id" element={<CompanyDetail />} />
                    <Route path="/stations" element={<Stations />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/:id" element={<UserAccess />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/feature-flags" element={<FeatureFlags />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/support" element={<Support />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
