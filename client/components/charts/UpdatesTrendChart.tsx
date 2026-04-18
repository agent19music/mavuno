"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { getUpdatesTrendChartData } from "@/lib/mock-helpers";
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

export function UpdatesTrendChart() {
  const raw = getUpdatesTrendChartData();
  const merged = raw.reduce(
    (acc, item) => {
      const existing = acc.find((x) => x.date === item.date);
      if (existing) existing.updates += item.updates;
      else acc.push({ date: item.date, updates: item.updates });
      return acc;
    },
    [] as { date: string; updates: number }[]
  );

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <AreaChart data={merged}>
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
