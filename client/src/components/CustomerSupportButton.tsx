import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import CustomerSupportDialog from "./CustomerSupportDialog";

/**
 * Floating customer support button in the bottom-right corner
 * Opens the customer support dialog when clicked
 */
export default function CustomerSupportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        size="icon"
        aria-label="客服支持"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Customer support dialog */}
      <CustomerSupportDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
