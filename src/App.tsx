import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Loader2 } from "lucide-react";

// Public pages
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Farmer pages
import FarmerDashboard from "./pages/farmer/Dashboard";
import FarmerAnimals from "./pages/farmer/Animals";
import RegisterAnimal from "./pages/farmer/RegisterAnimal";
import AnimalProfile from "./pages/farmer/AnimalProfile";
import FarmerTickets from "./pages/farmer/Tickets";
import FarmerCreateTicket from "./pages/farmer/CreateTicket";

// Vet pages
import VetDashboard from "./pages/vet/Dashboard";
import VetSearch from "./pages/vet/Search";
import VetCases from "./pages/vet/Cases";
import VetAnimalRecord from "./pages/vet/AnimalRecord";
import VetSchedule from "./pages/vet/Schedule";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTickets from "./pages/admin/Tickets";
import AdminVets from "./pages/admin/Vets";
import AdminFarmers from "./pages/admin/Farmers";
import AdminAuth from "./pages/AdminAuth";
import AdminDemo from "./pages/AdminDemo";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'farmer') return <Navigate to="/farmer" replace />;
    if (userRole === 'vet') return <Navigate to="/vet" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin/login" element={<AdminAuth />} />
      <Route path="/admin/demo" element={<AdminDemo />} />

      {/* Farmer routes */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <FarmerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/animals"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <FarmerAnimals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/register"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <RegisterAnimal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/animals/:id"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <AnimalProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/create-ticket"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <FarmerCreateTicket />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/tickets"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'admin']}>
            <FarmerTickets />
          </ProtectedRoute>
        }
      />

      {/* Vet routes */}
      <Route
        path="/vet"
        element={
          <ProtectedRoute allowedRoles={['vet', 'admin']}>
            <VetDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vet/search"
        element={
          <ProtectedRoute allowedRoles={['vet', 'admin']}>
            <VetSearch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vet/cases"
        element={
          <ProtectedRoute allowedRoles={['vet', 'admin']}>
            <VetCases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vet/animal/:id"
        element={
          <ProtectedRoute allowedRoles={['vet', 'admin']}>
            <VetAnimalRecord />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vet/schedule"
        element={
          <ProtectedRoute allowedRoles={['vet', 'admin']}>
            <VetSchedule />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tickets/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vets"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/farmers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminFarmers />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;