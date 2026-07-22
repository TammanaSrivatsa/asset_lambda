import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type {
  Employee, Asset, Assignment, Ticket, Role, Vendor, Maintenance
} from "@/types/domain";
import {
  fetchTickets as apiFetchTickets,
  createTicket as apiCreateTicket,
  uploadFiles as apiUploadFiles,
  updateTicketStatus as apiUpdateTicketStatus,
  addTicketComment as apiAddTicketComment,
} from "@/services/tickets";
import {
  createEmployee as apiCreateEmployee,
  fetchEmployees,
  deleteEmployee as apiDeleteEmployee,
  fetchDashboard,
  fetchAssets,
  createAsset,
  deleteAsset,
  fetchAssignments,
  createAssignment,
  fetchMaintenance,
  verifyEmployee,
  completeAllocation
} from "@/services/data";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface DataCtx {
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  tickets: Ticket[];
  auditLogs: any[];
  notifications: any[];
  maintenance: Maintenance[];
  knowledgeBase: any[];
  dashboardStats: any | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createTicket: (ticket: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail"> & { attachments?: string[] }, actor: string) => Promise<Ticket>;
  uploadFiles: (files: FileList) => Promise<string[]>;
  updateTicketStatus: (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => Promise<void>;
  addTicketComment: (ticketId: string, actor: string, role: Role, message: string) => Promise<void>;
  addEmployee: (emp: Omit<Employee, "id" | "avatar" | "joinDate" | "status">) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
  assignAssets: (employeeId: string, assetIds: string[]) => Promise<void>;
  addAsset: (asset: Omit<Asset, "id">) => Promise<Asset>;
  retireAsset: (id: string) => Promise<void>;
  verifyOnboardingAsset: (employeeId: string, approved: boolean, remarks: string, actor: string) => Promise<void>;
  completeOnboardingAllocation: (employeeId: string, assetId: string, remarks: string, actor: string) => Promise<void>;
  fetchFullProfile: (userUuid: string) => Promise<any>;
  fetchRecentEmployees: () => Promise<any[]>;
}

const Ctx = createContext<DataCtx | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs] = useState<any[]>([]);
  const [notifications] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [knowledgeBase] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!user) {
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const [
    apiEmployees,
    apiAssets,
    apiAssignments,
    apiMaintenance,
    dashboard,
    ticketResponse
] = await Promise.all([
    fetchEmployees(),
    fetchAssets(),
    fetchAssignments(),
    fetchMaintenance(),
    fetchDashboard(),
    apiFetchTickets(user?.role),
]);
console.log("Employees:", apiEmployees);
console.log("Assets:", apiAssets);
console.log("Assignments:", apiAssignments);
console.log("Maintenance:", apiMaintenance);
console.log("Dashboard:", dashboard);

setEmployees(apiEmployees);

const mappedAssets = apiAssets.map((a: any) => ({
    id: a.assetId,
    name: a.assetName,
    category: a.category,
    manufacturer: a.brand,
    model: a.model,
    serial: a.serialNumber,
    purchaseDate: a.purchaseDate,
    warrantyExpiry: a.warrantyExpiry || a.warranty_expiry || "",
    cost: Number(a.purchasePrice || 0),
    location: a.location || a.officeLocation || "",
    assignedTo: a.assignedTo || null,
    status:
        a.status === "AVAILABLE"
            ? "Available"
            : a.status === "ASSIGNED"
            ? "Assigned"
            : a.status === "MAINTENANCE"
            ? "Maintenance"
            : "Retired"
}));

setAssets(mappedAssets);
console.log("Mapped Assets:", mappedAssets);

setAssignments(apiAssignments);
setMaintenance(apiMaintenance);
setDashboardStats(dashboard);
setTickets(ticketResponse.tickets);
    } catch (err: any) {
          console.error(err);
          const message = err.message || "Failed to load application data";
          setError(message);
          toast.error(message);
          setTickets([]);
      } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user) {
        return;
    }
    loadAllData();
}, [user, loadAllData]);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const createTicketFn = async (ticketData: any, actor: string) => {
    try {
      const newTicket = await apiCreateTicket({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        asset_id: ticketData.assetId || null,
        attachments: ticketData.attachments || [],
      });
      await refreshData();
      return newTicket;
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
      throw err;
    }
  };

  const uploadFilesFn = async (files: FileList): Promise<string[]> => {
    try {
      return await apiUploadFiles(files);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload files");
      throw err;
    }
  };

  const updateTicketStatusFn = async (ticketId: string, statusVal: Ticket["status"], actor: string, role: Role, comment?: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, statusVal, user!.role, comment);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    }
  };

  const acceptTicket = async (ticketId: string, actor: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Assigned", user!.role,"Ticket accepted");
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept ticket");
    }
  };

  const escalateTicket = async (ticketId: string, actor: string, remarks: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Escalated", user!.role, remarks);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate ticket");
    }
  };

  const reviewEscalation = async (ticketId: string, approved: boolean, actor: string, remarks: string) => {
    try {
      const updated = await apiUpdateTicketStatus(
        ticketId,
        approved ? "Approved for Asset Manager" : "Open",
        user!.role,
        remarks
      );
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to review escalation");
    }
  };

  const resolveAssetTicket = async (ticketId: string, actor: string, details: any) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Resolved", user!.role, details.remarks);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve ticket");
    }
  };

  const addTicketCommentFn = async (ticketId: string, actor: string, role: Role, message: string) => {
    try {
      await apiAddTicketComment(ticketId, message);
      if (!user?.role) return;
      const { tickets: refreshed } = await apiFetchTickets(user.role);
      const updated = refreshed.find((t) => t.id === ticketId);
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      }
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    }
  };

  const addEmployee = async (empData: any) => {
    try {
      const newEmp = await apiCreateEmployee({
        name: empData.name,
        email: empData.email,
        role: empData.role,
        department: empData.department,
        designation: empData.designation,
        manager: empData.manager,
        location: empData.location,
        status: "Active",
        phone: empData.phone,
        joinDate: todayStr(),
        allocationDate: empData.allocationDate,
        allocationTime: empData.allocationTime,
        requiredAssetCategory: empData.requiredAssetCategory,
      });
      await refreshData();
      return newEmp;
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
      throw err;
    }
  };

