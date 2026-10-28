"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Check, FileText, Plus, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { availableForLine } from "@/domain/finance";
import { kindLabel } from "@/domain/types";
import { displayDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PageHeading,
  SearchField,
  StatusBadge,
  tableClass,
  tdClass,
  thClass,
} from "@/components/financial/shared";

export function DisbursementsView() {
  const { data, submitVoucher, approveVoucher, rejectVoucher, recordPayment } = useFinance();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("selected");
    if (id) setSelectedId(id);
  }, []);
  const selected = data.vouchers.find((item) => item.id === selectedId);
  const rows = data.vouchers.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.number} ${item.payee} ${item.purpose}`.toLowerCase().includes(query.toLowerCase()),
  );
  function pay() {
    if (!selected) return;
    const result = recordPayment(selected.id, paymentReference);
    if (result.ok) setPaymentReference("");
  }
  return (
    <>
      <PageHeading
        eyebrow="SPENDING · DISBURSEMENT"
        title="Disbursement vouchers"
        description="Review supporting cases, check budget coding, approve, and record authorized payments."
        action={
          <Button asChild variant="accent">
            <Link href="/spending">
              <Plus size={16} /> New expense case
            </Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "For review",
            value: data.vouchers.filter((item) => item.status === "submitted").length,
            color: "#dd8a37",
          },
          {
            label: "Ready for payment",
            value: data.vouchers.filter((item) => item.status === "approved").length,
            color: "#539270",
          },
          {
            label: "Paid vouchers",
            value: data.vouchers.filter((item) => item.status === "paid").length,
            color: "#5882a3",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-[12px] font-semibold text-[#86949d]">{item.label}</div>
                <div className="money mt-1 text-2xl font-bold text-[#1e3344]">{item.value}</div>
              </div>
              <div className="h-10 w-1 rounded-full" style={{ backgroundColor: item.color }} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Voucher register</CardTitle>
            <p className="mt-1 text-xs text-[#95a0a7]">
              Select a voucher to view its linked source and next action.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchField value={query} onChange={setQuery} placeholder="Search vouchers..." />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="h-10 rounded-lg border border-[#d9dedf] bg-white px-3 text-xs text-[#4d6070]"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Voucher / purpose</th>
                <th className={thClass}>Payee</th>
                <th className={thClass}>Source</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="cursor-pointer hover:bg-[#fdf8f3]"
                >
                  <td className={tdClass}>
                    <div className="font-bold text-[#2d4352]">{item.number}</div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-[#92a0a7]">
                      {item.purpose}
                    </div>
                  </td>
                  <td className={tdClass}>{item.payee}</td>
                  <td className={tdClass}>{kindLabel[item.kind]}</td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`${tdClass} money text-right font-bold text-[#2d4352]`}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className={tdClass}>
                    <ArrowRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-sm text-[#8d999f]">
              No vouchers match your filters.
            </p>
          )}
        </div>
      </Card>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#10202f]/45"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Voucher ${selected.number}`}
            className="odc-scrollbar h-full w-full max-w-[520px] overflow-y-auto bg-[#fffdf9] p-5 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#ee6a22]">
                  DISBURSEMENT VOUCHER
                </div>
                <h2 className="mt-2 text-2xl font-bold text-[#1a3041]">{selected.number}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedId(null)}
                aria-label="Close voucher"
              >
                <X size={20} />
              </Button>
            </div>
            <div className="mt-4">
              <StatusBadge status={selected.status} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 rounded-xl bg-[#f6f4ef] p-5">
              <div>
                <div className="text-[11px] text-[#89969d]">Payee</div>
                <div className="mt-1 text-sm font-bold text-[#283d4c]">{selected.payee}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#89969d]">Amount</div>
                <div className="money mt-1 text-lg font-bold text-[#243c4c]">
                  {formatMoney(selected.amount)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#89969d]">Date</div>
                <div className="mt-1 text-sm font-semibold">{displayDate(selected.date)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#89969d]">Source type</div>
                <div className="mt-1 text-sm font-semibold">{kindLabel[selected.kind]}</div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#92a0a6]">
                  Purpose
                </div>
                <p className="mt-1 text-sm text-[#405666]">{selected.purpose}</p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#92a0a6]">
                  Source document
                </div>
                <p className="mt-1 text-sm font-semibold text-[#405666]">
                  {data.expenseCases.find((item) => item.id === selected.sourceCaseId)?.reference ??
                    "—"}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#92a0a6]">
                  Budget line
                </div>
                <p className="mt-1 text-sm font-semibold text-[#405666]">
                  {data.budgetLines.find((line) => line.id === selected.budgetLineId)?.name ?? "—"}
                </p>
                <p className="mt-1 text-xs text-[#88979f]">
                  Available to commit: {formatMoney(availableForLine(data, selected.budgetLineId))}
                </p>
              </div>
              {selected.paymentReference && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#92a0a6]">
                    Payment reference
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#405666]">
                    {selected.paymentReference}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8 border-t border-[#e4e7e4] pt-5">
              <div className="mb-3 text-xs font-bold text-[#324b5b]">Next action</div>
              {selected.status === "draft" && (
                <Button
                  variant="accent"
                  className="w-full"
                  onClick={() => submitVoucher(selected.id)}
                >
                  Submit for review <ArrowRight size={16} />
                </Button>
              )}
              {selected.status === "submitted" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => rejectVoucher(selected.id)}>
                    Reject
                  </Button>
                  <Button variant="accent" onClick={() => approveVoucher(selected.id)}>
                    <Check size={15} /> Approve
                  </Button>
                </div>
              )}
              {selected.status === "approved" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#586c79]">
                    Check / payment reference
                    <Input
                      className="mt-1.5"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="e.g. CHK-00188"
                    />
                  </label>
                  <Button className="w-full" onClick={pay}>
                    <Banknote size={15} /> Record payment
                  </Button>
                </div>
              )}
              {selected.status === "paid" && (
                <p className="rounded-lg bg-[#ebf5ee] p-3 text-xs text-[#3e7a56]">
                  Payment recorded on {displayDate(selected.paidAt ?? selected.date)}.
                </p>
              )}
              {selected.status === "rejected" && (
                <p className="rounded-lg bg-[#fff0ef] p-3 text-xs text-[#a8534d]">
                  This demo voucher was rejected. Create a new expense case to revise the request.
                </p>
              )}
            </div>
            <div className="mt-5 rounded-lg border border-[#e9e7e1] p-3 text-[11px] leading-5 text-[#8c999e]">
              Demo approval and payment actions illustrate the workflow. Production permissions,
              evidence and posting controls are defined in the implementation plan.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
