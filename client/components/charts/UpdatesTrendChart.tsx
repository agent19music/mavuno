"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  updates: {
    label: "Updates",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function UpdatesTrendChart({
  points,
}: {
  points: { date: string; updates: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <AreaChart data={points}>
        <CartesianGrid strokeDasharray="2 2" vertical={false} />
        <XAxis axisLine={false} tickLine={false} dataKey="date" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="updates"
          stroke="var(--color-updates)"
          fill="var(--color-updates)"
          fillOpacity={0.16}
        />
      </AreaChart>
    </ChartContainer>
  );
}
