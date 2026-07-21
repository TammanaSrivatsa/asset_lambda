import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import type { Ticket } from "@/types/domain";
import { toast } from "sonner";
import { FileText, User, Tag, AlertTriangle, Calendar, Activity, Clock } from "lucide-react";

interface ManageTicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const EST_TIME_OPTIONS = [
  "30 Minutes",
  "1 Hour",
  "2 Hours",
  "4 Hours",
  "Today",
  "Tomorrow",
  "2 Days",
  "3 Days",
  "1 Week",
];

const STATUS_OPTIONS = [
  "Open",
  "Accepted",
  "In Progress",
  "Waiting for User",
  "Resolved",
  "Closed",
];

// Helper to parse the latest estimated resolution time from comments/timeline
export function parseEstimatedResolutionTime(ticket: Ticket | null): string {
  if (!ticket) return "";
  
  // 1. Check comments (newest first)
  if (ticket.comments && ticket.comments.length > 0) {
    for (let i = ticket.comments.length - 1; i >= 0; i--) {
      const msg = ticket.comments[i].message;
      if (msg && msg.includes("Estimated Resolution Time: ")) {
        const match = msg.match(/Estimated Resolution Time:\s*([^:\n]+?)(?:\s*\n|$$)/i);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }

  // 2. Check timeline
  if (ticket.timeline && ticket.timeline.length > 0) {
    for (let i = ticket.timeline.length - 1; i >= 0; i--) {
      const remarks = ticket.timeline[i].remarks;
      if (remarks && remarks.includes("Estimated Resolution Time: ")) {
        const match = remarks.match(/Estimated Resolution Time:\s*([^:\n]+?)(?:\s*\n|$$)/i);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }

  return "";
}

// Helper to parse any notes (excluding the Estimated Resolution Time prefix)
export function parseNotesOnly(ticket: Ticket | null): string {
  if (!ticket) return "";
  if (ticket.comments && ticket.comments.length > 0) {
    for (let i = ticket.comments.length - 1; i >= 0; i--) {
      const msg = ticket.comments[i].message;
      if (msg && msg.includes("Estimated Resolution Time: ")) {
        const parts = msg.split(/\n/);
        const notesLine = parts.filter(p => !p.includes("Estimated Resolution Time:")).join("\n");
        return notesLine.replace(/^Notes:\s*/i, "").trim();
      }
    }
  }
  return "";
}

export function ManageTicketModal({ ticket, isOpen, onClose }: ManageTicketModalProps) {
  const { updateTicketStatus } = useData();
  const { user } = useAuth();

  const [status, setStatus] = useState<string>("");
  const [estTime, setEstTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status === "Assigned" ? "Accepted" : ticket.status);
      setEstTime(parseEstimatedResolutionTime(ticket) || "Today");
      setNotes(parseNotesOnly(ticket));
    }
  }, [ticket, isOpen]);

  if (!ticket) return null;

  const handleUpdate = async () => {
    if (!status) {
      toast.error("Please select a status");
      return;
    }

    setUpdating(true);
    try {
      const actor = user?.name || "Support Tech";
      const mappedStatus = status === "Accepted" ? "Assigned" : status;
      
      // Build standard PUT payload comment containing Est Resolution Time & Notes
      const formattedComment = `Estimated Resolution Time: ${estTime}\nNotes: ${notes.trim() || "Ticket updated."}`;
      
      await updateTicketStatus(
        ticket.id,
        mappedStatus as Ticket["status"],
        actor,
        user?.role || "support",
        formattedComment
      );
      
      toast.success(`Ticket ${ticket.id} updated successfully`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto p-0 rounded-lg gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-0.5">
                Ticket Management
              </span>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Manage Ticket {ticket.id}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground text-xs mt-1">
            Review detailed ticket metadata and adjust status, SLA targets, and resolution notes.
          </DialogDescription>
        </DialogHeader>

        {/* Ticket Details Panel */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Subject</span>
                  <span className="text-sm font-semibold text-foreground">{ticket.title}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Requester</span>
                  <span className="text-sm font-medium text-foreground">{ticket.createdBy}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Category</span>
                  <span className="text-sm font-medium text-foreground">{ticket.category}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Priority</span>
                  <span className="text-sm font-medium text-foreground">{ticket.priority}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Created Date</span>
                  <span className="text-sm font-medium text-foreground">{ticket.createdAt}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="h-4.5 w-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">Current Status</span>
                  <span className="text-sm font-medium text-foreground">{ticket.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <span className="text-xs text-muted-foreground block mb-1">Description</span>
            <div className="text-sm bg-muted/30 p-3 rounded border text-foreground/90 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Update Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-foreground">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="h-10 bg-background">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estTime" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Estimated Resolution Time
                </Label>
                <Select value={estTime} onValueChange={setEstTime}>
                  <SelectTrigger id="estTime" className="h-10 bg-background">
                    <SelectValue placeholder="Select Target Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {EST_TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-foreground">
                Update Comments / Resolution Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe diagnostic updates, client feedback, or final resolution steps..."
                className="min-h-[100px] bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20 gap-2">
          <Button variant="outline" onClick={onClose} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updating}>
            {updating ? "Saving Changes..." : "Update Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
