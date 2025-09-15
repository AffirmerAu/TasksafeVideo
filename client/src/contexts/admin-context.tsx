import { createContext, useContext, useState, useEffect } from "react";
import type { AdminUser } from "@shared/schema";

interface AdminContextType {
  adminUser: Omit<AdminUser, 'password'> | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<Omit<AdminUser, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if admin is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/admin/me", {
        credentials: 'include'
      });
      if (response.ok) {
        const admin = await response.json();
        setAdminUser(admin);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.adminUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { 
        method: "POST",
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setAdminUser(null);
    }
  };

  return (
    <AdminContext.Provider value={{ adminUser, login, logout, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}