import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import { ClipboardCheck, Search, Inbox, Wrench, RefreshCw, UserCheck, AlertCircle } from "lucide-react";
import type { Ticket } from "@/types/domain";

export function ApprovedRequestQueuePage() {
  const { user } = useAuth();
  const { tickets, resolveAssetTicket, refreshData } = useData();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    refreshData();
  }, []);

  const approvedTickets = useMemo(() => {
    return tickets.filter((t) => t.status === "Approved for Asset Manager");
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (searchQuery.trim() === "") return approvedTickets;
    const q = searchQuery.toLowerCase();
    return approvedTickets.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.assetId && t.assetId.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q) ||
        t.createdBy.toLowerCase().includes(q)
    );
  }, [approvedTickets, searchQuery]);

  const handleResolveAction = async (ticketId: string, action: "Repair" | "Replace" | "Reassign", assetId: string | null) => {
    try {
      await resolveAssetTicket(ticketId, user?.name || "Asset Manager User", {
        action,
        assetDetails: assetId || "General asset request",
        remarks: `${action} completed by Asset Manager.`,
        resolution: `${action} completed and issue resolved.`,
      });
      toast.success(`Request resolved successfully: ${action}`);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve request");
    }
  };

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Request ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
      },
      {
        accessorKey: "title",
        header: "Subject / Description",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground block leading-tight">{row.original.title}</span>
            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[280px]">
              {row.original.description || "No description provided."}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "createdBy",
        header: "Employee (ID)",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-muted-foreground">{row.original.createdBy}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.category}</span>,
      },
      {
        accessorKey: "assetId",
        header: "Linked Asset ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {row.original.assetId || "N/A (General)"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "ITSM Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-indigo-500/20 text-indigo-600 hover:bg-indigo-50"
              onClick={() => handleResolveAction(row.original.id, "Repair", row.original.assetId)}
            >
              <Wrench className="h-3 w-3 mr-1" /> Repair
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
              onClick={() => handleResolveAction(row.original.id, "Replace", row.original.assetId)}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/20 text-amber-600 hover:bg-amber-50"
              onClick={() => handleResolveAction(row.original.id, "Reassign", row.original.assetId)}
            >
              <UserCheck className="h-3 w-3 mr-1" /> Reassign
            </Button>
          </div>
        ),
      },
    ],
    [user]
  );

  return (
    <>
      <PageHeader
        title="Approved Request Queue"
        description="Administration-approved tickets waiting for asset manager fulfillment, repair, or swap."
      />

      {/* KPI Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="rounded-xl border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfillment Backlog
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedTickets.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Requests approved by management waiting for hardware actions</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical Warning Alert
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${approvedTickets.length > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedTickets.length > 0 ? "Attention Required" : "All Clear"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">SLA deadline breaches monitored by role context</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 mb-4 rounded-xl border bg-card">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request backlog by request ID, title, serial or category..."
            className="pl-8 h-9 text-sm bg-background"
          />
        </div>
      </Card>

      {/* Requests table */}
      {filteredTickets.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">Fulfillment queue is empty</p>
            <p className="text-sm">There are no approved hardware actions in the backlog.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
          <DataTable
            data={filteredTickets}
            columns={columns}
            searchPlaceholder="Filter requests queue..."
            pageSize={10}
          />
        </Card>
      )}
    </>
  );
}
export default ApprovedRequestQueuePage;
