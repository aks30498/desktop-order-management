import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Sidebar({ onAddOrder }) {
  return (
    <aside className="w-72 border-r bg-muted/40">
      <div className="flex h-full flex-col gap-4 p-4">
        {/* Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statistics</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Stat label="Total Orders" value="—" />
            <Stat label="Today" value="—" />
            <Stat label="This Week" value="—" />
            <Stat label="Pending" value="—" />
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
      <span className="font-medium">{value}</span>
    </div>
  );
}
