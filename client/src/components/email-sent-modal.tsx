import { CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EmailSentModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function EmailSentModal({ isOpen, onClose, email }: EmailSentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-email-sent">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Check Your Email</h3>
          <p className="text-muted-foreground mb-6">
            We've sent a secure access link to{" "}
            <span className="font-medium text-foreground" data-testid="text-user-email">
              {email}
            </span>
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-left">
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Link expires in 24 hours</p>
                  <p className="text-muted-foreground mt-1">Make sure to access your training video soon</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full"
              variant="secondary"
              data-testid="button-close-modal"
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
