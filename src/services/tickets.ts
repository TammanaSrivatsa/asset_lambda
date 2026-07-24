  import { apiFetch } from "./api";
  import type { Ticket, Role } from "@/types/domain";

  function displayStatus(status?: string): string {
  switch ((status || "").replace(/\s+/g, "_").toUpperCase()) {
    case "OPEN":
      return "Open";

    case "ASSIGNED":
      return "Accepted";

    case "IN_PROGRESS":
      return "In Progress";

    case "WAITING":
    case "WAITING_FOR_USER":
      return "Waiting for User";

    case "RESOLVED":
      return "Resolved";

    case "CLOSED":
      return "Closed";

    default:
      return status || "";
  }
}

  interface BackendTicket {
    id: string;
    display_id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    status: string;
    created_by_id: string;
    assignee_id: string | null;
    asset_id: string | null;
    sla: string;
    support_resolution?: string;
    admin_remarks?: string;
    asset_action?: string;
    asset_details?: string;
    asset_remarks?: string;
    asset_resolution?: string;
    assigned_role?: string;
    attachments?: string[];
    created_at: string;
    updated_at: string;
    timeline?: {
      step: string;
      timestamp: string;
      actor: string;
      role: string;
      remarks?: string;
      status?: string;
    }[];
    audit_trail?: {
      user: string;
      role: string;
      timestamp: string;
      fromStatus?: string;
      toStatus: string;
      comment?: string;
    }[];
    comments: {
      id: string;
      ticket_id: string;
      author_name: string;
      message: string;
      created_at: string;
    }[];
  }

  function mapTicket(bt: BackendTicket): Ticket {
    const creatorName =
      bt.timeline && bt.timeline.length > 0
        ? bt.timeline[0].actor
        : bt.created_by_id
          ? bt.created_by_id.slice(0, 8)
          : "Unknown";

    const assigneeName = bt.assignee_id
      ? (bt.timeline ?? [])
          .filter((e) => e.step === "Assigned to Support" && e.actor !== "System")
          .map((e) => e.actor)[0] ?? bt.assignee_id.slice(0, 8)
      : null;

    return {
      id: bt.display_id,
      uuid: bt.id,
      title: bt.title,
      description: bt.description,
      priority: bt.priority as Ticket["priority"],
      category: bt.category,
      status: bt.status as Ticket["status"],
      createdBy: creatorName,
      assignee: assigneeName,
      assetId: bt.asset_id ?? null,
      createdAt: bt.created_at?.slice(0, 10),
      updatedAt: bt.updated_at?.slice(0, 10),
      sla: bt.sla as Ticket["sla"],
      attachments: bt.attachments ?? [],
      comments: (bt.comments ?? []).map((c) => ({
        author: c.author_name,
        message: c.message,
        at: c.created_at?.slice(0, 10),
      })),
      supportResolution: bt.support_resolution,
      adminRemarks: bt.admin_remarks,
      assetAction: bt.asset_action as Ticket["assetAction"],
      assetDetails: bt.asset_details,
      assetRemarks: bt.asset_remarks,
      assetResolution: bt.asset_resolution,
      assignedRole: bt.assigned_role as Role,
      timeline: (bt.timeline ?? []).map((t) => ({
        step: t.step,
        timestamp: t.timestamp,
        actor: t.actor,
        role: t.role as Role | "system",
        remarks: t.remarks,
        status: t.status as Ticket["status"],
      })),
      auditTrail: (bt.audit_trail ?? []).map((a) => ({
        user: a.user,
        role: a.role as Role | "system",
        timestamp: a.timestamp,
        fromStatus: a.fromStatus as Ticket["status"],
        toStatus: a.toStatus as Ticket["status"],
        comment: a.comment,
      })),
    };
  }

  export async function fetchTickets(role?: string): Promise<{ tickets: Ticket[]; total: number }> {
    console.log("Current Role:", role);
    const endpoint =
      role === "support"
        ? "/tickets"
        : "/employee/tickets";
    console.log("Calling endpoint:", endpoint);

    const data = await apiFetch<{ success: boolean; tickets: any[] }>(endpoint);
    console.log("Backend ticket statuses:", data.tickets.map((t: any) => t.status));
    const tickets = (data.tickets || []).map((t: any) => ({
      id: t.ticketId,
      uuid: t.ticketId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      status: displayStatus(t.status),
      createdBy: t.employeeId,
      assignee: t.assignedTo,
      assetId: t.assetId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      comments: t.comments || [],
      attachments: [],
      timeline: t.timeline || [],
    }));

    return {
      tickets,
      total: data.tickets.length,
    };
  }

  export async function createTicket(
    payload: {
      title: string;
      description: string;
      priority: string;
      category: string;
      assetId?: string | null;
      attachments?: string[];
  }
  ): Promise<Ticket> {
    const response = await apiFetch<any>("/employee/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const t = response.ticket;

    return {
      id: t.ticketId,
      uuid: t.ticketId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      status: displayStatus(t.status),
      createdBy: t.employeeId,
      assignee: t.assignedTo,
      assetId: t.assetId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      comments: t.comments || [],
      attachments: [],
      timeline: t.timeline || [],
    } as Ticket;
  }

  export async function updateTicketStatus(
    ticketId: string,
    status: string,
    role: string,
    comment?: string,
  ): Promise<Ticket> {
    const endpoint =
      role === "support"
        ? `/tickets/${ticketId}`
        : `/employee/tickets/${ticketId}`;
    console.log("Update Ticket Role:", role);
console.log("Update Endpoint:", endpoint);

    const response = await apiFetch<any>(endpoint, {
      method: "PUT",
      body: JSON.stringify({
        status,
        comment,
      }),
    });

    const t = response.ticket;

    return {
      id: t.ticketId,
      uuid: t.ticketId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      status: displayStatus(t.status),
      createdBy: t.employeeId,
      assignee: t.assignedTo,
      assetId: t.assetId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      comments: t.comments || [],
      attachments: [],
      timeline: t.timeline || [],
    } as Ticket;
  }

  export async function addTicketComment(): Promise<void> {
    console.log("Comment feature not implemented yet.");
  }

  export async function uploadFiles(): Promise<string[]> {
    console.log("Upload feature not implemented yet.");
    return [];
  }
  export async function fetchTicketCategories() {
  return apiFetch("/admin/ticket-categories");
}

  export async function fetchTicketsByCategory(category: string) {
    return apiFetch(
        `/admin/ticket-categories/${encodeURIComponent(category)}/tickets`
    );
}