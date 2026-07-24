import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Trash2,
  Eye,
  Edit,
  Inbox,
  Laptop,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  Shield,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { Asset } from "@/types/domain";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import {importAssets, getAssetTemplate } from "@/services/api";

// Zod Validation Schema for Adding Asset
const assetFormSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters"),
  category: z.string().min(1, "Please select a category"),
  manufacturer: z.string().min(1, "Please select a brand/manufacturer"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  serial: z.string().min(2, "Serial number is required"),
  status: z.string().min(1, "Asset status is required"),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

export default function AssetsPage() {
  const { assets, employees, addAsset, retireAsset, refreshData, uploadFiles } = useData();

  const CATEGORIES = ["Laptop", "Desktop", "Monitor", "Printer", "Mobile", "Keyboard", "Mouse"];
  const MANUFACTURERS = ["Dell", "HP", "Lenovo", "Apple", "Samsung"];
  const LOCATIONS = ["Hyderabad", "Bangalore", "Chennai", "Mumbai"];

  const [selected, setSelected] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  // Import states
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form setup using React Hook Form and Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      category: "",
      manufacturer: "",
      model: "",
      serial: "",
      status: "Available",
    },
  });

  useEffect(() => {
    refreshData();
  }, []);

  // Stats calculation (No hardcoded values)
  const totalCount = assets.length;
  const assignedCount = assets.filter((a) => a.status === "Assigned").length;
  const availableCount = assets.filter((a) => a.status === "Available").length;
  const maintenanceCount = assets.filter((a) => a.status === "Maintenance").length;
  const outOfStockCount = employees.filter((e) => e.allocationStatus === "Waiting for Inventory").length;

  const handleOpenCreate = () => {
    reset();
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (values: AssetFormValues) => {
    try {
      await addAsset({
        name: values.name.trim(),
        category: values.category,
        manufacturer: values.manufacturer,
        model: values.model.trim(),
        serial: values.serial.trim().toUpperCase(),
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)], // Random office location for demo
        assignedTo: null,
        status: values.status as Asset["status"],
        purchaseDate: new Date().toISOString().slice(0, 10),
        warrantyExpiry: "",
        cost: 0,
      });
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create asset");
    }
  };

  // Import Asset process
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setUploadError(null);
    setImportProgress(10);

    // Simulate progress
    const timer = setInterval(() => {
      setImportProgress((p) => {
        if (p >= 85) {
          clearInterval(timer);
          return p;
        }
        return p + 15;
      });
    }, 200);

    try {
      const file = files[0];
      const result = await importAssets(file);
      setImportedCount(result.imported);
      toast.success(`${result.imported} assets imported successfully`);
      refreshData();
    } catch (err: any) {
      clearInterval(timer);
      setUploadError(err.message || "Import upload failed.");
      toast.error("Failed to import file");
    } finally {
      setImporting(false);
    }
  };
  const downloadTemplate = async () => {
    try {
      const blob = await getAssetTemplate();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "Asset_Template.xlsx";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || "Failed to download template");
    }
  };

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      // Category filter
      const matchesCategory = category === "all" || a.category === category;

      // Status filter
      const matchesStatus = status === "all" || a.status === status;

      return matchesCategory && matchesStatus;
    });
  }, [assets, category, status]);

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Asset ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: "Asset Name",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground">{row.original.name}</span>
            <div className="text-[10px] text-muted-foreground">{row.original.manufacturer}</div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.category}</span>,
      },
      {
        id: "manufacturer",
        header: "Brand",
        cell: ({ row }) => <span>{row.original.manufacturer}</span>,
      },
      {
        accessorKey: "model",
        header: "Model",
      },
      {
        accessorKey: "serial",
        header: "Serial Number",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.serial}</span>,
      },
      {
        id: "assignedTo",
        header: "Assigned Employee",
        cell: ({ row }) =>
          row.original.assignedTo ? (
            <span className="font-medium text-foreground">
              {employees.find((e) => e.id === row.original.assignedTo)?.name || row.original.assignedTo}
            </span>
          ) : (
            <span className="text-muted-foreground italic text-xs">Unassigned</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelected(row.original)}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Edit workflow not wired in backend demo")}>
                <Edit className="h-4 w-4 mr-2" /> Edit Asset
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  try {
                    await retireAsset(row.original.id);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to retire asset");
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Retire Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [employees]
  );

  return (
    <>
      <PageHeader
        title="Assets Management"
        description={`Manage all ${assets.length.toLocaleString()} enterprise assets across locations.`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download Template
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportProgress(0);
                setImportedCount(null);
                setUploadError(null);
                setImportOpen(true);
              }}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Asset
            </Button>
          </div>
        }
      />
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Assets
            </CardTitle>
            <Laptop className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maintenance
            </CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Out of Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search controls */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-36 bg-background text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={status} onValueChange={setStatus} className="w-full sm:w-auto">
            <TabsList className="h-9 rounded-lg p-0.5 bg-muted/60">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">All</TabsTrigger>
              <TabsTrigger value="Available" className="text-xs px-2.5 py-1">Available</TabsTrigger>
              <TabsTrigger value="Assigned" className="text-xs px-2.5 py-1">Assigned</TabsTrigger>
              <TabsTrigger value="Maintenance" className="text-xs px-2.5 py-1">Maintenance</TabsTrigger>
              <TabsTrigger value="Retired" className="text-xs px-2.5 py-1">Retired</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Assets Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No assets found</p>
            <p className="text-sm">There are no hardware assets in stock matching the filters.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            searchPlaceholder="Filter assets table..."
            pageSize={15}
            />
        </Card>
      )}

      {/* View Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 bg-background">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-4 border-b pb-4 gap-1">
                <div className="text-xs font-mono text-muted-foreground">{selected.id}</div>
                <SheetTitle className="text-xl font-bold">{selected.name}</SheetTitle>
                <div className="mt-2">
                  <StatusBadge status={selected.status} />
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <Card className="p-4 rounded-xl border">
                  <div className="font-semibold text-sm mb-3">Asset Properties</div>
                  <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold text-primary">{selected.category}</span>

                    <span className="text-muted-foreground">Brand / Manufacturer</span>
                    <span className="font-medium">{selected.manufacturer}</span>

                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{selected.model}</span>

                    <span className="text-muted-foreground">Serial Number</span>
                    <span className="font-mono text-xs">{selected.serial}</span>

                    <span className="text-muted-foreground">Location</span>
                    <span>{selected.location || "N/A"}</span>

                    <span className="text-muted-foreground">Custodian / Assigned Employee</span>
                    <span className="font-semibold text-foreground">
                      {selected.assignedTo
                        ? employees.find((e) => e.id === selected.assignedTo)?.name || selected.assignedTo
                        : "Unassigned"}
                    </span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Asset Dialog with Sections & React Hook Form validation */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add New Asset
            </DialogTitle>
            <DialogDescription>
              Deploy a new hardware unit into corporate inventory. All fields are validated.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-5 py-2">
            {/* Section 1: Basic Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                <Laptop className="h-3.5 w-3.5" /> 1. Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-semibold">Asset Name</Label>
                  <Input id="name" {...register("name")} placeholder="e.g. MacBook Pro 16" className="text-xs h-8" />
                  {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                  <Select onValueChange={(val) => setValue("category", val)} defaultValue={watch("category")}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-[10px] text-destructive">{errors.category.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manufacturer" className="text-xs font-semibold">Brand</Label>
                  <Select onValueChange={(val) => setValue("manufacturer", val)} defaultValue={watch("manufacturer")}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUFACTURERS.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.manufacturer && <p className="text-[10px] text-destructive">{errors.manufacturer.message}</p>}
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="model" className="text-xs font-semibold">Model Name</Label>
                  <Input id="model" {...register("model")} placeholder="e.g. M3 Max 16GB" className="text-xs h-8" />
                  {errors.model && <p className="text-[10px] text-destructive">{errors.model.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="serial" className="text-xs font-semibold">Serial Number</Label>
                <Input id="serial" {...register("serial")} placeholder="e.g. C02F543ZMD6M" className="text-xs h-8" />
                {errors.serial && <p className="text-[10px] text-destructive">{errors.serial.message}</p>}
              </div>
            </div>

            {/* Section 2: Asset Status */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                <Clock className="h-3.5 w-3.5" /> 2. Inventory Status
              </h4>
              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-semibold">Initial Status</Label>
                <Select onValueChange={(val) => setValue("status", val)} defaultValue={watch("status")}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available" className="text-xs">Available</SelectItem>
                    <SelectItem value="Maintenance" className="text-xs">Maintenance</SelectItem>
                    <SelectItem value="Retired" className="text-xs">Retired</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-[10px] text-destructive">{errors.status.message}</p>}
              </div>
            </div>

            <DialogFooter className="border-t pt-3 mt-4 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Asset"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Asset Dialog with progress bars */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Import Assets (CSV / Excel)
            </DialogTitle>
            <DialogDescription>
              Bulk upload assets into the AWS DynamoDB catalog. Select a file to launch verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* File Input */}
            <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/30 cursor-pointer transition-colors relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={importing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Click to upload or drag & drop</p>
              <p className="text-[10px] text-muted-foreground mt-1">Supports CSV, XLSX up to 5MB</p>
            </div>

            {/* Progress indicator */}
            {(importing || importProgress > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">
                    {importProgress === 100 ? "Upload complete!" : "Uploading & parsing database..."}
                  </span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {/* Error messaging */}
            {uploadError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs leading-normal flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Import summary dialog details */}
            {importedCount !== null && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs flex gap-2.5 items-start">
                <Check className="h-4 w-4 shrink-0 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-full p-0.5 mt-0.5" />
                <div>
                  <h5 className="font-semibold mb-0.5 text-sm">Bulk Import Succeeded</h5>
                  <p className="text-[11px] text-muted-foreground">
                    Parsed and created <strong>{importedCount} hardware records</strong> into DynamoDB.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(false)}
              disabled={importing}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
