import { useState, useMemo, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useData } from "@/contexts/data";
import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { Laptop, ArrowRight, User, Search, Inbox, ShieldCheck, HelpCircle } from "lucide-react";

export default function AllocationOnboardingPage() {
  const { employees, assets, completeOnboardingAllocation, refreshData } = useData();

  const [tab, setTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Control
  const [assigningEmployee, setAssigningEmployee] = useState<Employee | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetSearch, setAssetSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filterByLocation, setFilterByLocation] = useState(true);

  useEffect(() => {
    refreshData();
  }, []);

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return "";
    try {
      const d = new Date(`${dateStr}T${timeStr}:00`);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  // Helper to extract approval data
  const getApprovalDetails = (emp: Employee) => {
    const verifyStep = emp.allocationHistory?.find(
      (h) =>
        h.step === "Inventory Verified" ||
        h.step === "Ready for Allocation" ||
        h.step === "Ready for Asset Allocation"
    );
    return {
      approvedBy: verifyStep?.actor || emp.allocatedAssetDetails?.assignedBy || "Asset Manager",
      approvalDate: verifyStep?.timestamp || emp.allocatedAssetDetails?.assignedAt || emp.joinDate || "—",
    };
  };

  // Filtered Onboarding Employees
  const onboardingEmployees = useMemo(() => {
    return employees.filter((emp) => emp.allocationStatus);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = onboardingEmployees;

    // 1. Tab Status Filter
    if (tab !== "all") {
      list = list.filter((emp) => {
        const status = emp.allocationStatus;
        if (tab === "pending_support") return status === "Ready for Allocation" || status === "Ready for Asset Allocation";
        if (tab === "verified") return status === "Ready for Allocation" || status === "Ready for Asset Allocation";
        if (tab === "pending_review") return status === "Awaiting Asset Verification" || status === "Pending Asset Manager Review";
        if (tab === "allocated") return status === "Allocated" || status === "Completed";
        if (tab === "out_of_stock") return status === "Waiting for Inventory" || status === "Out of Stock";
        return true;
      });
    }

    // 2. Search Text Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (emp) =>
          emp.id.toLowerCase().includes(q) ||
          emp.name.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          (emp.requiredAssetCategory && emp.requiredAssetCategory.toLowerCase().includes(q))
      );
    }

    return list;
  }, [onboardingEmployees, tab, searchQuery]);

  const availableAssets = useMemo(() => {
    if (!assigningEmployee) return [];
    return assets.filter((asset) => {
      if (asset.status !== "Available") return false;
      if (asset.category !== (assigningEmployee.requiredAssetCategory || "Laptop")) return false;
      if (filterByLocation && asset.location !== assigningEmployee.location) return false;
      if (assetSearch.trim()) {
        const s = assetSearch.toLowerCase();
        return (
          asset.name.toLowerCase().includes(s) ||
          asset.id.toLowerCase().includes(s) ||
          asset.category.toLowerCase().includes(s) ||
          asset.model.toLowerCase().includes(s) ||
          asset.serial.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [assets, assigningEmployee, assetSearch, filterByLocation]);

  const handleOpenAssignDialog = (emp: Employee) => {
    setAssigningEmployee(emp);
    setSelectedAssetId("");
    setAssetSearch("");
    setRemarks("");
    setFilterByLocation(true);
  };

  const handleConfirmAssignment = async () => {
    if (!assigningEmployee || !selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    try {
      await completeOnboardingAllocation(
        assigningEmployee.id,
        selectedAssetId,
        remarks || "Workspace hardware configured.",
        "Support Engineer User"
      );
      toast.success(`Asset "${asset.name}" allocated to ${assigningEmployee.name}. Onboarding completed.`);
      setAssigningEmployee(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate asset");
    }
  };

  const columns: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Employee ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: "Employee Name",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "department",
        header: "Department",
      },
      {
        accessorKey: "requiredAssetCategory",
        header: "Required Hardware",
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {row.original.requiredAssetCategory || "Laptop"}
          </span>
        ),
      },
      {
        accessorKey: "joinDate",
        header: "Joining Date",
      },
      {
        id: "verification",
        header: "Verification",
        cell: ({ row }) => {
          const status = row.original.allocationStatus;
          let label = "Pending Check";
          let variant = "Awaiting Asset Verification";
          if (status === "Ready for Allocation" || status === "Ready for Asset Allocation" || status === "Completed" || status === "Allocated") {
            label = "Verified";
            variant = "Completed";
          } else if (status === "Waiting for Inventory" || status === "Out of Stock") {
            label = "Out of Stock";
            variant = "Waiting for Inventory";
          }
          return <StatusBadge status={variant} />;
        },
      },
      {
        id: "workflow",
        header: "Workflow Status",
        cell: ({ row }) => {
          const raw = row.original.allocationStatus || "Awaiting Asset Verification";
          let display = raw;
          if (raw === "Ready for Asset Allocation") display = "Ready for Allocation";
          if (raw === "Completed") display = "Allocated";
          return <StatusBadge status={display} />;
        },
      },
      {
        id: "approvedBy",
        header: "Approved By",
        cell: ({ row }) => {
          const { approvedBy } = getApprovalDetails(row.original);
          return <span>{approvedBy}</span>;
        },
      },
      {
        id: "approvalDate",
        header: "Approval Date",
        cell: ({ row }) => {
          const { approvalDate } = getApprovalDetails(row.original);
          return <span className="text-xs text-muted-foreground">{approvalDate}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const status = row.original.allocationStatus;
          const isReady =
            status === "Ready for Allocation" || status === "Ready for Asset Allocation";

          if (isReady) {
            return (
              <Button size="sm" onClick={() => handleOpenAssignDialog(row.original)}>
                Allocate Asset
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs italic">Awaiting steps</span>;
        },
      },
    ],
    [assets]
  );

  return (
    <>
      <PageHeader
        title="Asset Onboarding Hub"
        description="Verify stock hardware configurations and execute workspace setups."
      />

      <div className="space-y-4">
        {/* Onboarding Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:flex md:w-auto h-auto p-1 bg-muted/60 gap-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              All ({onboardingEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="pending_support" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Pending IT Support
            </TabsTrigger>
            <TabsTrigger value="verified" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Verified
            </TabsTrigger>
            <TabsTrigger value="pending_review" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Pending AM Review
            </TabsTrigger>
            <TabsTrigger value="allocated" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Allocated
            </TabsTrigger>
            <TabsTrigger value="out_of_stock" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Out of Stock
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter Input Card */}
        <Card className="p-4 rounded-xl border shadow-sm bg-card">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee directory by name, ID or department..."
              className="pl-8 h-9 text-sm"
            />
          </div>
        </Card>

        {/* Data Table */}
        {filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center rounded-xl border">
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Inbox className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">No onboardings in this filter</p>
              <p className="text-sm">There are no onboarding profiles matching the criteria.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
            <DataTable
              data={filteredEmployees}
              columns={columns}
              searchPlaceholder="Refine current list results..."
              pageSize={10}
            />
          </Card>
        )}
      </div>

      {/* Allocation Drawer Dialog */}
      <Dialog open={!!assigningEmployee} onOpenChange={(o) => !o && setAssigningEmployee(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-primary" /> Assign Workspace Hardware
            </DialogTitle>
            <DialogDescription>
              Select from available stock units to dispatch hardware to the user workspace.
            </DialogDescription>
          </DialogHeader>

          {assigningEmployee && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-muted/50 rounded-lg border grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Employee Name</span>
                  <span className="font-medium flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> {assigningEmployee.name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Employee ID</span>
                  <span className="font-mono mt-0.5 block">{assigningEmployee.id}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Required hardware category</span>
                  <span className="font-bold mt-0.5 block text-primary">
                    {assigningEmployee.requiredAssetCategory || "Laptop"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Office Location</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {assigningEmployee.location}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Available Stock List
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="loc-filter"
                      checked={filterByLocation}
                      onCheckedChange={(checked) => setFilterByLocation(!!checked)}
                    />
                    <Label
                      htmlFor="loc-filter"
                      className="text-xs text-muted-foreground cursor-pointer select-none"
                    >
                      Filter assets in {assigningEmployee.location}
                    </Label>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stock by serial, brand, or model..."
                    className="pl-8 h-9 text-sm"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                  />
                </div>

                <div className="border rounded-md max-h-[220px] overflow-y-auto divide-y bg-background scrollbar-thin">
                  {availableAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No available {assigningEmployee.requiredAssetCategory || "Laptop"}s found in{" "}
                      {filterByLocation ? assigningEmployee.location : "any location"}.
                      {filterByLocation && (
                        <button
                          type="button"
                          className="text-primary hover:underline block mx-auto mt-1 font-medium"
                          onClick={() => setFilterByLocation(false)}
                        >
                          Show assets in all locations
                        </button>
                      )}
                    </div>
                  ) : (
                    availableAssets.map((asset) => {
                      const selected = selectedAssetId === asset.id;
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            selected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-muted-foreground uppercase">
                              {asset.category}
                            </div>
                            <div className="text-sm font-semibold truncate text-foreground mt-0.5">
                              {asset.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Model: {asset.model} • S/N: {asset.serial}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground border">
                              {asset.id}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">
                              {asset.location}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Allocation Comments / Remarks</Label>
                <Input
                  className="mt-1.5 text-sm"
                  placeholder="Notes (e.g. Configured employee profile, delivered device to user.)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setAssigningEmployee(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAssignment} disabled={!selectedAssetId}>
              Confirm Allocation & Onboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
