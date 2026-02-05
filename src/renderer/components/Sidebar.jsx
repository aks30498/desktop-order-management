import { useEffect, useState } from "react";
import Helpers from "@/utils/helpers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus } from "lucide-react";

export default function Sidebar({ onAddOrder }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const result = await Helpers.ipcInvoke("get-stats");
      if (result.success) setStats(result.stats);
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }

  return (
    <aside className="w-72 border-r bg-muted/40">
      <div className="flex h-full flex-col gap-4 p-4">
        {/* Add Order */}
        <Button onClick={onAddOrder} className="w-full gap-2">
          <Plus size={16} />
          New Order
        </Button>

        {/* Statistics */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 size={14} />
              Statistics
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Stat label="Total Orders" value={stats?.total} />
            <Stat label="Today" value={stats?.today} />
            <Stat label="This Week" value={stats?.week} />
            <Stat label="Pending" value={stats?.pending} />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value ?? "—"}</span>
    </div>
  );
}
