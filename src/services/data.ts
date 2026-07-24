import { apiFetch } from "./api";
import type { Employee } from "@/types/domain";

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface BackendUser {
  id: string;
  display_id: string;
  name: string;
  email: string;
  role?: string;
  department?: string | null;
  designation?: string | null;
  manager?: string | null;
  location?: string | null;
  status?: string;
  avatar?: string | null;
  phone?: string | null;
  join_date?: string | null;
  allocation_date?: string | null;
  allocation_time?: string | null;
  allocation_status?: Employee["allocationStatus"] | null;
  required_asset_category?: string | null;
  allocated_asset_details?: any;
  allocation_history?: any[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function mapEmployee(user: any): Employee {

  return {
    id: user.userId,
    uuid: user.userId,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,

    role:
      user.role === "SUPPORT"
        ? "support"
        : user.role === "ASSET_MANAGER"
        ? "asset_manager"
        : "employee",

    department: user.department ?? "",
    designation: user.designation ?? "",
    manager: user.manager ?? "",
    location: user.location ?? "",

    status:
      user.status === "ACTIVE"
        ? "Active"
        : "Inactive",

    avatar:
      `${user.firstName[0]}${user.lastName[0]}`,

    phone: "",

    joinDate: user.createdAt,

    allocationDate: user.allocationDate,
    allocationTime: user.allocationTime,
    workflowState: user.workflowState,
    allocationStatus: user.allocationStatus,
    requiredAssetCategory: user.requiredAssetCategory ?? [],
    reservedAssetDetails: user.reservedAssetDetails ?? [],
    allocatedAssetDetails: user.allocatedAssetDetails ?? [],
    pendingAssets: user.pendingAssets ?? [],
    allocationHistory: user.allocationHistory ?? [],
  };
}

export async function fetchEmployees() {
    console.log("Calling GET /admin/users");

    const data = await apiFetch<any>("/admin/users");

    console.log("API Response:", data);

    console.log("Users Array:", data.users);

    const mapped = data.users.map(mapEmployee);

    console.log("Mapped Employees:", mapped);

    return mapped;
}

export async function fetchFullProfile() {
  return apiFetch<any>("/profile");
}

export async function createEmployee(payload: any) {

  const data = await apiFetch<any>("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      firstName: payload.name.split(" ")[0],
      lastName: payload.name.split(" ").slice(1).join(" "),
      email: payload.email,
      role:
        payload.role === "support"
          ? "IT_SUPPORT"
          : payload.role === "asset_manager"
          ? "ASSET_MANAGER"
          : "EMPLOYEE",
      department: payload.department,
      designation: payload.designation,
      joiningDate: payload.joinDate,
      joinDate: payload.joinDate,
      join_date: payload.joinDate,
      allocationDate: payload.allocationDate,
      allocationTime: payload.allocationTime,
      requiredAssetCategory: payload.requiredAssetCategory
    })
  });

  return data;
}

export async function deleteEmployee(id: string) {
  return apiFetch(`/employees/${id}`, {
    method: "DELETE"
  });
}

export async function fetchDashboard() {
  const data = await apiFetch<any>("/admin/dashboard");
  return data;
}
export async function fetchAssets() {

  const data = await apiFetch<any>("/assets");

  return data.assets;

}

export async function createAsset(payload: any) {

  return apiFetch("/assets", {
    method: "POST",
    body: JSON.stringify({
      assetName: payload.assetName,
      category: payload.category,
      brand: payload.brand,
      model: payload.model,
      serialNumber: payload.serialNumber,
      purchaseDate: payload.purchaseDate,
      purchasePrice: payload.purchasePrice,
      vendor: payload.vendor
    })
  });

}

export async function deleteAsset(id: string) {

  return apiFetch(`/assets/${id}`, {
    method: "DELETE"
  });
}

export async function updateAsset(id: string, payload: any) {

  return apiFetch(`/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

}
// ======================= ASSIGNMENTS =======================

export async function fetchAssignments() {

  const data = await apiFetch<any>("/assignments");

  return data.assignments;

}

export async function createAssignment(payload: any) {

  return apiFetch("/assignments", {
    method: "POST",
    body: JSON.stringify({
      assetId: payload.assetId,
      employeeId: payload.employeeId
    })
  });

}
export async function completeAllocation(
  employeeId: string,
  remarks: string
) {
  return apiFetch("/support/onboarding/allocate", {
    method: "POST",
    body: JSON.stringify({
      employeeId,
      remarks,
    }),
  });
}

export async function verifyEmployee(
  userId: string,
  remarks: string
) {
  return apiFetch(`/support/onboarding/${userId}/verify`, {
    method: "PUT",
    body: JSON.stringify({
      remarks,
    }),
  });
}
export async function updateAssignment(id: string) {

  return apiFetch(`/assignments/${id}`, {
    method: "PUT"
  });

}

export async function deleteAssignment(id: string) {

  return apiFetch(`/assignments/${id}`, {
    method: "DELETE"
  });

}
// ======================= MAINTENANCE =======================

export async function fetchMaintenance() {
  const data = await apiFetch<any>("/maintenance");
  return data.maintenance;
}

export async function createMaintenance(payload: any) {
  return apiFetch("/maintenance", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMaintenance(id: string, payload: any) {
  return apiFetch(`/maintenance/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMaintenance(id: string) {
  return apiFetch(`/maintenance/${id}`, {
    method: "DELETE"
  });
}

export async function reserveAssets(
  employeeId: string,
  remarks: string
) {
  return apiFetch("/assets/reserve", {
    method: "POST",
    body: JSON.stringify({
      employeeId,
      remarks,
    }),
  });
}