import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  PawPrint, 
  Plus, 
  FileText, 
  Users, 
  LogOut, 
  Menu,
  Stethoscope,
  ClipboardList,
  LayoutDashboard,
  Calendar,
  Ticket,
  BarChart3
} from 'lucide-react';
import { HoovrrLogo } from '@/components/ui/hoovrr-logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userRole, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const farmerLinks = [
    { href: '/farmer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/farmer/animals', label: 'My Animals', icon: PawPrint },
    { href: '/farmer/create-ticket', label: 'Create Ticket', icon: Plus },
    { href: '/farmer/tickets', label: 'My Tickets', icon: Ticket },
    { href: '/farmer/register', label: 'Register Animal', icon: Plus },
  ];

  const vetLinks = [
    { href: '/vet', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vet/records', label: 'Animal Records', icon: FileText },
    { href: '/vet/cases', label: 'My Cases', icon: ClipboardList },
    { href: '/vet/schedule', label: 'My Appointments', icon: Calendar },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/tickets', label: 'Manage Tickets', icon: ClipboardList },
    { href: '/admin/vets', label: 'Working Vets', icon: Stethoscope },
    { href: '/admin/farmers', label: 'Registered Farmers', icon: Users },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const links = userRole === 'farmer' ? farmerLinks : userRole === 'vet' ? vetLinks : adminLinks;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <HoovrrLogo size="sm" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sidebar-foreground">Hoovrr</h2>
            <p className="text-xs text-sidebar-foreground/70 capitalize">{userRole} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name || 'User'}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col fixed h-screen">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-4">
          <HoovrrLogo size="sm" />
          <span className="font-heading font-bold text-sidebar-foreground">Hoovrr</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}