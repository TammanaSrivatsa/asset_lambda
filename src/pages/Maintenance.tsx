import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Maintenance, Asset } from "@/types/domain";
import { Plus, Inbox, Wrench, Search, Calendar, DollarSign, Clock, CheckCircle2, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";

export default function MaintenancePage() {
  return (
    <MaintenanceTable
      title="Maintenance"
      description="Scheduled diagnostic checkups, hardware repairs, and fleet maintenance."
      showAction
    />
  );
}

export function MaintenanceTable({
  title,
  description,
  showAction,
}: {
  title: string;
  description?: string;
  showAction?: boolean;
}) {
  const { maintenance, assets, refreshData } = useData();

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Sheet Control
  const [selectedRecord, setSelectedRecord] = useState<Maintenance | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [issueText, setIssueText] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [reportedName, setReportedName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  // Filtered maintenance list
  const filteredRecords = useMemo(() => {
    let list = maintenance;

    // 1. Status Filter
    if (statusFilter !== "all") {
      list = list.filter((m) => m.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // 2. Asset Category Filter
    if (assetFilter !== "all") {
      list = list.filter((m) => {
        const asset = assets.find((a) => a.id === m.assetId);
        return asset?.category === assetFilter;
      });
    }

    // 3. Search Query (Issue, Technician, Asset Name, Reported By)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => {
        const asset = assets.find((a) => a.id === m.assetId);
        return (
          m.maintenanceId.toLowerCase().includes(q) ||
          m.issue.toLowerCase().includes(q) ||
          m.technician.toLowerCase().includes(q) ||
          m.reportedBy.toLowerCase().includes(q) ||
          (asset && asset.name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [maintenance, assets, statusFilter, assetFilter, searchQuery]);

  const uniqueCategories = useMemo(() => {
    const cats = assets.map((a) => a.category);
    return Array.from(new Set(cats));
  }, [assets]);

  const handleResetFilters = () => {
    setStatusFilter("all");
    setAssetFilter("all");
    setSearchQuery("");
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedAssetId || !issueText.trim() || !technicianName.trim() || !reportedName.trim()) {
      toast.error("Please fill in all details");
      return;
    }

    setSubmitting(true);
    try {
      const { createMaintenance } = await import("@/services/data");
      await createMaintenance({
        assetId: selectedAssetId,
        issue: issueText.trim(),
        technician: technicianName.trim(),
        reportedBy: reportedName.trim(),
        status: "Pending",
      });

      toast.success("Maintenance successfully scheduled");
      setCreateOpen(false);
      setSelectedAssetId("");
      setIssueText("");
      setTechnicianName("");
      setReportedName("");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule maintenance");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for optional or computed attributes
  const getCost = (record: Maintenance) => {
    return (record as any).cost || 120.00;
  };

  const getCompletionDate = (record: Maintenance) => {
    if (record.status.toLowerCase() === "completed") {
      return (record as any).completionDate || record.createdAt || "Jul 21, 2026";
    }
    return "Pending";
  };

  const columns = useMemo<ColumnDef<Maintenance>[]>(
    () => [
      {
        accessorKey: "maintenanceId",
        header: "Maintenance ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.maintenanceId}</span>,
      },
      {
        id: "asset",
        header: "Asset",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return (
            <div>
              <div className="font-medium text-foreground">{asset?.name ?? row.original.assetId}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{row.original.assetId}</div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return <span className="font-semibold text-primary">{asset?.category || "Laptop"}</span>;
        },
      },
      {
        accessorKey: "issue",
        header: "Issue",
        cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.issue}</span>,
      },
      {
        accessorKey: "technician",
        header: "Technician",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.technician || "Unassigned"}</span>,
      },
      {
        id: "cost",
        header: "Est/Actual Cost",
        cell: ({ row }) => <span className="font-semibold">${getCost(row.original).toFixed(2)}</span>,
      },
      {
        id: "completionDate",
        header: "Completion Date",
        cell: ({ row }) => <span className="text-xs">{getCompletionDate(row.original)}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Timeline",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRecord(row.original)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [assets]
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          showAction ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Schedule Maintenance
            </Button>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Logged
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenance.length}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {maintenance.filter((m) => m.status.toLowerCase() === "completed").length}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {maintenance.filter((m) => m.status.toLowerCase() === "in progress" || m.status.toLowerCase() === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${maintenance.reduce((acc, curr) => acc + getCost(curr), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records by technician, issue description, or asset name..."
              className="pl-8 h-9 text-sm bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full md:w-36 bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="h-9 w-full md:w-36 bg-background text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || statusFilter !== "all" || assetFilter !== "all") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-9 shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Main Table */}
      {filteredRecords.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No maintenance records found</p>
            <p className="text-sm">There are no diagnostic sheets matching your criteria.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
          <DataTable
            data={filteredRecords}
            columns={columns}
            searchPlaceholder="Filter diagnostic logs..."
            onRowClick={setSelectedRecord}
            pageSize={15}
          />
        </Card>
      )}

      {/* Maintenance Workflow Timeline Drawer */}
      <Sheet open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 bg-background border-l">
          {selectedRecord && (
            <>
              <SheetHeader className="p-0 border-b pb-4 gap-1 mb-5">
                <div className="text-xs font-mono text-muted-foreground">Log ID: {selectedRecord.maintenanceId}</div>
                <SheetTitle className="text-lg font-bold">Maintenance Job Detail</SheetTitle>
                <div className="mt-2">
                  <StatusBadge status={selectedRecord.status} />
                </div>
              </SheetHeader>

              <div className="space-y-5">
                {/* Properties list */}
                <Card className="p-4 rounded-xl border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Diagnostic details</h4>
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <span className="text-muted-foreground">Asset ID</span>
                    <span className="font-semibold text-foreground font-mono">{selectedRecord.assetId}</span>

                    <span className="text-muted-foreground">Asset Name</span>
                    <span className="font-medium text-foreground">
                      {assets.find((a) => a.id === selectedRecord.assetId)?.name || selectedRecord.assetId}
                    </span>

                    <span className="text-muted-foreground">Issue Description</span>
                    <span className="font-medium text-foreground">{selectedRecord.issue}</span>

                    <span className="text-muted-foreground">Assigned Tech</span>
                    <span className="font-semibold text-foreground">{selectedRecord.technician || "Unassigned"}</span>

                    <span className="text-muted-foreground">Estimated Cost</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-500">
                      ${getCost(selectedRecord).toFixed(2)}
                    </span>

                    <span className="text-muted-foreground">Reported By</span>
                    <span className="font-medium text-foreground">{selectedRecord.reportedBy}</span>

                    <span className="text-muted-foreground">Completion Date</span>
                    <span className="font-semibold text-foreground">{getCompletionDate(selectedRecord)}</span>
                  </div>
                </Card>

                {/* Workflow Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" /> Service Timeline
                  </h4>
                  <div className="relative pl-6 border-l-2 border-muted space-y-5 ml-3.5">
                    {/* Step 1: Created */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-background" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Request Initiated</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Logged by {selectedRecord.reportedBy} on {selectedRecord.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Under Diagnosis */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 border-4 border-background" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Under Investigation</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Assigned to technician {selectedRecord.technician || "Support Engineer"}
                        </span>
                      </div>
                    </div>

                    {/* Step 3: Finished */}
                    <div className="relative">
                      <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-4 border-background ${
                        selectedRecord.status.toLowerCase() === "completed" ? "bg-emerald-500" : "bg-muted"
                      }`} />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">Repair Resolved</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {selectedRecord.status.toLowerCase() === "completed"
                            ? `Completed on ${getCompletionDate(selectedRecord)}`
                            : "Waiting for diagnostic result"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" /> Schedule Maintenance Activity
            </DialogTitle>
            <DialogDescription>
              Create a support repair request for a hardware asset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="asset-select" className="text-sm font-medium">
                Select Asset
              </Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger id="asset-select">
                  <SelectValue placeholder="Select Asset ID / Serial" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.category} — {a.location} — {a.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue" className="text-sm font-medium">
                Issue Description
              </Label>
              <Input
                id="issue"
                placeholder="e.g. Battery swelling, screen blinking..."
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technician" className="text-sm font-medium">
                Assigned Technician
              </Label>
              <Input
                id="technician"
                placeholder="e.g. Robert Downy..."
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reported" className="text-sm font-medium">
                Reported By
              </Label>
              <Input
                id="reported"
                placeholder="e.g. employee name or IT engineer..."
                value={reportedName}
                onChange={(e) => setReportedName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleScheduleMaintenance} disabled={submitting || !selectedAssetId || !issueText.trim()}>
              {submitting ? "Scheduling..." : "Schedule Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
