"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  conversations: number;
  messages: number;
}

interface ConversationsChartProps {
  data: ChartDataPoint[];
}

function formatXAxisDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !label) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{formatDateShort(new Date(label))}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center gap-2 text-sm"
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="capitalize">{entry.dataKey}:</span>
          <span className="font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function ConversationsChart({ data }: ConversationsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxisDate}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={{ stroke: "hsl(var(--muted))" }}
          axisLine={{ stroke: "hsl(var(--muted))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={{ stroke: "hsl(var(--muted))" }}
          axisLine={{ stroke: "hsl(var(--muted))" }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          formatter={(value: string) => (
            <span className="text-sm capitalize text-foreground">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="conversations"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#colorConversations)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="messages"
          stroke="hsl(var(--chart-2))"
          fillOpacity={1}
          fill="url(#colorMessages)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
