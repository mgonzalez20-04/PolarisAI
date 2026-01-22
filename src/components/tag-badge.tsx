"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  name: string;
  color: string;
  removable?: boolean;
  onRemove?: () => void;
}

export function TagBadge({ name, color, removable = false, onRemove }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      }}
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
    >
      <span>{name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