const deleteEmployee = async (id: string) => {
    try {
        await apiDeleteEmployee(id);
        await refreshData();
        toast.success("Employee deleted successfully.");
    } catch (err: any) {
        toast.error(err.message || "Failed to delete employee");
        throw err;
    }
};



  const assignAssets = async (employeeId: string, assetIds: string[]) => {

    await createAssignment({
        assetId: assetIds[0],
        employeeId
    });

    await refreshData();

    toast.success("Asset assigned successfully.");

};

  const addAsset = async (assetData: any) => {

    await createAsset({
        assetName: assetData.name,
        category: assetData.category,
        brand: assetData.manufacturer,
        model: assetData.model,
        serialNumber: assetData.serial,
        purchaseDate: assetData.purchaseDate,
        purchasePrice: assetData.cost,
        vendor: ""
    });

    await refreshData();

    toast.success("Asset added successfully.");

};

  const retireAsset = async (id: string) => {

    await deleteAsset(id);

    await refreshData();

    toast.success("Asset deleted successfully.");

};

  const verifyOnboardingAsset = async (
    employeeId: string,
    approved: boolean,
    remarks: string,
    actor: string
) => {
    try {

        if (!approved) {
            toast.warning("Employee marked as Waiting for Inventory.");
            return;
        }

        await verifyEmployee(employeeId, remarks);

        await refreshData();

        toast.success("Employee verified successfully.");

    } catch (err: any) {
        toast.error(err.message || "Failed to verify employee");
    }
};

  const completeOnboardingAllocation = async (
    employeeId: string,
    assetId: string,
    remarks: string,
    actor: string
) => {
    try {

        await completeAllocation(
            employeeId,
            assetId,
            remarks
        );

        await refreshData();

        toast.success("Asset allocated successfully.");

    } catch (err: any) {
        toast.error(err.message || "Failed to allocate asset");
    }
};

  const fetchFullProfile = async (userUuid: string) => {
    const employee = employees.find((e) => e.id === userUuid || e.uuid === userUuid);
    return employee ?? null;
  };

  const fetchRecentEmployees = async () => {
    return employees.slice(0, 10);
  };

  if (!hydrated) {
    return null;
  }

  return (
    <Ctx.Provider value={{
      employees,
      assets,
      assignments,
      tickets,
      auditLogs,
      notifications,
      vendors,
      maintenance,
      knowledgeBase,
      dashboardStats,
      loading,
      error,
      refreshData,
      createTicket: createTicketFn,
      uploadFiles: uploadFilesFn,
      acceptTicket,
      updateTicketStatus: updateTicketStatusFn,
      addTicketComment: addTicketCommentFn,
      escalateTicket,
      reviewEscalation,
      resolveAssetTicket,
      addEmployee,
      deleteEmployee,
      assignAssets,
      addAsset,
      retireAsset,
      verifyOnboardingAsset,
      completeOnboardingAllocation,
      fetchFullProfile,
      fetchRecentEmployees
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData must be used within a DataProvider");
  return c;
}
