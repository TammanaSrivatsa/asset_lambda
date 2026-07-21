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
import { useData } from "@/contexts/data";
import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, AlertCircle, Search, Inbox } from "lucide-react";

export default function OnboardingVerificationPage() {
  const { employees, assets, verifyOnboardingAsset, refreshData } = useData();

  const [tab, setTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Control
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");

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
      (a) => a.status === "Available" && a.category === reqCat && a.location === reqLoc
    ).length;
  }, [assets, reviewingEmployee]);

  const handleOpenVerifyDialog = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");
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
          const isPendingReview =
            status === "Awaiting Asset Verification" ||
            status === "Pending Asset Manager Review" ||
            status === "Waiting for Inventory" ||
            status === "Out of Stock";

          if (isPendingReview) {
            return (
              <Button size="sm" variant="outline" onClick={() => handleOpenVerifyDialog(row.original)}>
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
              placeholder="Search verification pipeline by name, department..."
              className="pl-8 h-9 text-sm"
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

      {/* Verify Dialog Modal */}
      <Dialog open={!!reviewingEmployee} onOpenChange={(o) => !o && setReviewingEmployee(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Onboarding Inventory Check
            </DialogTitle>
            <DialogDescription>
              Verify stock levels in the employee's designated office region.
            </DialogDescription>
          </DialogHeader>

          {reviewingEmployee && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-y-2 border-b pb-3">
                <span className="text-muted-foreground">Employee Name</span>
                <span className="font-semibold text-foreground">{reviewingEmployee.name}</span>
                <span className="text-muted-foreground">Office Location</span>
                <span className="font-medium text-foreground">{reviewingEmployee.location}</span>
                <span className="text-muted-foreground">Required Category</span>
                <span className="font-semibold text-primary">
                  {reviewingEmployee.requiredAssetCategory || "Laptop"}
                </span>
              </div>

              <div className="p-4 rounded-lg border">
                {localAvailableAssetsCount > 0 ? (
                  <div className="space-y-1">
                    <div className="text-success font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4.5 w-4.5" /> Stock Verified Available
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Found <strong>{localAvailableAssetsCount} available</strong>{" "}
                      {reviewingEmployee.requiredAssetCategory || "Laptop"}(s) in{" "}
                      {reviewingEmployee.location}. Ready to approve allocation workflow.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-destructive font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4.5 w-4.5" /> Out of Stock
                    </div>
                    <div className="text-xs text-muted-foreground">
                      No available {reviewingEmployee.requiredAssetCategory || "Laptop"} assets found
                      in {reviewingEmployee.location}. Procurement needed before Support Engineer can
                      assign hardware.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold">Verification Remarks / Notes</Label>
                <Input
                  className="mt-1.5 text-sm"
                  placeholder="e.g. Approved. Dell Latitude stock checked."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setReviewingEmployee(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleVerifySubmit(false)}>
              Flag Out of Stock
            </Button>
            <Button
              onClick={() => handleVerifySubmit(true)}
              disabled={localAvailableAssetsCount === 0}
            >
              Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
