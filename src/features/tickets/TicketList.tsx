import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role, Ticket } from "@/types/domain";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Inbox, SlidersHorizontal, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ManageTicketModal, parseEstimatedResolutionTime } from "@/components/tickets/ManageTicketModal";

export interface TicketListProps {
  title: string;
  description?: string;
  filter?: (t: Ticket) => boolean;
  actions?: React.ReactNode;
  workflowRole?: Role;
}

const TICKET_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Email",
  "Printer",
  "Account Access",
  "Security",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const STATUSES = ["Open", "Accepted", "In Progress", "Waiting for User", "Resolved", "Closed"];
const normalizeStatus = (status?: string) =>
  (status ?? "")
    .trim()
    .replace(/ /g, "_")
    .toUpperCase();

export function TicketList({ title, description, filter, actions, workflowRole }: TicketListProps) {
  const { user } = useAuth();
  const { tickets, loading, error, refreshData } = useData();
  const role = workflowRole || user?.role || "employee";

  // Tab filtering
  const [tab, setTab] = useState<string>("all");

  // Advanced filter states
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal control
  const [managedTicket, setManagedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  // Scoped tickets based on user role permission constraints
  const scopedTickets = useMemo(() => {
    if (role === "support" || role === "lo_support") {
      return tickets.filter(
        (t) => t.assignedRole !== "admin" && t.assignedRole !== "asset_manager"
      );
    }
    if (role === "admin") {
      return tickets.filter(
        (t) =>
          t.status === "Pending Administration Approval" ||
          t.status === "Approved for Asset Manager" ||
          t.status === "Resolved"
      );
    }
    if (role === "asset_manager") {
      return tickets.filter(
        (t) =>
          t.status === "Approved for Asset Manager" ||
          (t.status === "Resolved" && !!t.assetResolution)
      );
    }
    return tickets;
  }, [role, tickets]);

  // Combined Filters Logic
  const filteredTickets = useMemo(() => {
    let list = filter ? scopedTickets.filter(filter) : scopedTickets;

    // 1. Tab Status Filter
    if (tab !== "all") {
      list = list.filter((t) => {
        if (tab === "OPEN") return normalizeStatus(t.status) === "OPEN";
  
        if (tab === "ACCEPTED")
          return ["ASSIGNED", "ACCEPTED"].includes(normalizeStatus(t.status));
    
        if (tab === "IN PROGRESS")
          return normalizeStatus(t.status) === "IN_PROGRESS";
    
        if (tab === "WAITING FOR USER")
          return ["WAITING", "WAITING FOR USER"].includes(normalizeStatus(t.status));
    
        if (tab === "RESOLVED") return normalizeStatus(t.status) === "RESOLVED";
    
        if (tab === "CLOSED") return normalizeStatus(t.status) === "CLOSED";

        return true;
      });
    }

    // 2. Select Status Filter
    if (statusFilter !== "all") {
      list = list.filter((t) => {
        if (statusFilter === "Accepted") return t.status === "Assigned" || t.status === "Accepted";
        if (statusFilter === "Waiting for User") return t.status === "Waiting" || t.status === "Waiting for User";
        return t.status === statusFilter;
      });
    }

    // 3. Priority Filter
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // 4. Category Filter
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }

    // 5. Search Text Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.createdBy.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    return list;
  }, [scopedTickets, filter, tab, priorityFilter, categoryFilter, statusFilter, searchQuery]);

  // Table Columns Definition
  const columns = useMemo<ColumnDef<Ticket>[]>(() => {
    const cols: ColumnDef<Ticket>[] = [
      {
        accessorKey: "id",
        header: "Ticket ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <div className="max-w-xs truncate font-medium text-foreground">{row.original.title}</div>,
      },
      {
        accessorKey: "createdBy",
        header: "Requester",
      },
      {
        accessorKey: "category",
        header: "Category",
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => <StatusBadge status={row.original.priority} />,
      },
      {
        accessorKey: "assignee",
        header: "Assignee",
        cell: ({ row }) => row.original.assignee || <span className="text-muted-foreground italic">Unassigned</span>,
      },
      {
        id: "estResolutionTime",
        header: "Estimated Resolution Time",
        cell: ({ row }) => {
          const est = parseEstimatedResolutionTime(row.original);
          return <span>{est || <span className="text-muted-foreground italic">—</span>}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          // Normalize Assignee/Accepted to match display status names
          const display = row.original.status === "Assigned" ? "Accepted" : row.original.status;
          return <StatusBadge status={display} />;
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated Time",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.updatedAt}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          // Allow authorized roles to manage ticket status
          const canManage = role !== "employee";
          return (
            <Button
              size="sm"
              variant={canManage ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                setManagedTicket(row.original);
              }}
            >
              {canManage ? "Manage" : "View"}
            </Button>
          );
        },
      },
    ];

    return cols;
  }, [role]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setTab("all");
  };

  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />

      {loading && (
        <Card className="p-12 mb-4">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm">Loading tickets...</p>
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card className="p-6 mb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Failed to load tickets</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Top Status Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-4 md:flex md:w-auto h-auto p-1 bg-muted/60 gap-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg py-2 px-3 text-xs md:text-sm">
                All ({scopedTickets.length})
              </TabsTrigger>
              {STATUSES.map((s) => {
                const count = scopedTickets.filter((t) => {
                  const status = normalizeStatus(t.status);

                  if (s === "Open") return status === "OPEN";

                  if (s === "Accepted")
                    return status === "ASSIGNED" || status === "ACCEPTED";

                  if (s === "In Progress")
                    return status === "IN_PROGRESS";

                  if (s === "Waiting for User")
                    return status === "WAITING" || status === "WAITING_FOR_USER";

                  if (s === "Resolved")
                    return status === "RESOLVED";

                  if (s === "Closed")
                    return status === "CLOSED";

                  return false;
                }).length;
                return (
                  <TabsTrigger key={s} value={s} className="rounded-lg py-2 px-3 text-xs md:text-sm">
                    {s} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Advanced Filter Inputs */}
          <Card className="p-4 rounded-xl border shadow-sm bg-card">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, requester, assignee..."
                  className="bg-background h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 w-full md:w-36 bg-background text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-full md:w-36 bg-background text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full md:w-36 bg-background text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || priorityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="h-9 shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </Card>

          {/* Data Table */}
          {filteredTickets.length === 0 ? (
            <Card className="p-12 text-center rounded-xl border">
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Inbox className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">No tickets in this view</p>
                <p className="text-sm">There are no tickets matching your current query and filters.</p>
              </div>
            </Card>
          ) : (
            <Card className="p-4 rounded-xl border shadow-sm bg-card overflow-hidden">
              <DataTable
                data={filteredTickets}
                columns={columns}
                searchPlaceholder="Refine current list results..."
                pageSize={15}
                onRowClick={(ticket) => setManagedTicket(ticket)}
              />
            </Card>
          )}
        </div>
      )}

      {/* Reusable Manage Ticket Modal */}
      <ManageTicketModal
        ticket={managedTicket}
        isOpen={!!managedTicket}
        onClose={() => setManagedTicket(null)}
      />
    </>
  );
}
