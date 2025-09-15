import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanyTagSchema, type CompanyTag, type InsertCompanyTag } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit2, Plus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCompanyTags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<CompanyTag | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: companyTags = [], isLoading } = useQuery<CompanyTag[]>({
    queryKey: ["/api/admin/company-tags"],
  });

  const createForm = useForm<InsertCompanyTag>({
    resolver: zodResolver(insertCompanyTagSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editForm = useForm<InsertCompanyTag>({
    resolver: zodResolver(insertCompanyTagSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCompanyTag) => 
      fetch("/api/admin/company-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-tags"] });
      toast({ description: "Company tag created successfully" });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to create company tag" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCompanyTag> }) => 
      fetch(`/api/admin/company-tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-tags"] });
      toast({ description: "Company tag updated successfully" });
      setShowEditDialog(false);
      setEditingTag(null);
      editForm.reset();
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update company tag" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/admin/company-tags/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-tags"] });
      toast({ description: "Company tag deleted successfully" });
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to delete company tag" 
      });
    },
  });

  const handleEdit = (tag: CompanyTag) => {
    setEditingTag(tag);
    editForm.reset({
      name: tag.name,
      description: tag.description || "",
      isActive: tag.isActive,
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this company tag?")) {
      deleteMutation.mutate(id);
    }
  };

  const onCreateSubmit = (data: InsertCompanyTag) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCompanyTag) => {
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="company-tags-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground" data-testid="page-title">Company Tags</h2>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage company tags for multi-tenant access control and organization
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-tag">
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-tag">
            <DialogHeader>
              <DialogTitle>Create Company Tag</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tag Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., acme-corp" 
                          {...field} 
                          data-testid="input-tag-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this company tag..." 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-tag-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Tag"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {companyTags.length === 0 ? (
          <Card data-testid="empty-state">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Company Tags</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first company tag to enable multi-tenant access control
              </p>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-tag">
                <Plus className="h-4 w-4 mr-2" />
                Create First Tag
              </Button>
            </CardContent>
          </Card>
        ) : (
          companyTags.map((tag: CompanyTag) => (
            <Card key={tag.id} data-testid={`card-tag-${tag.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-tag-name-${tag.id}`}>
                      {tag.name}
                    </CardTitle>
                    {tag.description && (
                      <CardDescription data-testid={`text-tag-description-${tag.id}`}>
                        {tag.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tag)}
                      data-testid={`button-edit-${tag.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(tag.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${tag.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span data-testid={`text-status-${tag.id}`}>
                    Status: {tag.isActive ? "Active" : "Inactive"}
                  </span>
                  <span data-testid={`text-created-${tag.id}`}>
                    Created: {new Date(tag.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-tag">
          <DialogHeader>
            <DialogTitle>Edit Company Tag</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., acme-corp" 
                        {...field} 
                        data-testid="input-edit-tag-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of this company tag..." 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-edit-tag-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Tag"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}