import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b px-4 h-14 flex items-center justify-between">
      <div
        className="font-semibold cursor-pointer"
        onClick={() => navigate("/orders")}
      >
        Desktop Order Management
      </div>

      <div className="flex gap-2">
        <Button
          variant={location.pathname === "/" ? "outline" : "ghost"}
          onClick={() => navigate("/")}
        >
          Orders
        </Button>

        <Button
          variant={
            location.pathname.startsWith("/customers") ? "outline" : "ghost"
          }
          onClick={() => navigate("/customers")}
        >
          Customers
        </Button>
      </div>
      <div>
        <Button onClick={() => navigate("/orders/new")}>
          <Plus size={16} />
          New Order
        </Button>
      </div>
    </header>
  );
}
