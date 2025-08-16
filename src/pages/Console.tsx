import EventConsole from "@/components/console/EventConsole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Activity, Database, Shield } from "lucide-react";

export default function Console() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Console</h1>
          <p className="text-muted-foreground">
            Real-time event monitoring, workflow testing, and system diagnostics
          </p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Terminal className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Event Stream</p>
                <p className="text-xs text-muted-foreground">Real-time system events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">Workflow Monitoring</p>
                <p className="text-xs text-muted-foreground">N8N workflow execution</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Asset Operations</p>
                <p className="text-xs text-muted-foreground">CRUD and status changes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium">Security Events</p>
                <p className="text-xs text-muted-foreground">Threats and violations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Console Component */}
      <EventConsole />
    </div>
  );
}