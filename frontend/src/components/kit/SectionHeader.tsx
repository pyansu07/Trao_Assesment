import type { ReactNode } from "react";
import { TabIcon } from "@/components/TabIcon";

export function SectionHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <TabIcon name={icon} className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
