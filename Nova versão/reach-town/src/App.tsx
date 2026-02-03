import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Secretarias from "./pages/Secretarias";
import Users from "./pages/Users";
import Chat from "./pages/Chat";
import Tickets from "./pages/Tickets";
import Campaigns from "./pages/Campaigns";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

import Contacts from "./pages/Contacts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/secretarias" element={<ProtectedRoute><Secretarias /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
