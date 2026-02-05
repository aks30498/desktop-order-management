import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";

import Router from "./Router";

import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

export default function App() {
  const { toast } = useToast();

  // ---------------------------------
  // Global auto-update listeners
  // ---------------------------------
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateStatus((status) => {
      switch (status) {
        case "checking":
          toast({ title: "Checking for updates..." });
          break;

        case "available":
          toast({ title: "Update available. Downloading..." });
          break;

        case "downloaded":
          toast({
            title: "Update ready",
            description: "Restart to install latest version",
            action: (
              <Button
                size="sm"
                onClick={() => window.electronAPI.restartForUpdate?.()}
              >
                Restart
              </Button>
            ),
          });
          break;

        case "error":
          toast({
            variant: "destructive",
            title: "Update failed",
          });
          break;

        default:
          break;
      }
    });

    window.electronAPI.onUpdateProgress?.((percent) => {
      console.log("Update progress:", percent);
    });
  }, [toast]);

  return (
    <BrowserRouter>
      <Router />

      {/* MUST be mounted once globally */}
      <Toaster />
    </BrowserRouter>
  );
}
