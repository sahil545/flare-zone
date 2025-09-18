import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import Tours from "./pages/Tours";
import Revenue from "./pages/Revenue";
import Analytics from "./pages/Analytics";
import CMS from "./pages/CMS";
import CMSPages from "./pages/CMSPages";
import CMSPageEditor from "./pages/CMSPageEditor";
import CMSBlog from "./pages/CMSBlog";
import CMSPostEditor from "./pages/CMSPostEditor";
import SettingsPage from "./pages/Settings";
import BookingListPage from "./pages/BookingList";
import ApiTest from "./pages/ApiTest";
import BookingsInstructorRole from "./pages/BookingsInstructorRole";
import Login from "./pages/Login";
import AdminOnly from "@/components/AdminOnly";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/bookings"
            element={
              <AdminOnly>
                <Bookings />
              </AdminOnly>
            }
          />
          <Route path="/instructor" element={<BookingsInstructorRole />} />
          <Route
            path="/instructor/:slug"
            element={<BookingsInstructorRole />}
          />
          <Route
            path="/bookings-instructor-role"
            element={<BookingsInstructorRole />}
          />
          <Route
            path="/BookingsInstructorRole"
            element={<BookingsInstructorRole />}
          />
          <Route
            path="/bookings/list"
            element={
              <AdminOnly>
                <BookingListPage />
              </AdminOnly>
            }
          />
          <Route
            path="/customers"
            element={
              <AdminOnly>
                <Customers />
              </AdminOnly>
            }
          />
          <Route
            path="/staff"
            element={
              <AdminOnly>
                <Staff />
              </AdminOnly>
            }
          />
          <Route
            path="/tours"
            element={
              <AdminOnly>
                <Tours />
              </AdminOnly>
            }
          />
          <Route
            path="/revenue"
            element={
              <AdminOnly>
                <Revenue />
              </AdminOnly>
            }
          />
          <Route
            path="/analytics"
            element={
              <AdminOnly>
                <Analytics />
              </AdminOnly>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminOnly>
                <SettingsPage />
              </AdminOnly>
            }
          />
          <Route
            path="/api-test"
            element={
              <AdminOnly>
                <ApiTest />
              </AdminOnly>
            }
          />
          <Route
            path="/cms"
            element={
              <AdminOnly>
                <CMS />
              </AdminOnly>
            }
          />
          <Route
            path="/cms/pages"
            element={
              <AdminOnly>
                <CMSPages />
              </AdminOnly>
            }
          />
          <Route
            path="/cms/pages/:id"
            element={
              <AdminOnly>
                <CMSPageEditor />
              </AdminOnly>
            }
          />
          <Route
            path="/cms/blog"
            element={
              <AdminOnly>
                <CMSBlog />
              </AdminOnly>
            }
          />
          <Route
            path="/cms/blog/:id"
            element={
              <AdminOnly>
                <CMSPostEditor />
              </AdminOnly>
            }
          />
          <Route path="/login" element={<Login />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
