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
import { ArrowLeftRight, RotateCcw, Plus, Inbox, ShieldAlert } from "lucide-react";
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

  const columns = useMemo<ColumnDef<Assignment>[]>(
    () => [
      {
        accessorKey: "assignmentId",
        header: "Assignment ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.assignmentId}</span>,
      },
      {
        accessorKey: "employeeId",
        header: "Employee ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.employeeId}</span>,
      },
      {
        id: "employeeName",
        header: "Employee Name",
        cell: ({ row }) => {
          const emp = employees.find((e) => e.id === row.original.employeeId);
          return <span className="font-medium text-foreground">{emp ? emp.name : row.original.employeeId}</span>;
        },
      },
      {
        accessorKey: "assetId",
        header: "Asset ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.assetId}</span>,
      },
      {
        id: "assetName",
        header: "Asset Name",
        cell: ({ row }) => {
          const asset = assets.find((a) => a.id === row.original.assetId);
          return <span className="font-medium text-foreground">{asset ? asset.name : row.original.assetId}</span>;
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
        id: "department",
        header: "Department",
        cell: ({ row }) => {
          const emp = employees.find((e) => e.id === row.original.employeeId);
          return <span>{emp ? emp.department : "—"}</span>;
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
        id: "comment",
        header: "IT Comment",
        cell: ({ row }) => {
          const emp = employees.find((e) => e.id === row.original.employeeId);
          return (
            <span className="text-xs text-muted-foreground italic truncate max-w-[150px] block">
              {emp?.allocatedAssetDetails?.remarks || "Onboarding asset configured."}
            </span>
          );
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
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
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
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Decom
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
        description="Assign, return, and transfer active assets across organization units."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Assignment
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No active assignments</p>
            <p className="text-sm">There are no hardware devices currently dispatched to employees.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
          <DataTable
            data={assignments}
            columns={columns}
            searchPlaceholder="Search assignment records by employee ID, asset ID..."
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
