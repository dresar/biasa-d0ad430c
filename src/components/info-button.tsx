import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InfoButtonProps {
  title: string;
  description: string;
}

export function InfoButton({ title, description }: InfoButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Info: ${title}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          <Info className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm" side="top">
        <div className="font-semibold mb-1">{title}</div>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </PopoverContent>
    </Popover>
  );
}
