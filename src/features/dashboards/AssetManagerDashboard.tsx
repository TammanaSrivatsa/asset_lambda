import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Package,
  CheckCircle2,
  PackageCheck,
  Wrench,
  AlertTriangle,
  Search,
  Laptop,
  Monitor,
  Smartphone,
  Keyboard,
  Archive,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/data";
import type { Asset } from "@/types/domain";

export function AssetManagerDashboard() {
  const { assets, assignments, employees, refreshData } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    refreshData();
  }, []);

  // Compute live KPI values from context (existing Lambda API data)
  const total = assets.length;
  const assigned = assets.filter((a) => a.status === "Assigned").length;
  const available = assets.filter((a) => a.status === "Available").length;
  const maintenance = assets.filter((a) => a.status === "Maintenance").length;
  const outOfStock = employees.filter((e) => e.allocationStatus === "Waiting for Inventory").length;

  const filteredAssets = useMemo(() => {
    let list = assets;

    // Apply status filter
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply search filter (Asset ID, Asset Name, Serial, Category, Assigned Employee)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const empName = a.assignedTo
          ? employees.find((e) => e.id === a.assignedTo)?.name || a.assignedTo
          : "";
        return (
          a.id.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.serial.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.manufacturer.toLowerCase().includes(q) ||
          empName.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [assets, searchQuery, statusFilter, employees]);

  // Asset Table columns definition
  const columns = useMemo<ColumnDef<Asset>[]>(
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
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary/10 text-primary grid place-items-center shrink-0">
              {row.original.category.toLowerCase().includes("laptop") ? (
                <Laptop className="h-3.5 w-3.5" />
              ) : row.original.category.toLowerCase().includes("phone") || row.original.category.toLowerCase().includes("mobile") ? (
                <Smartphone className="h-3.5 w-3.5" />
              ) : row.original.category.toLowerCase().includes("monitor") ? (
                <Monitor className="h-3.5 w-3.5" />
              ) : (
                <Keyboard className="h-3.5 w-3.5" />
              )}
            </div>
            <div>
              <span className="font-medium text-foreground">{row.original.name}</span>
              <div className="text-[10px] text-muted-foreground">{row.original.manufacturer}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.category}</span>,
      },
      {
        accessorKey: "serial",
        header: "Serial Number",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.serial}</span>,
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => {
          const custodian = row.original.assignedTo
            ? employees.find((e) => e.id === row.original.assignedTo)?.name || row.original.assignedTo
            : null;

          return custodian ? (
            <span className="font-medium text-foreground">{custodian}</span>
          ) : (
            <span className="text-muted-foreground italic">Available</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [employees]
  );

  return (
    <>
      <PageHeader
        title="Asset Manager Dashboard"
        description="Real-time operational dashboard for tracking IT asset lifecycle, inventory verification status, and request actions."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="rounded-xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Assets
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total items in active database</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned
            </CardTitle>
            <PackageCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {assigned.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Dispatched to workspace custodians</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {available.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Ready for reallocation checks</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maintenance
            </CardTitle>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{maintenance.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Undergoing diagnosis or repairs</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Out of Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStock.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Employees blocked by inventory levels</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Directory Control Bar */}
      <Card className="p-4 mb-4 rounded-xl border shadow-sm bg-card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by ID, name, manufacturer, serial, custodian..."
              className="pl-8 h-9 text-sm bg-background"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="h-9 rounded-lg p-0.5 bg-muted/60 w-full md:w-auto">
              <TabsTrigger value="all" className="text-xs px-3 py-1">All</TabsTrigger>
              <TabsTrigger value="Available" className="text-xs px-3 py-1">Available</TabsTrigger>
              <TabsTrigger value="Assigned" className="text-xs px-3 py-1">Assigned</TabsTrigger>
              <TabsTrigger value="Maintenance" className="text-xs px-3 py-1">Maintenance</TabsTrigger>
              <TabsTrigger value="Retired" className="text-xs px-3 py-1">Retired</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Embedded Asset Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            <Laptop className="h-4.5 w-4.5 text-primary" /> Active Hardware Assets ({filteredAssets.length})
          </h3>
        </div>

        {filteredAssets.length === 0 ? (
          <Card className="p-12 text-center rounded-xl border">
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Archive className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">No assets found</p>
              <p className="text-sm">There are no hardware devices matching the filters.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
            <DataTable
              data={filteredAssets}
              columns={columns}
              searchPlaceholder="Filter assets list..."
              pageSize={10}
            />
          </Card>
        )}
      </div>
    </>
  );
}
