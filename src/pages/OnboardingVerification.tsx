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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/data";
import type { Employee, Asset } from "@/types/domain";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, AlertCircle, Search, Inbox, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Helper to get all allocated asset names for an employee
const getAllocatedAssetNames = (emp: Employee, allAssets: Asset[]) => {
  const names = new Set<string>();

  // 1. From allocatedAssetDetails:
  const detailsArray = Array.isArray(emp.allocatedAssetDetails)
    ? emp.allocatedAssetDetails
    : emp.allocatedAssetDetails
      ? [emp.allocatedAssetDetails]
      : [];

  detailsArray.forEach(detail => {
    if ((detail as any).assetName) {
      names.add((detail as any).assetName);
    }
  });

  // 2. From allocatedAssets:
  if ((emp as any).allocatedAssets) {
    const al = (emp as any).allocatedAssets;
    const alArray = Array.isArray(al) ? al : typeof al === "string" ? al.split(",") : [];
    alArray.forEach((val: any) => {
      const trimmed = String(val).trim();
      if (trimmed) names.add(trimmed);
    });
  }

  // 3. From assets list:
  const matchedAssets = allAssets.filter(a => a.assignedTo === emp.id);
  matchedAssets.forEach(a => {
    if (a.name) names.add(a.name);
  });

  return Array.from(names);
};

// Helper to get pending assets list (categories not allocated yet)
const getPendingAssets = (emp: Employee, allAssets: Asset[]) => {
  if (!emp.requiredAssetCategory) {
    return "N/A";
  }

  const req = emp.requiredAssetCategory;
  const required = Array.isArray(req)
    ? req.map(String)
    : typeof req === "string"
      ? req.split(",").map(c => c.trim()).filter(Boolean)
      : [];
  if (required.length === 0) {
    return "N/A";
  }

  const allocatedCats = new Set<string>();

  // 1. From allocatedAssetDetails
  const detailsArray = Array.isArray(emp.allocatedAssetDetails)
    ? emp.allocatedAssetDetails
    : emp.allocatedAssetDetails
      ? [emp.allocatedAssetDetails]
      : [];

  detailsArray.forEach(detail => {
    const category = (detail as any).category || (detail as any).assetCategory;
    if (category) {
      allocatedCats.add(category.toLowerCase());
    } else {
      const name = (detail as any).assetName;
      if (name) {
        const lowerName = name.toLowerCase();
        const cats = ["Laptop", "Desktop", "Monitor", "Printer", "Mobile", "Keyboard", "Mouse", "Dock"];
        const matchedCat = cats.find(c => lowerName.includes(c.toLowerCase()));
        if (matchedCat) {
          allocatedCats.add(matchedCat.toLowerCase());
        } else {
          allocatedCats.add(name.toLowerCase());
        }
      }
    }
  });

  // 2. From allocatedAssets
  if ((emp as any).allocatedAssets) {
    const al = (emp as any).allocatedAssets;
    const alArray = Array.isArray(al) ? al : typeof al === "string" ? al.split(",") : [];
    alArray.forEach((val: any) => {
      const str = String(val).trim().toLowerCase();
      const match = allAssets.find(a => a.name.toLowerCase() === str || a.category.toLowerCase() === str);
      if (match && match.category) {
        allocatedCats.add(match.category.toLowerCase());
      } else {
        allocatedCats.add(str);
      }
    });
  }

  // 3. From assets list (where assignedTo === emp.id)
  allAssets.forEach(a => {
    if (a.assignedTo === emp.id && a.category) {
      allocatedCats.add(a.category.toLowerCase());
    }
  });

  const pending = required.filter(reqCat => {
    return !allocatedCats.has(reqCat.toLowerCase());
  });

  return pending;
};

const isFullyAllocated = (emp: Employee, allAssets: Asset[]) => {
  const pending = getPendingAssets(emp, allAssets);
  return Array.isArray(pending) && pending.length === 0;
};

const getCategoryEmoji = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes("laptop")) return "🟦";
  if (c.includes("mobile") || c.includes("phone")) return "🟩";
  if (c.includes("desktop")) return "💻";
  if (c.includes("monitor")) return "📺";
  if (c.includes("keyboard")) return "⌨️";
  if (c.includes("mouse")) return "🖱️";
  if (c.includes("printer")) return "🖨️";
  if (c.includes("dock")) return "🔌";
  return "⚙️";
};

