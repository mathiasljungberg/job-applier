import { BrowserRouter, Routes, Route, NavLink } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Briefcase, FileText, BookOpen, Target, LayoutDashboard } from "lucide-react";
import DashboardPage from "./pages/DashboardPage";
import NewApplicationPage from "./pages/NewApplicationPage";
import LibraryPage from "./pages/LibraryPage";
import SkillsPage from "./pages/SkillsPage";
import TrackingPage from "./pages/TrackingPage";

const queryClient = new QueryClient();

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new", label: "New Application", icon: Briefcase },
  { to: "/library", label: "Library", icon: FileText },
  { to: "/skills", label: "Skills", icon: BookOpen },
  { to: "/tracking", label: "Tracking", icon: Target },
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <nav className="w-56 border-r bg-card p-4 space-y-1">
        <h2 className="text-lg font-semibold mb-4 px-2">Job Applier</h2>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/new" element={<NewApplicationPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
