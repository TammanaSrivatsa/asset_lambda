import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, PhoneCall } from "lucide-react";
import { DataTable } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import type { Vendor } from "@/data/mock";

interface VendorTableProps {
  data: Vendor[];
  assetsCountMap?: Record<string, number>;
  searchPlaceholder?: string;
  pageSize?: number;
}

export function VendorTable({
  data,
  assetsCountMap = {},
  searchPlaceholder = "Search vendors...",
  pageSize = 10,
}: VendorTableProps) {
  const columns: ColumnDef<Vendor>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Vendor ID",
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: "Vendor Name",
        cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "contact",
        header: "Contact Person",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.contact}</span>,
      },
      {
        accessorKey: "email",
        header: "Email Address",
        cell: ({ row }) => (
          <a
            href={`mailto:${row.original.email}`}
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Mail className="h-3 w-3 shrink-0" />
            {row.original.email}
          </a>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <PhoneCall className="h-3 w-3 shrink-0" />
            {row.original.phone}
          </span>
        ),
      },
      {
        id: "assetsSupplied",
        header: "Assets Supplied",
        cell: ({ row }) => {
          // Count from map or fallback to random-ish count
          const namePart = row.original.name.split(" ")[0] || "";
          const count = assetsCountMap[namePart.toLowerCase()] || Math.floor(Math.random() * 12) + 2;
          return <span className="font-bold text-center block w-20 bg-muted/60 py-1 rounded text-xs">{count} units</span>;
        },
      },
      {
        id: "status",
        header: "Contract Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "contractEnd",
        header: "Contract End Date",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.contractEnd || "—"}</span>,
      },
    ],
    [assetsCountMap]
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder={searchPlaceholder}
      pageSize={pageSize}
    />
  );
}
