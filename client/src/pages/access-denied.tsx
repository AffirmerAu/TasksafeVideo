import { useLocation } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  const [, setLocation] = useLocation();

  const handleRequestNewLink = () => {
    setLocation("/");
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-error-title">
              Access Denied
            </h2>
            <p className="text-muted-foreground mb-6" data-testid="text-error-message">
              This magic link has expired or is invalid. Please request a new access link.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleRequestNewLink}
                className="w-full"
                data-testid="button-request-new-link"
              >
                Request New Link
              </Button>
              <Button 
                variant="secondary"
                onClick={handleGoBack}
                className="w-full"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
