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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, Asset, Employee } from "@/types/domain";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  RotateCcw,
  Plus,
  Inbox,
  Search,
  User,
  Laptop,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import {
  updateAssignment,
  deleteAssignment,
} from "@/services/data";

export default function AssignmentsPage() {
  const { assignments, assets, employees, refreshData, assignAssets } = useData();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    refreshData();
  }, []);

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status === "Active");
  }, [employees]);

  const availableAssets = useMemo(() => {
    return assets.filter((a) => a.status === "Available");
  }, [assets]);

  const handleCreateAssignment = async () => {
    if (!selectedEmployeeId || !selectedAssetId) {
      toast.error("Please select both an employee and an asset");
      return;
    }

    setSubmitting(true);
    try {
      await assignAssets(selectedEmployeeId, [selectedAssetId]);
      setCreateOpen(false);
      setSelectedEmployeeId("");
      setSelectedAssetId("");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Live Stats calculations
  const totalCount = assignments.length;
  const activeCount = assignments.filter((asg) => asg.status === "ACTIVE").length;
  const returnedCount = assignments.filter((asg) => asg.status === "RETURNED").length;

  const filteredAssignments = useMemo(() => {
    let list = assignments;

    // Apply status filter
    if (statusFilter !== "all") {
      list = list.filter((asg) => asg.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply global text search
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter((asg) => {
        const emp = employees.find((e) => e.id === asg.employeeId);
        const asset = assets.find((a) => a.id === asg.assetId);

        return (
          asg.assignmentId.toLowerCase().includes(q) ||
          asg.employeeId.toLowerCase().includes(q) ||
          asg.assetId.toLowerCase().includes(q) ||
          (emp && emp.name.toLowerCase().includes(q)) ||
          (emp && emp.department.toLowerCase().includes(q)) ||
          (asset && String(asset.name || "").toLowerCase().includes(q)) ||
          (asset && String(asset.serial || "").toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [assignments, searchQuery, statusFilter, employees, assets]);

  const columns = useMemo<ColumnDef<Assignment>[]>(
    () => [
      {
        accessorKey: "assignmentId",
        header: "Assignment ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.assignmentId}</span>,
      },
      {
        id: "employeeDetails",
        header: "Employee Details",
        cell: ({ row }) => {
          const emp = employees.find((e) => e.id === row.original.employeeId);
          return (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {emp ? emp.name.split(" ").map(n => n[0]).join("").slice(0,2) : "EM"}
              </div>
              <div>
                <span className="font-medium text-foreground block leading-tight">
                  {emp ? emp.name : row.original.employeeId}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {row.original.employeeId} {emp?.department ? `• ${emp.department}` : ""}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "assetDetails",
        header: "Asset Details",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Laptop className="h-4 w-4" />
              </div>
              <div>
                <span className="font-medium text-foreground block leading-tight">
                  {asset ? asset.name : row.original.assetId}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {row.original.assetId} {asset?.serial ? `• Serial: ${asset.serial}` : ""}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return <span className="font-semibold text-primary">{asset ? asset.category : "Laptop"}</span>;
        },
      },
      {
        id: "assignedBy",
        header: "Assigned By",
        cell: ({ row }) => {
          const emp = employees.find((e) => e.id === row.original.employeeId);
          return <span>{emp?.allocatedAssetDetails?.assignedBy || "IT Support"}</span>;
        },
      },
      {
        accessorKey: "assignedDate",
        header: "Assigned Date",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.assignedDate}</span>,
      },
      {
        id: "status",
        header: "Assignment Status",
        cell: ({ row }) => {
          const displayStatus = row.original.status === "ACTIVE" ? "Active" : "Returned";
          return <StatusBadge status={displayStatus} />;
        },
      },
      {
        id: "workflow",
        header: "Workflow Stage",
        cell: ({ row }) => {
          const text = row.original.status === "ACTIVE" ? "Active" : "Completed";
          return <StatusBadge status={text} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const isActive = row.original.status === "ACTIVE";
          return (
            <div className="flex gap-1 justify-end">
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  title="Return Asset"
                  className="h-7 px-2 text-xs"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await updateAssignment(row.original.assignmentId);
                      await refreshData();
                      toast.success("Asset returned to inventory successfully");
                    } catch (err: any) {
                      toast.error(err.message || "Failed to return asset");
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Return
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                title="Decommission Assignment"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await deleteAssignment(row.original.assignmentId);
                    await refreshData();
                    toast.success("Assignment record deleted successfully");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete assignment");
                  }
                }}
              >
                <ArrowLeftRight className="h-3 w-3 mr-1" /> Decom
              </Button>
            </div>
          );
        },
      },
    ],
    [assets, employees]
  );

  return (
    <>
      <PageHeader
        title="Asset Assignments"
        description="Deploy hardware, manage returns, and tracking assignments history."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Assignment
          </Button>
        }
      />

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Operations
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total assignment dispatches on record</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Assignments
            </CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{activeCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Devices currently in employee custody</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Returned Safely
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{returnedCount}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Assignments safely closed & retired</p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Control bar */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by ID, employee, asset, serial..."
              className="pl-8 h-9 text-sm bg-background"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="h-9 rounded-lg p-0.5 bg-muted/60 w-full sm:w-auto">
              <TabsTrigger value="all" className="text-xs px-3 py-1">All</TabsTrigger>
              <TabsTrigger value="ACTIVE" className="text-xs px-3 py-1">Active</TabsTrigger>
              <TabsTrigger value="RETURNED" className="text-xs px-3 py-1">Returned</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Assignments Table */}
      {filteredAssignments.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No assignments found</p>
            <p className="text-sm">There are no hardware devices matching the search criteria.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
          <DataTable
            data={filteredAssignments}
            columns={columns}
            searchPlaceholder="Filter assignments..."
            pageSize={15}
          />
        </Card>
      )}

      {/* New Assignment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create Asset Assignment
            </DialogTitle>
            <DialogDescription>
              Deploy an available hardware unit directly to an active employee workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="employee" className="text-sm font-medium">
                Select Employee
              </Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} — {emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset" className="text-sm font-medium">
                Select Available Asset
              </Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select Available Unit" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.category} — {asset.location} — {asset.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment} disabled={submitting || !selectedEmployeeId || !selectedAssetId}>
              {submitting ? "Assigning..." : "Assign Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
