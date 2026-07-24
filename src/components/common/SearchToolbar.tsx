import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchToolbarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = "Search records...",
  children,
}: SearchToolbarProps) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card shadow-sm md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-8 h-9 text-sm bg-muted/20 border-border focus-visible:bg-background"
        />
        {value && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
