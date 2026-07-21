import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Download,
  MoreHorizontal,
  Trash2,
  Eye,
  Edit,
  Inbox,
  LayoutGrid,
  Laptop,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Asset } from "@/types/domain";
import { useData } from "@/contexts/data";
import { toast } from "sonner";

export default function AssetsPage() {
  const { assets, employees, addAsset, retireAsset, refreshData } = useData();

  const CATEGORIES = [
    "Laptop",
    "Desktop",
    "Monitor",
    "Printer",
    "Mobile",
    "Keyboard",
    "Mouse",
  ];

  const MANUFACTURERS = ["Dell", "HP", "Lenovo", "Apple", "Samsung"];

  const LOCATIONS = ["Hyderabad", "Bangalore", "Chennai", "Mumbai"];

  const [selected, setSelected] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [name, setName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    refreshData();
  }, []);

  // Stats calculation
  const totalCount = assets.length;
  const assignedCount = assets.filter((a) => a.status === "Assigned").length;
  const availableCount = assets.filter((a) => a.status === "Available").length;
  const maintenanceCount = assets.filter((a) => a.status === "Maintenance").length;
  // Out of Stock represents the number of onboarding employees blocked on inventory
  const outOfStockCount = employees.filter((e) => e.allocationStatus === "Waiting for Inventory").length;

  const handleOpenCreate = () => {
    setName("");
    setAssetCategory("");
    setManufacturer("");
    setSerial("");
    setLocation("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim() || !assetCategory || !manufacturer || !serial.trim() || !location) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await addAsset({
        name: name.trim(),
        category: assetCategory,
        manufacturer,
        model: `${manufacturer.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        serial: serial.trim().toUpperCase(),
        location,
        assignedTo: null,
        status: "Available",
        purchaseDate: new Date().toISOString().slice(0, 10),
        warrantyExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
        cost: Math.floor(Math.random() * 2500) + 500,
      });

      toast.success("Asset created successfully");
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create asset");
    }
  };

  const filtered = useMemo(() => {
    return assets.filter(
      (a) =>
        (category === "all" || a.category === category) && (status === "all" || a.status === status)
    );
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
        header: "Name",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.category}</span>,
      },
      {
        accessorKey: "manufacturer",
        header: "Manufacturer",
      },
      {
        accessorKey: "serial",
        header: "Serial",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.serial}</span>,
      },
      {
        accessorKey: "warrantyExpiry",
        header: "Warranty",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.warrantyExpiry || "N/A"}</span>,
      },
      {
        accessorKey: "location",
        header: "Location",
      },
      {
        id: "assignedTo",
        header: "Assigned",
        cell: ({ row }) =>
          row.original.assignedTo ? (
            <span className="font-medium text-foreground">
              {employees.find((e) => e.id === row.original.assignedTo)?.name || row.original.assignedTo}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
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
              <DropdownMenuItem onClick={() => toast.info("Edit not wired in demo")}>
                <Edit className="h-4 w-4 mr-2" /> Edit Asset
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  try {
                    await retireAsset(row.original.id);
                    toast.success("Asset retired from service");
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
        description={`Manage ${assets.length.toLocaleString()} enterprise assets across all locations.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("Export queued (demo)")}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Asset
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Assets
            </CardTitle>
            <LayoutGrid className="h-4 w-4 text-blue-500" />
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
            <Laptop className="h-4 w-4 text-indigo-500" />
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
            <div className="text-2xl font-bold">{outOfStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Options */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="min-w-40 flex-1 sm:flex-initial">
            <Label className="text-xs font-medium mb-1.5 block">Category Filter</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Select Category" />
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
          </div>
          <div className="min-w-40 flex-1 sm:flex-initial">
            <Label className="text-xs font-medium mb-1.5 block">Status Tab</Label>
            <Tabs value={status} onValueChange={setStatus} className="w-full">
              <TabsList className="h-9 rounded-lg p-0.5 bg-muted">
                <TabsTrigger value="all" className="text-xs px-2.5 py-1">All</TabsTrigger>
                <TabsTrigger value="Assigned" className="text-xs px-2.5 py-1">Assigned</TabsTrigger>
                <TabsTrigger value="Available" className="text-xs px-2.5 py-1">Available</TabsTrigger>
                <TabsTrigger value="Maintenance" className="text-xs px-2.5 py-1">Maintenance</TabsTrigger>
                <TabsTrigger value="Retired" className="text-xs px-2.5 py-1">Retired</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* Asset Table */}
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
            searchPlaceholder="Search assets by ID, name, manufacturer, serial..."
            onRowClick={setSelected}
            pageSize={15}
          />
        </Card>
      )}

      {/* Detail Sheet */}
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
                    
                    <span className="text-muted-foreground">Manufacturer</span>
                    <span className="font-medium">{selected.manufacturer}</span>
                    
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{selected.model}</span>
                    
                    <span className="text-muted-foreground">Serial Number</span>
                    <span className="font-mono text-xs">{selected.serial}</span>
                    
                    <span className="text-muted-foreground">Purchase Date</span>
                    <span>{selected.purchaseDate}</span>
                    
                    <span className="text-muted-foreground">Warranty Expiry</span>
                    <span>{selected.warrantyExpiry || "N/A"}</span>
                    
                    <span className="text-muted-foreground">Location</span>
                    <span>{selected.location}</span>
                    
                    <span className="text-muted-foreground">Cost Value</span>
                    <span className="font-semibold">${selected.cost.toLocaleString()}</span>
                    
                    <span className="text-muted-foreground">Custodian / Assigned Employee</span>
                    <span className="font-semibold text-foreground">
                      {selected.assignedTo
                        ? employees.find((e) => e.id === selected.assignedTo)?.name || selected.assignedTo
                        : "Unassigned"}
                    </span>
                  </div>
                </Card>

                <Card className="p-4 rounded-xl border">
                  <div className="font-semibold text-sm mb-2">Workspace Ownership Log</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    This {selected.category} device is verified in {selected.location}. Currently held
                    for {selected.assignedTo ? "active employment use" : "onboarding reallocation"}.
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Asset Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Inventory Asset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="asset-name" className="text-xs font-semibold">Asset Name</Label>
              <Input
                id="asset-name"
                className="mt-1.5 text-sm h-9"
                placeholder="Dell Latitude 5540"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category-select" className="text-xs font-semibold">Category</Label>
                <Select value={assetCategory} onValueChange={setAssetCategory}>
                  <SelectTrigger id="category-select" className="mt-1.5 h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand-select" className="text-xs font-semibold">Manufacturer</Label>
                <Select value={manufacturer} onValueChange={setManufacturer}>
                  <SelectTrigger id="brand-select" className="mt-1.5 h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUFACTURERS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="serial-input" className="text-xs font-semibold">Serial Number</Label>
                <Input
                  id="serial-input"
                  className="mt-1.5 text-sm h-9"
                  placeholder="S/N..."
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="loc-select" className="text-xs font-semibold">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="loc-select" className="mt-1.5 h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
