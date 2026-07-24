import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tags, User, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";
import { uniqueValues } from "@/lib/live-data";
import { useEffect, useState } from "react";
import { fetchTicketCategories,fetchTicketsByCategory } from "@/services/tickets";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

function CategoryGrid({ items, count }: { items: string[]; count: (c: string) => number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(c => (
        <Card key={c} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-md bg-info/10 text-info grid place-items-center"><Tags className="h-4 w-4"/></div>
            <span className="text-xs font-medium text-muted-foreground">{count(c)}</span>
          </div>
          <div className="mt-3 font-medium text-sm">{c}</div>
          <div className="text-xs text-muted-foreground">Category</div>
        </Card>
      ))}
    </div>
  );
}

export default function AssetCategoriesPage() {
  const { assets } = useData();
  const categories = uniqueValues(assets.map((asset) => asset.category));
  return (
    <>
      <PageHeader title="Asset Categories" description="Classification schema for the asset catalog."
        actions={<Button onClick={()=>toast.success("Category added")}><Plus className="h-4 w-4 mr-1"/>Add Category</Button>}/>
      {categories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No asset categories found.</Card>
      ) : (
        <CategoryGrid items={categories} count={(c) => assets.filter(a => a.category === c).length}/>
      )}
    </>
  );
}

export function TicketCategoriesInner() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetchTicketCategories();
      setCategories(res.categories || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ticket categories");
    }
  }
  async function openCategory(categoryName: string) {
    try {
      const res = await fetchTicketsByCategory(categoryName);

      setSelectedCategory(categoryName);
      setTickets(res.tickets || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    }
  }

  return (
    <>
      <PageHeader
        title="Ticket Categories"
        description="Group and route tickets to the right team."
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No ticket categories found.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((category) => (
            <Card
                key={category.name}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openCategory(category.name)}
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-md bg-info/10 text-info grid place-items-center">
                  <Tags className="h-4 w-4" />
                </div>

                <span className="text-xs font-medium text-muted-foreground">
                  {category.ticketCount}
                </span>
              </div>

              <div className="mt-3 font-medium text-sm">
                {category.name}
              </div>

              <div className="text-xs text-muted-foreground">
                Category
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selectedCategory} onOpenChange={(o) => !o && setSelectedCategory(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6 bg-background border-l border-border animate-in slide-in-from-right duration-300">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-md bg-info/10 text-info grid place-items-center">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">{selectedCategory} Category</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Showing {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in this category
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4 mt-2">
            {tickets.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg p-6">
                No tickets found for this category.
              </div>
            ) : (
              tickets.map((ticket: any) => (
                <Card key={ticket.id || ticket.uuid} className="p-5 border border-border bg-card shadow-sm hover:shadow-md transition-all space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                        #{ticket.id}
                      </span>
                      <h3 className="text-sm font-semibold mt-1.5 text-foreground leading-tight">
                        {ticket.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ticket.priority === "Critical" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                        ticket.priority === "High" ? "bg-warning/10 text-warning border border-warning/20" :
                        ticket.priority === "Medium" ? "bg-info/10 text-info border border-info/20" :
                        "bg-muted text-muted-foreground border border-muted-foreground/10"
                      }`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ticket.status === "Open" ? "bg-success/15 text-success border border-success/30" :
                        ticket.status === "Resolved" || ticket.status === "Closed" ? "bg-muted text-muted-foreground" :
                        "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded">
                    {ticket.description}
                  </p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t pt-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Requester</span>
                        <span className="font-medium text-foreground">{ticket.createdBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Assignee</span>
                        <span className="font-medium text-foreground">{ticket.assignee || "Unassigned"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Created At</span>
                        <span className="font-medium text-foreground">{ticket.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">SLA Target</span>
                        <span className={`font-semibold ${
                          ticket.sla === "Breached" ? "text-destructive" :
                          ticket.sla === "At Risk" ? "text-warning" : "text-success"
                        }`}>{ticket.sla || "On Track"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments / Admin remarks if any */}
                  {(ticket.adminRemarks || (ticket.comments && ticket.comments.length > 0)) && (
                    <div className="bg-muted/10 p-3 rounded text-xs space-y-2 border border-border/50">
                      {ticket.adminRemarks && (
                        <div>
                          <span className="font-semibold text-[10px] uppercase text-muted-foreground block">Admin Remarks</span>
                          <span className="italic text-muted-foreground">{ticket.adminRemarks}</span>
                        </div>
                      )}
                      {ticket.comments && ticket.comments.length > 0 && (
                        <div>
                          <span className="font-semibold text-[10px] uppercase text-muted-foreground block mb-1">Latest Update</span>
                          <span className="text-foreground">{ticket.comments[ticket.comments.length - 1].message}</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            By {ticket.comments[ticket.comments.length - 1].author} on {ticket.comments[ticket.comments.length - 1].at}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
