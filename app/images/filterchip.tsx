import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge className="flex items-center gap-1 px-2 py-1">
      {label}
      <button onClick={onRemove} className="hover:text-red-500">
        <X size={12} />
      </button>
    </Badge>
  );
}
