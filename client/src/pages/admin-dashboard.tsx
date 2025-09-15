import React, { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/admin-context";
import { useLocation, Route, Switch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Video, 
  BarChart3, 
  Users, 
  LogOut,
  PlayCircle,
  TrendingUp,
  Tag,
  Menu,
  X
} from "lucide-react";
import AdminVideos from "@/pages/admin-videos";
import AdminCompletions from "@/pages/admin-completions";
import AdminUsers from "@/pages/admin-users";
import AdminCompanyTags from "@/pages/admin-company-tags";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminUser, logout } = useAdmin();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Videos", href: "/admin/videos", icon: Video },
    { name: "Completions", href: "/admin/completions", icon: BarChart3 },
    ...(adminUser?.role === "SUPER_ADMIN" ? [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Company Tags", href: "/admin/company-tags", icon: Tag }
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="mobile-menu-button"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-foreground">TaskSafe Admin</h1>
                <p className="text-xs text-muted-foreground">
                  {adminUser?.role === "SUPER_ADMIN" ? "Super Administrator" : "Administrator"}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-foreground">TaskSafe</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                {adminUser?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="hidden sm:flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout-mobile"
                className="sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Desktop Sidebar */}
        <nav className="hidden md:block w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => setLocation(item.href)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav className="relative flex flex-col w-72 bg-card border-r border-border">
              <div className="p-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">TaskSafe Admin</h1>
                    <p className="text-xs text-muted-foreground">
                      {adminUser?.role === "SUPER_ADMIN" ? "Super Administrator" : "Administrator"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground truncate">{adminUser?.email}</p>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setLocation(item.href);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        data-testid={`nav-mobile-${item.name.toLowerCase()}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full"
                  data-testid="button-logout-mobile-menu"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminDashboardHome() {
  const { adminUser } = useAdmin();

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back, {adminUser?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Videos in your library
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              All-time video views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Average completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Use the navigation menu to manage videos, view completion reports, and configure users.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Video className="h-4 w-4 mr-2" />
              Manage Videos
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { adminUser, isLoading } = useAdmin();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !adminUser) {
      setLocation("/admin/login");
    }
  }, [adminUser, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboardHome} />
        <Route path="/admin/videos" component={AdminVideos} />
        <Route path="/admin/completions" component={AdminCompletions} />
        {adminUser.role === "SUPER_ADMIN" && (
          <Route path="/admin/users" component={AdminUsers} />
        )}
        {adminUser.role === "SUPER_ADMIN" && (
          <Route path="/admin/company-tags" component={AdminCompanyTags} />
        )}
        <Route path="/admin/*" component={AdminDashboardHome} />
      </Switch>
    </AdminLayout>
  );
}