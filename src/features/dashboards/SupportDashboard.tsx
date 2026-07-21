import { useState, useMemo, useEffect } from "react";
import {
  Inbox,
  UserCheck,
  PlayCircle,
  Clock,
  CheckCircle,
  Archive,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Send,
  Paperclip,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import { countBy, monthKey } from "@/lib/live-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Timeline } from "@/components/common/Timeline";
import { toast } from "sonner";
import type { Ticket } from "@/types/domain";

const PRIORITY_COLORS = {
  Critical: "#EF4444", // red
  High: "#F97316",     // orange
  Medium: "#3B82F6",   // blue
  Low: "#6B7280",      // gray
};

const SLA_COLORS = {
  "On Track": "#10B981", // green
  "At Risk": "#F59E0B",   // yellow
  "Breached": "#EF4444",  // red
};

export function SupportDashboard() {
  const {
    tickets,
    loading,
    error,
    refreshData,
    acceptTicket,
    updateTicketStatus,
    addTicketComment,
    escalateTicket,
  } = useData();

  const { user } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const normalizeStatus = (status?: string) => {
    return (status ?? "")
      .trim()
      .replace(/_/g, " ")
      .toUpperCase();
  };

  // Filter stats
  const openCount = tickets.filter(
    t => normalizeStatus(t.status) === "OPEN"
  ).length;

  const acceptedCount = tickets.filter(t =>
    ["ASSIGNED", "ACCEPTED"].includes(normalizeStatus(t.status))
  ).length;

  const inProgressCount = tickets.filter(
    t => normalizeStatus(t.status) === "IN PROGRESS"
  ).length;

  const waitingCount = tickets.filter(t =>
    ["WAITING", "WAITING FOR USER"].includes(normalizeStatus(t.status))
  ).length;

  const resolvedToday = tickets.filter(
    t =>
      normalizeStatus(t.status) === "RESOLVED" &&
      t.updatedAt?.slice(0,10) === todayStr
  ).length;

  const closedToday = tickets.filter(
    t =>
      normalizeStatus(t.status) === "CLOSED" &&
      t.updatedAt?.slice(0,10) === todayStr
  ).length;

  const stats = [
    {
      label: "Open Tickets",
      count: openCount,
      icon: Inbox,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      indicator: "bg-blue-500",
    },
    {
      label: "In Progress",
      count: inProgressCount,
      icon: PlayCircle,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      indicator: "bg-orange-500",
    },
    {
      label: "Waiting for User",
      count: waitingCount,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      indicator: "bg-yellow-500",
    },
    {
      label: "Resolved Today",
      count: resolvedToday,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      indicator: "bg-green-500",
    },
  ];

  // Recharts Data Transformation
  const priorityData = useMemo(() => {
    const raw = countBy(tickets, (t) => t.priority);
    return ["Critical", "High", "Medium", "Low"].map((p) => {
      const match = raw.find((r) => r.name === p);
      return {
        name: p,
        value: match ? match.value : 0,
        fill: PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS] || "#E5E7EB",
      };
    }).filter((item) => item.value > 0);
  }, [tickets]);

  const slaData = useMemo(() => {
    const onTrack = tickets.filter((t) => t.sla === "On Track").length;
    const atRisk = tickets.filter((t) => t.sla === "At Risk").length;
    const breached = tickets.filter((t) => t.sla === "Breached").length;
    return [
      { name: "On Track", count: onTrack, fill: SLA_COLORS["On Track"] },
      { name: "At Risk", count: atRisk, fill: SLA_COLORS["At Risk"] },
      { name: "Breached", count: breached, fill: SLA_COLORS["Breached"] },
    ];
  }, [tickets]);

  const trendData = useMemo(() => {
    const rawMonths = countBy(tickets, (t) => monthKey(t.createdAt));
    return rawMonths.map((item) => {
      const month = item.name;
      const opened = item.value;
      const resolved = tickets.filter(
        (t) =>
          monthKey(t.updatedAt) === month &&
          ["Resolved", "Closed"].includes(t.status)
      ).length;
      return {
        month,
        Opened: opened,
        Resolved: resolved,
      };
    });
  }, [tickets]);

  const recentTickets = useMemo(() => {
    // Sort tickets by updatedAt descending, take first 5
    return [...tickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tickets]);

  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  const handlePostComment = async () => {
    if (!selectedTicket || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const actor = user?.name || "Support Tech";
      await addTicketComment(selectedTicket.id, actor, "support", commentText.trim());
      setCommentText("");
      toast.success("Comment posted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleWorkflowAction = async (action: string) => {
    if (!selectedTicket) return;
    const actor = user?.name || "Support Tech";
    try {
      if (action === "accept") {
        await acceptTicket(selectedTicket.id, actor);
        toast.success("Ticket accepted and assigned to you");
      } else if (action === "in_progress") {
        await updateTicketStatus(selectedTicket.id, "In Progress", actor, "support", "Status changed to In Progress.");
        toast.success("Status updated to In Progress");
      } else if (action === "escalate") {
        await escalateTicket(selectedTicket.id, actor, "Escalating ticket for administrator review.");
        toast.success("Ticket escalated successfully");
      } else if (action === "resolve") {
        await updateTicketStatus(selectedTicket.id, "Resolved", actor, "support", "Issue marked as Resolved.");
        toast.success("Ticket resolved successfully");
      } else if (action === "close") {
        await updateTicketStatus(selectedTicket.id, "Closed", actor, "support", "Ticket closed.");
        toast.success("Ticket closed successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute workflow action");
    }
  };

  return (
    <>
      <PageHeader
        title="IT Support Dashboard"
        description="Monitor ticket queues, SLA health metrics, and daily resolution progress."
        actions={
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading && "animate-spin"}`} />
            Refresh Dashboard
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`rounded-xl border ${stat.border} shadow-sm overflow-hidden relative bg-card`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${stat.indicator}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-extrabold tracking-tight mt-1">{stat.count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Ticket Priority Chart */}
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Ticket Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {priorityData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">
                No active tickets in queue.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {priorityData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, pt: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Ticket Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {trendData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">
                No historical records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11, pt: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Opened"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Resolved"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SLA Performance Chart */}
        <Card className="rounded-xl border shadow-sm bg-card">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              SLA Health Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={slaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {slaData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">
              Recently Updated Tickets
            </CardTitle>
            <span className="text-xs text-muted-foreground font-medium">
              Showing latest updates
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Ticket ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Title</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Requester</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Category</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Assigned To</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Last Updated</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-muted/25 transition-colors">
                      <TableCell className="font-mono text-xs font-medium text-foreground">{ticket.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium text-foreground">{ticket.title}</TableCell>
                      <TableCell className="text-sm">{ticket.createdBy}</TableCell>
                      <TableCell className="text-sm">{ticket.category}</TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.assignee ? (
                          <span className="font-medium text-foreground">{ticket.assignee}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ticket.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicketId(ticket.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Drawer Sheet */}
      <Sheet open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background">
          {selectedTicket && (
            <div className="space-y-6">
              <SheetHeader className="p-0 border-b pb-4 gap-1">
                <div className="text-xs font-mono text-muted-foreground">{selectedTicket.id}</div>
                <SheetTitle className="text-xl font-bold">{selectedTicket.title}</SheetTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={selectedTicket.priority} />
                  <StatusBadge status={selectedTicket.status} />
                  <StatusBadge status={selectedTicket.sla} />
                </div>
              </SheetHeader>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-muted/40 rounded-xl border border-muted">
                <div>
                  <span className="text-xs text-muted-foreground block">Requester</span>
                  <span className="font-semibold text-foreground">{selectedTicket.createdBy}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Assignee</span>
                  <span className="font-semibold text-foreground">{selectedTicket.assignee || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Category</span>
                  <span className="font-semibold text-foreground">{selectedTicket.category}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Related Asset ID</span>
                  <span className="font-mono font-semibold text-foreground">{selectedTicket.assetId || "None"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Created Date</span>
                  <span className="font-medium text-foreground">{selectedTicket.createdAt}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Last Updated</span>
                  <span className="font-medium text-foreground">{selectedTicket.updatedAt}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Description
                </span>
                <div className="text-sm bg-muted/20 p-4 rounded-xl border whitespace-pre-wrap text-foreground">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Attachments
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTicket.attachments.map((url, idx) => {
                      const fileName = url.substring(url.indexOf("_") + 1);
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 text-xs text-primary font-medium transition-colors"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{fileName}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Workflow Actions Section */}
              <div className="border-t pt-4 space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Workflow Dispatch Actions
                </span>
                <div className="flex gap-2 flex-wrap">
                  {selectedTicket.status === "Open" && (
                    <Button size="sm" onClick={() => handleWorkflowAction("accept")}>
                      Accept Ticket
                    </Button>
                  )}
                  {["Open", "Assigned", "Accepted"].includes(selectedTicket.status) && (
                    <Button variant="outline" size="sm" onClick={() => handleWorkflowAction("in_progress")}>
                      In Progress
                    </Button>
                  )}
                  {!["Pending Administration Approval", "Approved for Asset Manager", "Resolved", "Closed"].includes(selectedTicket.status) && (
                    <Button variant="outline" size="sm" onClick={() => handleWorkflowAction("escalate")}>
                      Escalate
                    </Button>
                  )}
                  {!["Resolved", "Closed"].includes(selectedTicket.status) && (
                    <Button variant="outline" size="sm" onClick={() => handleWorkflowAction("resolve")}>
                      Resolve Ticket
                    </Button>
                  )}
                  {selectedTicket.status === "Resolved" && (
                    <Button variant="outline" size="sm" onClick={() => handleWorkflowAction("close")}>
                      Close Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div className="border-t pt-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                    Ticket Timeline
                  </span>
                  <Timeline
                    items={selectedTicket.timeline.map((item) => ({
                      title: item.step,
                      description: item.remarks,
                      time: `${item.timestamp} - ${item.actor}`,
                      tone:
                        item.status === "Resolved" || item.status === "Closed"
                          ? ("success" as const)
                          : item.status === "Pending Administration Approval"
                          ? ("warning" as const)
                          : ("primary" as const),
                    }))}
                  />
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t pt-4 space-y-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Conversation & Remarks
                </span>
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  <Timeline
                    items={selectedTicket.comments.map((c) => ({
                      title: c.author,
                      description: c.message,
                      time: c.at,
                      tone: "primary" as const,
                    }))}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic">No discussion posts yet.</p>
                )}

                <div className="space-y-2 mt-4">
                  <span className="text-xs font-semibold text-foreground">Post Comment / Resolution Note</span>
                  <Textarea
                    placeholder="Type comments, update remarks, or resolution reasons..."
                    className="min-h-[80px]"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicketId(null)}
                    >
                      Close Drawer
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePostComment}
                      disabled={isSubmittingComment || !commentText.trim()}
                    >
                      <Send className="h-3 w-3 mr-1.5" /> Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
