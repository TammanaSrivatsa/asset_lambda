import { ShieldCheck, Calendar, ShieldAlert, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WarrantyCardProps {
  assetId: string;
  assetName: string;
  category: string;
  manufacturer: string;
  warrantyExpiry: string;
  vendorName?: string;
  employeeName?: string | null;
}

export function WarrantyCard({
  assetId,
  assetName,
  category,
  manufacturer,
  warrantyExpiry,
  vendorName = "Dell Enterprise Support",
  employeeName,
}: WarrantyCardProps) {
  const calculateDaysRemaining = (expiryStr: string) => {
    if (!expiryStr) return { days: 0, status: "expired" as const };
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), status: "expired" as const };
    } else if (diffDays <= 30) {
      return { days: diffDays, status: "expiring" as const };
    } else {
      return { days: diffDays, status: "active" as const };
    }
  };

  const { days, status } = calculateDaysRemaining(warrantyExpiry);

  return (
    <Card className={cn(
      "border transition-all duration-300 hover:shadow-md hover:border-muted-foreground/20 rounded-xl bg-card overflow-hidden",
      status === "expired" && "border-l-4 border-l-destructive",
      status === "expiring" && "border-l-4 border-l-warning",
      status === "active" && "border-l-4 border-l-success"
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/40 mb-1.5">
            {category}
          </Badge>
          <CardTitle className="text-base font-bold text-foreground truncate max-w-[200px]">
            {assetName}
          </CardTitle>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{assetId}</p>
        </div>
        <div>
          {status === "expired" && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-semibold gap-1">
              <ShieldAlert className="h-3 w-3" /> Expired
            </Badge>
          )}
          {status === "expiring" && (
            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/20 font-semibold gap-1">
              <Shield className="h-3 w-3" /> Expiring Soon
            </Badge>
          )}
          {status === "active" && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-semibold gap-1">
              <ShieldCheck className="h-3 w-3" /> Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5 pt-0">
        <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border border-border/40">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Expiration Date
          </span>
          <span className="text-xs font-semibold text-foreground">{warrantyExpiry || "N/A"}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Manufacturer</span>
            <span className="font-semibold text-foreground">{manufacturer}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor Support</span>
            <span className="font-medium text-foreground">{vendorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Custodian</span>
            <span className="font-semibold text-foreground">
              {employeeName ? employeeName : <span className="text-muted-foreground italic">In Stock (Available)</span>}
            </span>
          </div>
        </div>

        <div className="border-t pt-3 mt-1 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Remaining Coverage</span>
          <span className={cn(
            "text-sm font-bold",
            status === "expired" && "text-destructive",
            status === "expiring" && "text-warning",
            status === "active" && "text-success"
          )}>
            {status === "expired" ? `${days} days ago` : `${days} days`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
