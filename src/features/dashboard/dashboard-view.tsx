"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  CircleDollarSign,
  FileClock,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import { useFinance } from "@/data/demo/finance-provider";
import { dashboardTotals, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney, todayManila } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatusBadge } from "@/components/financial/shared";

const chartConfig = {
  appropriation: { label: "Approved budget", color: "var(--brand)" },
} satisfies ChartConfig;

export function DashboardView() {
  const { data } = useFinance();
  const totals = dashboardTotals(data);
  const utilization = totals.appropriation
    ? Math.round((totals.obligated / totals.appropriation) * 100)
    : 0;
  const availablePercent = totals.appropriation
    ? Math.round((totals.available / totals.appropriation) * 100)
    : 0;
  const pendingVouchers = data.vouchers.filter((voucher) => voucher.status === "submitted");
  const readyToPay = data.vouchers.filter((voucher) => voucher.status === "approved");
  const unmatchedReceipts = data.collections.filter((item) => receiptUnmatched(data, item.id) > 0);
  const openAdvances = data.cashAdvances.filter(
    (advance) =>
      advance.amount >
      data.liquidationEntries
        .filter((entry) => entry.advanceId === advance.id)
        .reduce((sum, entry) => sum + entry.amount, 0),
  );
  const recentVouchers = data.vouchers.slice(0, 5);
  const chartData = data.budgetLines.map((line) => ({
    label: line.name.length > 13 ? line.name.split(" ")[0] : line.name,
    fullName: line.name,
    appropriation: line.appropriation,
  }));
  const largestAllocation = Math.max(0, ...chartData.map((item) => item.appropriation));

  const attention = [
    {
      href: "/disbursements",
      icon: FileClock,
      count: pendingVouchers.length,
      label: "For review",
      tint: "bg-brand-soft text-brand-ink",
    },
    {
      href: "/disbursements",
      icon: CheckCheck,
      count: readyToPay.length,
      label: "Ready to pay",
      tint: "bg-success-soft text-success",
    },
    {
      href: "/deposits",
      icon: ReceiptText,
      count: unmatchedReceipts.length,
      label: "Unmatched",
      tint: "bg-info-soft text-info",
    },
    {
      href: "/advances",
      icon: BookOpen,
      count: openAdvances.length,
      label: "Advances",
      tint: "bg-violet-soft text-violet",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-1">
        <div>
          <p className="text-sm font-semibold text-foreground">Good day, {data.barangay}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Here is your finance snapshot for {displayDate(todayManila())}.
          </p>
        </div>
        <Badge className="border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
          FY {data.fiscalYear} · General Fund
        </Badge>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.8fr)]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden border-0 shadow-[0_4px_24px_rgba(18,29,35,.03)]">
            <CardHeader className="flex-row items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-[20px] font-bold text-foreground">Overview</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  The key numbers for your barangay
                </p>
              </div>
              <span className="rounded-full border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                Fiscal year {data.fiscalYear}
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid rounded-[25px] border border-border bg-muted p-1.5 md:grid-cols-2">
                <div className="rounded-[21px] bg-card px-6 py-6 shadow-[0_2px_14px_rgba(28,38,43,.05)] sm:px-7">
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-secondary">
                    <Wallet size={18} className="text-brand-ink" /> Available budget
                  </div>
                  <div className="money mt-5 text-[31px] font-semibold tracking-[-.045em] text-foreground sm:text-[38px]">
                    {formatMoney(totals.available)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg bg-success-soft px-2 py-1 font-bold text-success">
                      {availablePercent}% remaining
                    </span>
                    <span>of {formatMoney(totals.appropriation)} approved</span>
                  </div>
                </div>
                <div className="px-6 py-6 sm:px-7">
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-muted-foreground">
                    <Landmark size={18} /> Cash in bank
                  </div>
                  <div className="money mt-5 text-[31px] font-semibold tracking-[-.045em] text-foreground sm:text-[38px]">
                    {formatMoney(totals.bank)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg bg-brand-soft px-2 py-1 font-bold text-brand-ink">
                      {formatMoney(totals.paid)} paid
                    </span>
                    <span>to date in this demo</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">Needs your attention</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jump to the records that need a next step.
                  </p>
                </div>
                <Link
                  href="/audit"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
                >
                  Activity <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {attention.map(({ href, icon: Icon, count, label, tint }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group flex flex-col items-center rounded-2xl px-2 py-3 text-center transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <div
                      className={`grid h-14 w-14 place-items-center rounded-full ${tint} transition-transform group-hover:-translate-y-0.5`}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="money mt-3 text-[19px] font-bold text-foreground">{count}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                      {label}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-[0_4px_24px_rgba(18,29,35,.03)]">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle className="text-[20px] font-bold text-foreground">
                  Budget allocation
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Approved appropriation by budget line
                </p>
              </div>
              <Link
                href="/budget"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-[11px] font-semibold text-secondary hover:bg-muted"
              >
                View budget <ArrowRight size={13} />
              </Link>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[300px]">
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={
                        <ChartTooltipContent
                          className="rounded-xl border-border bg-card"
                          labelFormatter={(_value, payload) => payload[0]?.payload?.fullName ?? ""}
                          formatter={(value) => (
                            <span className="money font-semibold text-foreground">
                              {formatMoney(Number(value))}
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="appropriation"
                      name="Approved budget"
                      radius={[9, 9, 9, 9]}
                      maxBarSize={52}
                    >
                      {chartData.map((item, index) => (
                        <Cell
                          key={index}
                          fill={
                            item.appropriation === largestAllocation
                              ? "var(--brand)"
                              : "var(--chart-muted)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No budget lines yet.
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-brand" />
                  Largest allocation highlighted
                </div>
                <span className="money text-xs font-semibold text-secondary">
                  Total {formatMoney(totals.appropriation)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="border-0 shadow-[0_4px_24px_rgba(18,29,35,.03)]">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-[20px] font-bold text-foreground">
                Recent vouchers
              </CardTitle>
              <Badge className="bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                {data.vouchers.length} total
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentVouchers.map((voucher, index) => (
                <Link
                  key={voucher.id}
                  href={`/disbursements?selected=${voucher.id}`}
                  className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${["bg-success-soft text-success", "bg-info-soft text-info", "bg-brand-soft text-brand-ink", "bg-violet-soft text-violet", "bg-muted text-muted-foreground"][index % 5]}`}
                  >
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-foreground">
                      {voucher.payee}
                    </div>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">
                      {voucher.number} · {voucher.purpose}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="money whitespace-nowrap text-[12px] font-bold text-foreground">
                      {formatMoney(voucher.amount)}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={voucher.status} />
                    </div>
                  </div>
                </Link>
              ))}
              <Button
                asChild
                variant="outline"
                className="mt-3 w-full rounded-full border-border text-xs font-semibold text-secondary"
              >
                <Link href="/disbursements">
                  All vouchers <ArrowRight size={14} />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_4px_24px_rgba(18,29,35,.03)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[20px] font-bold text-foreground">Budget health</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                How much of the appropriation is committed
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="money text-[38px] font-semibold tracking-tight text-foreground">
                  {utilization}%
                </span>
                <span className="mb-1 text-xs font-semibold text-muted-foreground">utilized</span>
              </div>
              <Progress value={utilization} className="mt-3 h-2.5 bg-muted [&>div]:bg-brand" />
              <div className="mt-4 flex justify-between text-[11px] text-muted-foreground">
                <span>Committed {formatMoney(totals.obligated)}</span>
                <span>{formatMoney(totals.available)} available</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_4px_24px_rgba(18,29,35,.03)]">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-[20px] font-bold text-foreground">
                Latest activity
              </CardTitle>
              <Link
                href="/audit"
                aria-label="View all activity"
                className="rounded-full border border-border p-2 text-muted-foreground hover:bg-background"
              >
                <ArrowUpRight size={15} />
              </Link>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.audit.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 border-b border-border py-3 last:border-0"
                >
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-brand-ink">
                    <CircleDollarSign size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-foreground">{event.action}</div>
                    <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
                      {event.subject} · {event.detail}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