export default function OnboardingVerificationPage() {
  const { employees, assets, verifyOnboardingAsset, refreshData } = useData();

  const [tab, setTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer Control
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Record<string, string>>({});

  const requiredCategories = useMemo(() => {
    if (!reviewingEmployee?.requiredAssetCategory) return [];
    const req = reviewingEmployee.requiredAssetCategory;
    return Array.isArray(req)
      ? req
      : typeof req === "string"
        ? req.split(",").map(c => c.trim()).filter(Boolean)
        : [];
  }, [reviewingEmployee]);

  const isVerifyDisabled = useMemo(() => {
    if (!reviewingEmployee || requiredCategories.length === 0) return true;
    return !requiredCategories.every(cat => {
      const selectedId = selectedAssets[cat];
      if (!selectedId) return false;
      const asset = assets.find(a => a.id === selectedId);
      return asset && asset.category.toLowerCase() === cat.toLowerCase();
    });
  }, [reviewingEmployee, requiredCategories, selectedAssets, assets]);



  useEffect(() => {
    refreshData();
  }, []);

  const verificationQueue = useMemo(() => {
    return employees.filter(
      (emp) => emp.workflowState === "Pending Asset Manager"
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = verificationQueue;

    // 1. Tab Status Filter
    if (tab !== "all") {
    list = list.filter((emp) => {

        if (tab === "pending_asset_manager") {
            return emp.workflowState === "Pending Asset Manager";
        }

        if (tab === "waiting_inventory") {
            return emp.workflowState === "Waiting for Inventory";
        }

        if (tab === "pending_it_support") {
            return emp.workflowState === "Pending IT Support";
        }

        if (tab === "completed") {
            return emp.workflowState === "Completed";
        }

        return true;
    });
}

    // 2. Search Text Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter((emp) => {
        const allocatedNames = getAllocatedAssetNames(emp, assets);
        const pendingResult = getPendingAssets(emp, assets);
        const pendingNames = Array.isArray(pendingResult) ? pendingResult : [];

        return (
          emp.id.toLowerCase().includes(q) ||
          emp.name.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          ((Array.isArray(emp.requiredAssetCategory) ? emp.requiredAssetCategory.join(", ") : emp.requiredAssetCategory || "").toLowerCase().includes(q)) ||
          allocatedNames.some((name) => name.toLowerCase().includes(q)) ||
          pendingNames.some((name) => name.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [verificationQueue, tab, searchQuery, assets]);

  const localAvailableAssetsCount = useMemo(() => {
    if (!reviewingEmployee) return 0;
    const req = reviewingEmployee.requiredAssetCategory;
    const reqCats = Array.isArray(req)
      ? req.map(c => String(c).trim().toLowerCase())
      : typeof req === "string"
        ? req.split(",").map(c => c.trim().toLowerCase())
        : ["laptop"];
    const reqLoc = reviewingEmployee.location;
    return assets.filter(
      (a) => a.status === "Available" && reqCats.includes((a.category || "").toLowerCase()) && (a.location === reqLoc || !a.location)
    ).length;
  }, [assets, reviewingEmployee]);

  const handleOpenVerifyDrawer = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");

    const initialSelected: Record<string, string> = {};
    const req = emp.requiredAssetCategory;
    const reqCats = Array.isArray(req)
      ? req
      : typeof req === "string"
        ? req.split(",").map(c => c.trim()).filter(Boolean)
        : [];
    reqCats.forEach(cat => {
      const alreadyAssigned = assets.find(a => a.assignedTo === emp.id && a.category.toLowerCase() === cat.toLowerCase());
      if (alreadyAssigned) {
        initialSelected[cat] = alreadyAssigned.id;
      }
    });
    setSelectedAssets(initialSelected);
  };

  const handleVerifySubmit = async (approved: boolean) => {
    if (!reviewingEmployee) return;

    try {
      const selectedDetails = Object.entries(selectedAssets)
        .map(([cat, assetId]) => {
          const asset = assets.find(a => a.id === assetId);
          return `${cat}: ${asset ? `${asset.name} (${asset.serial})` : assetId}`;
        })
        .join(", ");

      const finalRemarks = remarks
        ? `${remarks} (Selected: ${selectedDetails})`
        : approved
          ? `Inventory verified and approved. Selected assets: ${selectedDetails}.`
          : "Out of stock in office region.";

      await verifyOnboardingAsset(
        reviewingEmployee.id,
        approved,
        finalRemarks,
        "Asset Manager User"
    );

      if (approved) {
        toast.success(
          `${reviewingEmployee.name}'s assets have been reserved successfully.`
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
            {Array.isArray(row.original.requiredAssetCategory)
              ? row.original.requiredAssetCategory.join(", ")
              : row.original.requiredAssetCategory || "Laptop"}
          </span>
        ),
      },
      {
        id: "allocatedAssets",
        header: "Allocated Assets",
        cell: ({ row }) => {
          const emp = row.original;
          const allocatedNames = getAllocatedAssetNames(emp, assets);
          if (allocatedNames.length === 0) {
            return (
              <Badge variant="secondary" className="text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
                None
              </Badge>
            );
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {allocatedNames.map((name, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-[10px] font-semibold px-2 py-0.5 rounded"
                >
                  {name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "pendingAssets",
        header: "Pending Assets",
        cell: ({ row }) => {
          const emp = row.original;
          const pendingResult = getPendingAssets(emp, assets);
          if (pendingResult === "N/A") {
            return <span className="text-xs text-muted-foreground">N/A</span>;
          }
          if (pendingResult.length === 0) {
            return (
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-[10px] font-semibold px-2 py-0.5 rounded"
              >
                Fully Allocated
              </Badge>
            );
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {pendingResult.map((name, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 text-[10px] font-semibold px-2 py-0.5 rounded"
                >
                  {name}
                </Badge>
              ))}
            </div>
          );
        },
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
          const emp = row.original;
          const allocatedCount = getAllocatedAssetNames(emp, assets).length;
          const pendingResult = getPendingAssets(emp, assets);

          let display = "Pending AM Review";
          if (allocatedCount > 0) {
            if (Array.isArray(pendingResult) && pendingResult.length > 0) {
              display = "Allocation In Progress";
            } else if (Array.isArray(pendingResult) && pendingResult.length === 0) {
              display = "Allocated";
            }
          }

          return <StatusBadge status={display} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const emp = row.original;
          const allocatedCount = getAllocatedAssetNames(emp, assets).length;
          const pendingResult = getPendingAssets(emp, assets);
          const hasPending = Array.isArray(pendingResult) && pendingResult.length > 0;
          const isFully = Array.isArray(pendingResult) && pendingResult.length === 0;

          if (allocatedCount === 0) {
            return (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-primary/20 hover:border-primary/50 text-xs text-foreground"
                onClick={() => handleOpenVerifyDrawer(emp)}
              >
                Verify Assets
              </Button>
            );
          }

          if (hasPending) {
            return (
              <Button
                size="sm"
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 rounded border-transparent shadow-sm"
                onClick={() => handleOpenVerifyDrawer(emp)}
              >
                Continue Allocation
              </Button>
            );
          }

          if (isFully) {
            return (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 rounded border-transparent shadow-sm"
                onClick={() => handleOpenVerifyDrawer(emp)}
              >
                View Allocation
              </Button>
            );
          }

          return <span className="text-muted-foreground text-xs italic">N/A</span>;
        },
      },
    ],
    [assets]
  );

  return (
    <>
      <PageHeader
        title="Employee Onboarding Verification"
        description="Reserve available assets for employees awaiting onboarding."
      />

      <div className="space-y-4">
        {/* Verification Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:flex md:w-auto h-auto p-1 bg-muted/60 gap-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              All ({verificationQueue.length})
            </TabsTrigger>
            <TabsTrigger value="pending_it_support" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Pending IT Support
            </TabsTrigger>
            <TabsTrigger value="verified" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Verified
            </TabsTrigger>
            <TabsTrigger value="pending_asset_manager" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Pending AM Review
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Allocated
            </TabsTrigger>
            <TabsTrigger value="waiting_inventory" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Out of Stock
            </TabsTrigger>
            <TabsTrigger value="fully_allocated" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Fully Allocated ({verificationQueue.filter(emp => {
                const pending = getPendingAssets(emp, assets);
                return Array.isArray(pending) && pending.length === 0;
              }).length})
            </TabsTrigger>
            <TabsTrigger value="partially_allocated" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              Partially Allocated ({verificationQueue.filter(emp => {
                const allocatedCount = getAllocatedAssetNames(emp, assets).length;
                const pending = getPendingAssets(emp, assets);
                return allocatedCount > 0 && Array.isArray(pending) && pending.length > 0;
              }).length})
            </TabsTrigger>
            <TabsTrigger value="no_assets_allocated" className="rounded-lg py-2 px-3 text-xs md:text-sm">
              No Assets Allocated ({verificationQueue.filter(emp => {
                const allocatedCount = getAllocatedAssetNames(emp, assets).length;
                return allocatedCount === 0;
              }).length})
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
                  <span className="font-bold text-primary">
                    {Array.isArray(reviewingEmployee.requiredAssetCategory)
                      ? reviewingEmployee.requiredAssetCategory.join(", ")
                      : reviewingEmployee.requiredAssetCategory || "Laptop"}
                  </span>
                </div>
              </Card>

              {/* Required Hardware Badges */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required Hardware Status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {requiredCategories.map((cat) => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="border-primary/20 text-foreground bg-primary/5 text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1"
                    >
                      <span>{getCategoryEmoji(cat)}</span>
                      <span>{cat}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Available Assets by Category */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Assets by Category</Label>
                <div className="space-y-3">
                  {requiredCategories.map((cat) => {
                    const available = assets.filter(
                      (a) =>
                        a.status === "Available" &&
                        a.category.toLowerCase() === cat.toLowerCase() &&
                        (a.location === reviewingEmployee.location || !a.location)
                    );
                    return (
                      <Card key={cat} className="p-4 border rounded-xl bg-card space-y-3">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b pb-2">
                          <span className="text-sm">{getCategoryEmoji(cat)}</span>
                          <span>{cat} Selection</span>
                        </h4>
                        {available.length === 0 ? (
                          <div className="p-3 border border-destructive/20 bg-destructive/5 text-destructive rounded-lg flex items-center gap-2 text-xs font-semibold">
                            <AlertCircle className="h-4 w-4 text-red-500" /> No {cat} available
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {available.map((asset) => {
                              const isSelected = selectedAssets[cat] === asset.id;
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => setSelectedAssets({ ...selectedAssets, [cat]: asset.id })}
                                  className={cn(
                                    "p-3 rounded-lg border text-xs cursor-pointer transition-all hover:bg-muted/10 flex flex-col gap-1.5",
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border bg-background"
                                  )}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className="font-semibold text-foreground">{asset.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {asset.serial}
                                      </span>
                                      <div className={cn(
                                        "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0",
                                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                                      )}>
                                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 text-[10px] text-muted-foreground">
                                    <span>Model: {asset.model}</span>
                                    <span className="text-right text-[9px] uppercase tracking-wider text-emerald-600 font-semibold">{asset.status}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Selected Assets Summary */}
              {Object.keys(selectedAssets).length > 0 && (
                <Card className="p-4 border bg-muted/40 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Assets Summary
                  </h4>
                  <div className="space-y-2">
                    {requiredCategories.map((cat) => {
                      const assetId = selectedAssets[cat];
                      const asset = assets.find(a => a.id === assetId);
                      return (
                        <div key={cat} className="flex justify-between items-center text-xs border-b border-muted pb-2 last:border-0 last:pb-0">
                          <div>
                            <span className="font-semibold text-foreground block">{cat}</span>
                            <span className="text-muted-foreground text-[10px]">{asset ? asset.name : "None Selected"}</span>
                          </div>
                          {asset && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {asset.serial}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Notes Area */}
              <div className="space-y-2 border-t pt-4">
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
              disabled={!!(reviewingEmployee && isFullyAllocated(reviewingEmployee, assets))}
            >
              Out Of Stock
            </Button>
            <Button
              size="sm"
              onClick={() => handleVerifySubmit(true)}
              disabled={isVerifyDisabled}
              className="flex-1 sm:flex-initial"
            >
              Reserve Assets
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
