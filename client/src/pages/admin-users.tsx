import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Crown,
  Building,
  Mail,
  AlertCircle
} from "lucide-react";
import type { AdminUser, CompanyTag } from "@shared/schema";

interface UserFormData {
  email: string;
  password: string;
  role: "ADMIN" | "SUPER_ADMIN";
  companyTag?: string;
}

function UserDialog({ 
  user, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  user?: Omit<AdminUser, 'password'>; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: UserFormData) => void;
}) {
  // Fetch company tags for dropdown
  const { data: companyTags = [] } = useQuery<CompanyTag[]>({
    queryKey: ["/api/admin/company-tags"],
  });
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || "",
    password: "",
    role: user?.role || "ADMIN",
    companyTag: user?.companyTag || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? "Edit Admin User" : "Add New Admin User"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="admin@company.com"
              required
              data-testid="input-user-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? "New Password (leave blank to keep current)" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Enter password"
              required={!user}
              data-testid="input-user-password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value: "ADMIN" | "SUPER_ADMIN") => handleChange("role", value)}
            >
              <SelectTrigger data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyTag">Company Tag (for ADMINs)</Label>
            {companyTags.length > 0 ? (
              <Select
                value={formData.companyTag || "none"}
                onValueChange={(value) => handleChange("companyTag", value === "none" ? "" : value)}
                disabled={formData.role === "SUPER_ADMIN"}
                data-testid="select-user-company-tag"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company tag</SelectItem>
                  {companyTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="companyTag"
                value={formData.companyTag}
                onChange={(e) => handleChange("companyTag", e.target.value)}
                placeholder="e.g., acme-corp"
                disabled={formData.role === "SUPER_ADMIN"}
                data-testid="input-user-company-tag"
              />
            )}
            {formData.role === "ADMIN" && (
              <p className="text-xs text-muted-foreground">
                Admins will only see videos and completions for this company tag
              </p>
            )}
            {formData.role === "SUPER_ADMIN" && (
              <p className="text-xs text-muted-foreground">
                Super Admins have access to all data across all companies
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-user">
              {user ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { adminUser } = useAdmin();
  const { toast } = useToast();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<AdminUser, 'password'> | undefined>();

  // Only SUPER_ADMINs can access this page
  if (adminUser?.role !== "SUPER_ADMIN") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground">
            Manage admin users and company assignments
          </p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only Super Administrators can manage users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch admin users
  const { data: users = [], isLoading } = useQuery<Omit<AdminUser, 'password'>[]>({
    queryKey: ["/api/admin/users"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUserDialogOpen(false);
      toast({
        title: "User Created",
        description: "The admin user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) => 
      apiRequest(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUserDialogOpen(false);
      setEditingUser(undefined);
      toast({
        title: "User Updated",
        description: "The admin user has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deleted",
        description: "The admin user has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveUser = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEditUser = (user: Omit<AdminUser, 'password'>) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDeleteUser = (user: Omit<AdminUser, 'password'>) => {
    if (user.id === adminUser?.id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete the admin user "${user.email}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "SUPER_ADMIN") {
      return <Badge className="bg-purple-100 text-purple-800"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
    }
    return <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
  };

  const getCompanyBadge = (companyTag?: string) => {
    if (!companyTag) {
      return <span className="text-muted-foreground text-sm">All Companies</span>;
    }
    return <Badge variant="outline"><Building className="h-3 w-3 mr-1" />{companyTag}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground">Loading admin users...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground">
            Manage admin users and company assignments ({users.length} user{users.length !== 1 ? 's' : ''})
          </p>
        </div>
        
        <Button onClick={() => setIsUserDialogOpen(true)} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Add Admin User
        </Button>
      </div>

      {/* Users Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Super Admins</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === "SUPER_ADMIN").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Admins</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === "ADMIN").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Companies</span>
            </div>
            <div className="text-2xl font-bold">
              {new Set(users.filter(u => u.companyTag).map(u => u.companyTag)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No admin users yet</h3>
            <p className="text-muted-foreground mb-4">
              Create admin users to manage different aspects of the platform.
            </p>
            <Button onClick={() => setIsUserDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {user.role === "SUPER_ADMIN" ? (
                        <Crown className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-foreground" data-testid={`user-email-${user.id}`}>
                          {user.email}
                        </h3>
                        {user.id === adminUser?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        {getRoleBadge(user.role)}
                        {getCompanyBadge(user.companyTag)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.id !== adminUser?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteUser(user)}
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserDialog
        user={editingUser}
        isOpen={isUserDialogOpen}
        onClose={() => {
          setIsUserDialogOpen(false);
          setEditingUser(undefined);
        }}
        onSave={handleSaveUser}
      />
    </div>
  );
}