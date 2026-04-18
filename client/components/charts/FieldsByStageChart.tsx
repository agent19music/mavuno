"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { getFieldsByStageChartData } from "@/lib/mock-helpers";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: {
    label: "Fields",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function FieldsByStageChart() {
  const data = getFieldsByStageChartData();

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="2 2" vertical={false} />
        <XAxis axisLine={false} tickLine={false} dataKey="stage" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={8} />
      </BarChart>
    </ChartContainer>
  );
}
