import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Mail, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

const emailSchema = z.object({
  userName: z.string().min(1, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface Video {
  id: string;
  title: string;
}

interface EmailFormProps {
  onEmailSent: (email: string) => void;
  video: Video;
}

export default function EmailForm({ onEmailSent, video }: EmailFormProps) {
  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      userName: "",
      email: "",
    },
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const response = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: data.userName, email: data.email, videoId: video.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send access link");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      onEmailSent(data.email);
      form.reset();
      toast({
        title: "Magic Link Sent",
        description: "Check your email for the secure access link.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Send Link",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EmailFormData) => {
    requestAccessMutation.mutate(data);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Request Access</h3>
        <p className="text-muted-foreground">
          We'll send you a secure magic link to access this training video
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-email">
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="userName" className="text-sm font-medium text-foreground">
                  Your Name
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    id="userName"
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full"
                    data-testid="input-userName"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="Enter your work email address"
                    className="w-full"
                    data-testid="input-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={requestAccessMutation.isPending}
            data-testid="button-submit"
          >
            {requestAccessMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Magic Link
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Security Notice</p>
            <p className="text-muted-foreground">
              Access links expire after 24 hours and can only be used once. 
              Your viewing activity will be logged for compliance tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
