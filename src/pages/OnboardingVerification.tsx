import { useState, useMemo, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/data";
import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, AlertCircle, Search, Inbox, User, Calendar, CheckSquare } from "lucide-react";

export default function OnboardingVerificationPage() {
  const { employees, assets, verifyOnboardingAsset, refreshData } = useData();

  const [tab, setTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer Control
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");

  // Checklist states
  const [inventoryVerified, setInventoryVerified] = useState(false);
  const [serialAssigned, setSerialAssigned] = useState(false);
  const [allocationApproved, setAllocationApproved] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const verificationQueue = useMemo(() => {
    return employees.filter((emp) => emp.allocationStatus);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = verificationQueue;

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

    // 2. Search Text Filter
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
  }, [verificationQueue, tab, searchQuery]);

  const localAvailableAssetsCount = useMemo(() => {
    if (!reviewingEmployee) return 0;
    const reqCat = reviewingEmployee.requiredAssetCategory || "Laptop";
    const reqLoc = reviewingEmployee.location;
    return assets.filter(
      (a) => a.status === "Available" && a.category === reqCat && (a.location === reqLoc || !a.location)
    ).length;
  }, [assets, reviewingEmployee]);

  const handleOpenVerifyDrawer = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");
    // Reset checklists
    setInventoryVerified(false);
    setSerialAssigned(false);
    setAllocationApproved(false);
  };

  const handleVerifySubmit = async (approved: boolean) => {
    if (!reviewingEmployee) return;

    try {
      await verifyOnboardingAsset(
        reviewingEmployee.id,
        approved,
        remarks || (approved ? "Inventory verified available." : "Out of stock in office region."),
        "Asset Manager User"
      );

      if (approved) {
        toast.success(
          `Onboarding approved. Status of ${reviewingEmployee.name} updated to "Ready for Allocation".`
        );
      } else {
        toast.warning(
          `Allocation flagged as blocked. Status of ${reviewingEmployee.name} set to "Waiting for Inventory". Procurement notified.`
        );
      }
      setReviewingEmployee(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification status");
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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
              {row.original.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <span className="font-medium text-foreground">{row.original.name}</span>
          </div>
        ),
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status || "Active"} />,
      },
      {
        accessorKey: "joinDate",
        header: "Joining Date",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.joinDate || "—"}</span>,
      },
      {
        id: "allocationSchedule",
        header: "Allocation Schedule",
        cell: ({ row }) => {
          const date = row.original.allocationDate;
          const time = row.original.allocationTime;
          return date ? (
            <span className="text-xs font-medium text-foreground">
              {date} {time ? `at ${time}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs italic">Not Scheduled</span>
          );
        },
      },
      {
        id: "verification",
        header: "Verification Status",
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
        header: "Workflow State",
        cell: ({ row }) => {
          const raw = row.original.allocationStatus || "Awaiting Asset Verification";
          let display = raw;
          if (raw === "Ready for Asset Allocation") display = "Ready for Allocation";
          if (raw === "Completed") display = "Allocated";
          return <StatusBadge status={display} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const status = row.original.allocationStatus;
          const isPendingReview =
            status === "Awaiting Asset Verification" ||
            status === "Pending Asset Manager Review" ||
            status === "Waiting for Inventory" ||
            status === "Out of Stock";

          if (isPendingReview) {
            return (
              <Button size="sm" variant="outline" className="h-8 border-primary/20 hover:border-primary/50 text-xs" onClick={() => handleOpenVerifyDrawer(row.original)}>
                Verify Inventory
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs italic">Verified</span>;
        },
      },
    ],
    [assets]
  );

  return (
    <>
      <PageHeader
        title="Employee Onboarding Verification"
        description="Verify hardware inventory availability and authorize new hire device deployments."
      />

      <div className="space-y-4">
        {/* Verification Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:flex md:w-auto h-auto p-1 bg-muted/60 gap-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              All ({verificationQueue.length})
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

        {/* Search Bar */}
        <Card className="p-4 rounded-xl border shadow-sm bg-card">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verification pipeline by name, department, hardware..."
              className="pl-8 h-9 text-sm bg-background"
            />
          </div>
        </Card>

        {/* Data Table */}
        {filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center rounded-xl border">
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Inbox className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">No records matching view</p>
              <p className="text-sm">All verification items resolved.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
            <DataTable
              data={filteredEmployees}
              columns={columns}
              searchPlaceholder="Refine queue results..."
              pageSize={10}
            />
          </Card>
        )}
      </div>

      {/* Verify Inventory Sliding Right Drawer */}
      <Sheet open={!!reviewingEmployee} onOpenChange={(o) => !o && setReviewingEmployee(null)}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-6 bg-background flex flex-col h-full border-l">
          <SheetHeader className="p-0 border-b pb-4 shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList className="h-5 w-5" />
              <SheetTitle className="text-lg font-bold">Verify Onboarding Inventory</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Review stock availability, update verification status, and checklist.
            </SheetDescription>
          </SheetHeader>

          {reviewingEmployee && (
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              {/* Employee Summary Card */}
              <Card className="p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3 mb-3 border-b pb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 font-bold">
                    {reviewingEmployee.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{reviewingEmployee.name}</h4>
                    <p className="text-xs text-muted-foreground">Dept: {reviewingEmployee.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><User className="h-3.5 w-3.5" /> Employee ID</span>
                  <span className="font-semibold text-foreground font-mono">{reviewingEmployee.id}</span>

                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joining Date</span>
                  <span className="font-semibold text-foreground">{reviewingEmployee.joinDate || "—"}</span>

                  <span className="text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Required Hardware</span>
                  <span className="font-bold text-primary">{reviewingEmployee.requiredAssetCategory || "Laptop"}</span>
                </div>
              </Card>

              {/* Inventory Availability Indicator */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory Availability</Label>
                <div className="p-4 rounded-xl border bg-card">
                  {localAvailableAssetsCount > 0 ? (
                    <div className="space-y-1">
                      <div className="text-success font-semibold flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> Stock Available in Region
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Found <strong>{localAvailableAssetsCount} available</strong>{" "}
                        {reviewingEmployee.requiredAssetCategory || "Laptop"}(s) in{" "}
                        {reviewingEmployee.location || "global stock"}.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-destructive font-semibold flex items-center gap-1.5 text-sm">
                        <AlertCircle className="h-4.5 w-4.5 text-red-500" /> Stock Alert: Out of Stock
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        No available {reviewingEmployee.requiredAssetCategory || "Laptop"} assets found in{" "}
                        {reviewingEmployee.location || "this location"}. Procurement action required.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Custodian / Assigned Asset */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Asset Details</Label>
                <div className="p-3.5 rounded-xl border text-xs grid grid-cols-2 gap-y-2">
                  <span className="text-muted-foreground">Assigned Asset</span>
                  <span className="font-semibold text-foreground">
                    {reviewingEmployee.allocatedAssetDetails?.assetName || "None Assigned"}
                  </span>
                  <span className="text-muted-foreground">Serial Number</span>
                  <span className="font-mono text-foreground font-semibold">
                    {reviewingEmployee.allocatedAssetDetails?.serialNumber || "N/A"}
                  </span>
                </div>
              </div>

              {/* Interactive Checklist */}
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-primary" /> Onboarding Checklist
                </Label>
                <div className="space-y-3 p-3.5 border rounded-xl bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="checklist-inventory"
                      checked={inventoryVerified}
                      onCheckedChange={(checked) => setInventoryVerified(checked === true)}
                    />
                    <label htmlFor="checklist-inventory" className="text-xs font-medium leading-none cursor-pointer select-none">
                      Inventory Verified (Warehouse stock levels validated)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="checklist-serial"
                      checked={serialAssigned}
                      onCheckedChange={(checked) => setSerialAssigned(checked === true)}
                    />
                    <label htmlFor="checklist-serial" className="text-xs font-medium leading-none cursor-pointer select-none">
                      Serial Assigned (Selected serial linked/reserved)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="checklist-approved"
                      checked={allocationApproved}
                      onCheckedChange={(checked) => setAllocationApproved(checked === true)}
                    />
                    <label htmlFor="checklist-approved" className="text-xs font-medium leading-none cursor-pointer select-none">
                      Allocation Approved (Ready for support engineer handoff)
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes Area */}
              <div className="space-y-2">
                <Label htmlFor="drawer-remarks" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verification Notes
                </Label>
                <Textarea
                  id="drawer-remarks"
                  placeholder="Enter remarks e.g. Certified stock level in Hyderbad, reserved Serial AST-X204"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="text-xs min-h-[70px] bg-background"
                />
              </div>
            </div>
          )}

          <SheetFooter className="border-t pt-4 shrink-0 flex-row gap-2 justify-end sm:space-x-0">
            <Button variant="outline" size="sm" onClick={() => setReviewingEmployee(null)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleVerifySubmit(false)}
              className="flex-1 sm:flex-initial"
            >
              Out Of Stock
            </Button>
            <Button
              size="sm"
              onClick={() => handleVerifySubmit(true)}
              // Enable action only if checklist elements are verified or stock available
              disabled={localAvailableAssetsCount === 0 && !inventoryVerified}
              className="flex-1 sm:flex-initial"
            >
              Verify Inventory
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
