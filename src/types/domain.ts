export type Role =
  | "employee"
  | "support"
  | "asset_manager"
  | "admin"
  | "lo_support";

export interface Employee {
  id: string;
  uuid: string;
  name: string;
  email: string;

  role?: Role;

  department: string;
  designation: string;
  manager: string;
  location: string;

  status: "Active" | "Inactive" | "On Leave";

  avatar: string;
  phone: string;

  joinDate: string;

  allocationDate?: string;
  allocationTime?: string;

  workflowState?:
    | "Pending Asset Manager"
    | "Pending IT Support"
    | "Pending Asset Allocation"
    | "Completed";

  allocationStatus?:
    | "Awaiting Asset Verification"
    | "Assets Reserved"
    | "Verified by IT Support"
    | "Assets Allocated"
    | "Partial Reservation";

  requiredAssetCategory?: string[];

  reservedAssetDetails?: {
    assetId: string;
    assetName: string;
    category: string;
  }[];

  allocatedAssetDetails?: {
    assetId: string;
    assetName: string;
    category: string;
  }[];

  pendingAssets?: string[];

  allocationHistory?: {
    allocatedAt: string;
    remarks?: string;
    assets: {
      assetId: string;
      assetName: string;
      category: string;
    }[];
  }[];
}

export interface Asset {
  id: string;
  uuid: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchaseDate: string;
  warrantyExpiry: string;
  location: string;
  assignedTo: string | null;
  status: "Assigned" | "Available" | "Maintenance" | "Retired";
  cost: number;
}

export interface Ticket {
  id: string;
  uuid?: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  status:
    | "Open"
    | "Assigned"
    | "In Progress"
    | "Waiting"
    | "Escalated"
    | "Pending Administration Approval"
    | "Approved for Asset Manager"
    | "Resolved"
    | "Closed";
  createdBy: string;
  assignee: string | null;
  assetId: string | null;
  createdAt: string;
  updatedAt: string;
  sla: "On Track" | "At Risk" | "Breached";
  attachments?: string[];
  comments: { author: string; message: string; at: string }[];
  supportResolution?: string;
  adminRemarks?: string;
  assetAction?: "Repair" | "Replace" | "Reassign";
  assetDetails?: string;
  assetRemarks?: string;
  assetResolution?: string;
  assignedRole?: Role;
  timeline?: {
    step: string;
    timestamp: string;
    actor: string;
    role: Role | "system";
    remarks?: string;
    status?: Ticket["status"];
  }[];
  auditTrail?: {
    user: string;
    role: Role | "system";
    timestamp: string;
    fromStatus?: Ticket["status"];
    toStatus: Ticket["status"];
    comment?: string;
  }[];
}

export interface Assignment {
  assignmentId: string;
  assetId: string;
  employeeId: string;
  assignedDate: string;
  status: "ACTIVE" | "RETURNED";
  createdAt: string;
}

export interface Maintenance {
  maintenanceId: string;
  assetId: string;
  issue: string;
  reportedBy: string;
  technician: string;
  status: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  returnedAssets: number;
  pendingTickets: number;
  recentActivities: any[];
}
