import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AlertCircle, CheckCircle2, ClipboardList, Package, User } from "lucide-react";
import type { Employee, Asset } from "@/types/domain";
import { cn } from "@/lib/utils";

interface InventoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  assets: Asset[];
  onVerify: (approved: boolean, remarks: string) => Promise<void>;
}

export function InventoryDrawer({
  open,
  onOpenChange,
  employee,
  assets,
  onVerify,
}: InventoryDrawerProps) {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // Checklist states
  const [inventoryVerified, setInventoryVerified] = useState(false);
  const [serialAssigned, setSerialAssigned] = useState(false);
  const [allocationApproved, setAllocationApproved] = useState(false);

  // Find matching assets
  const matchingAssets = useMemo(() => {
    if (!employee) return [];
    const req = employee.requiredAssetCategory;
    const reqCats = Array.isArray(req)
      ? req.map(c => String(c).trim().toLowerCase())
      : typeof req === "string"
        ? req.split(",").map(c => c.trim().toLowerCase())
        : ["laptop"];
    const reqLoc = employee.location;
    return assets.filter(
      (a) => a.status === "Available" && reqCats.includes((a.category || "").toLowerCase()) && a.location === reqLoc
    );
  }, [assets, employee]);

  const localAvailableCount = matchingAssets.length;
  const recommendedAsset = matchingAssets[0] || null;

  const allChecked = inventoryVerified && serialAssigned && allocationApproved;

  const handleAction = async (approved: boolean) => {
    if (!employee) return;
    setLoading(true);
    try {
      const defaultRemarks = approved
        ? `Inventory verified. Recommended asset: ${recommendedAsset ? `${recommendedAsset.name} (${recommendedAsset.serial})` : "General stock"}.`
        : `Flagged Out of Stock. Required: ${employee.requiredAssetCategory || "Laptop"} in ${employee.location}.`;
      
      await onVerify(approved, remarks || defaultRemarks);
      onOpenChange(false);
      // Reset checklist
      setInventoryVerified(false);
      setSerialAssigned(false);
      setAllocationApproved(false);
      setRemarks("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 flex flex-col h-full bg-background border-l">
        {employee && (
          <>
            <SheetHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center gap-2 text-primary">
                <ClipboardList className="h-5 w-5" />
                <SheetTitle className="text-lg font-bold">Onboarding Inventory Check</SheetTitle>
              </div>
              <SheetDescription className="text-xs">
                Authorize device deployment by verifying stock levels in the employee's office region.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 py-4 overflow-y-auto pr-1">
              {/* Employee Summary Card */}
              <div className="p-4 rounded-xl border bg-card/50 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 border-b pb-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground leading-tight">{employee.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{employee.department} • {employee.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-muted-foreground">Office Location</span>
                  <span className="font-semibold text-foreground text-right">{employee.location}</span>
                  <span className="text-muted-foreground">Joining Date</span>
                  <span className="font-medium text-foreground text-right">{employee.joinDate}</span>
                  <span className="text-muted-foreground">Required Category</span>
                  <span className="font-bold text-primary text-right">{employee.requiredAssetCategory || "Laptop"}</span>
                </div>
              </div>

              {/* Inventory Availability Check */}
              <div className={cn(
                "p-4 rounded-xl border",
                localAvailableCount > 0
                  ? "bg-emerald-500/5 border-emerald-500/25 dark:bg-emerald-500/10"
                  : "bg-destructive/5 border-destructive/25 dark:bg-destructive/10"
              )}>
                {localAvailableCount > 0 ? (
                  <div className="space-y-2">
                    <div className="text-success font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <CheckCircle2 className="h-4 w-4" /> Stock Verified Available
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Found <strong className="text-foreground">{localAvailableCount} units</strong> in{" "}
                      <strong>{employee.location}</strong>. A device is reserved for the allocation step.
                    </p>
                    {recommendedAsset && (
                      <div className="mt-3 p-2 bg-background border border-emerald-500/20 rounded-lg text-xs flex justify-between items-center">
                        <span className="font-medium flex items-center gap-1"><Package className="h-3.5 w-3.5 text-primary" /> {recommendedAsset.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{recommendedAsset.serial}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-destructive font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <AlertCircle className="h-4 w-4" /> Out of Stock Warning
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      No available {employee.requiredAssetCategory || "Laptop"} units found in <strong>{employee.location}</strong>. 
                      Procurement is required before support teams can dispatch hardware.
                    </p>
                  </div>
                )}
              </div>

              {/* ITSM Verification Checklist */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verification Checklist
                </h5>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                    <Checkbox
                      id="inventory-verified"
                      checked={inventoryVerified}
                      onCheckedChange={(checked) => setInventoryVerified(!!checked)}
                      disabled={localAvailableCount === 0}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <label htmlFor="inventory-verified" className="text-xs font-semibold leading-none cursor-pointer">
                        Inventory Verified Available
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Confirm hardware categories exist in local branch buffer.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                    <Checkbox
                      id="serial-assigned"
                      checked={serialAssigned}
                      onCheckedChange={(checked) => setSerialAssigned(!!checked)}
                      disabled={localAvailableCount === 0}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <label htmlFor="serial-assigned" className="text-xs font-semibold leading-none cursor-pointer">
                        Asset Serial Assigned
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Register a candidate serial code ({recommendedAsset?.serial || "General stock"}) for shipment.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                    <Checkbox
                      id="allocation-approved"
                      checked={allocationApproved}
                      onCheckedChange={(checked) => setAllocationApproved(!!checked)}
                      disabled={localAvailableCount === 0}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <label htmlFor="allocation-approved" className="text-xs font-semibold leading-none cursor-pointer">
                        Allocation Approved
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Authorize IT Support teams to finalize deployment on joining date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Form */}
              <div className="space-y-1.5">
                <Label htmlFor="remarks" className="text-xs font-semibold text-muted-foreground uppercase">
                  Verification remarks
                </Label>
                <Input
                  id="remarks"
                  placeholder="Enter diagnostic comments or remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 mt-auto flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={() => handleAction(false)}
                  disabled={loading}
                >
                  Flag Out Of Stock
                </Button>
                <Button
                  className="flex-1 text-xs"
                  onClick={() => handleAction(true)}
                  disabled={loading || !allChecked}
                >
                  {loading ? "Approving..." : "verifi inventory"}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
