import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Plus, Inbox, RotateCcw, Wrench } from "lucide-react";
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

  // Modal Control
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
      // Import the creation service directly if context doesn't expose it
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

  const columns = useMemo<ColumnDef<Maintenance>[]>(
    () => [
      {
        accessorKey: "maintenanceId",
        header: "Maintenance ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.maintenanceId}</span>,
      },
      {
        id: "asset",
        header: "Asset Name",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return (
            <div>
              <div className="font-medium text-foreground">{asset?.name ?? row.original.assetId}</div>
              <div className="text-xs text-muted-foreground font-mono">{row.original.assetId}</div>
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
        header: "Reported Issue",
      },
      {
        accessorKey: "technician",
        header: "Technician",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.technician || "Unassigned"}</span>,
      },
      {
        accessorKey: "reportedBy",
        header: "Reported By",
      },
      {
        accessorKey: "createdAt",
        header: "Reported Date",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.createdAt}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Schedule Maintenance
            </Button>
          ) : undefined
        }
      />

      {/* Filters bar */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records by technician, issue description, or asset name..."
              className="bg-background h-9 text-sm"
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
            pageSize={15}
          />
        </Card>
      )}

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
