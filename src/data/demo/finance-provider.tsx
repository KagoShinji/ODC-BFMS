"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BudgetLine,
  CashAdvance,
  Collection,
  Deposit,
  DepositAllocation,
  ExpenseCase,
  ExpenseKind,
  FinanceData,
  LiquidationEntry,
  Voucher,
} from "@/domain/types";
import { availableForLine, canSubmitVoucher, nextNumber, receiptUnmatched } from "@/domain/finance";
import { seedData } from "./seed";
import { formatMoney, todayManila } from "@/lib/utils";
import { useFeedback } from "@/components/layout/feedback-context";

const STORAGE_KEY = "odc-bfms-demo-v2";
type Result = { ok: true; id?: string } | { ok: false; error: string };
/** Demo actions finish immediately; live actions wait for the database. */
type Outcome = Result | Promise<Result>;
type NewCase = Pick<ExpenseCase, "kind" | "purpose" | "payee" | "budgetLineId" | "amount">;
type NewCollection = Pick<Collection, "payer" | "purpose" | "revenueCategory" | "amount">;

interface FinanceContextValue {
  data: FinanceData;
  loaded: boolean;
  preview: boolean;
  /** Live mode where this account records transactions in Supabase. */
  liveRecording: boolean;
  /** Live approver role can approve or reject submitted vouchers only. */
  liveApproval: boolean;
  /** Live treasurer role can record payments for approved vouchers only. */
  livePayment: boolean;
  resetDemo(): void;
  recordActivity(action: string, subject: string, detail: string): void;
  createCase(input: NewCase): Outcome;
  advanceCase(id: string): Outcome;
  createVoucher(caseId: string): Outcome;
  submitVoucher(id: string): Outcome;
  approveVoucher(id: string): Outcome;
  rejectVoucher(id: string): Outcome;
  recordPayment(id: string, reference: string): Outcome;
  createCollection(input: NewCollection): Outcome;
  voidCollection(id: string): Outcome;
  createDeposit(input: {
    kind: Deposit["kind"];
    bank: string;
    reference: string;
    allocations: DepositAllocation[];
  }): Outcome;
  openAdvance(voucherId: string): Outcome;
  recordLiquidation(input: {
    advanceId: string;
    kind: LiquidationEntry["kind"];
    description: string;
    amount: number;
  }): Outcome;
  addBudgetLine(input: Pick<BudgetLine, "code" | "name" | "category" | "appropriation">): Outcome;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function audit(data: FinanceData, action: string, subject: string, detail: string): FinanceData {
  return {
    ...data,
    audit: [
      {
        id: crypto.randomUUID(),
        action,
        subject,
        detail,
        at: new Date().toISOString(),
        actor: "Demo user",
      },
      ...data.audit,
    ],
  };
}

export function FinanceProvider({
  children,
  preview = false,
  initialData,
  liveRecording = false,
  liveApproval = false,
  livePayment = false,
}: {
  children: ReactNode;
  /** Live mode: shows `initialData`; changes are blocked unless `liveRecording`. */
  preview?: boolean;
  initialData?: FinanceData;
  /** Enables general live transaction recording; role-specific actions are separately authorized. */
  liveRecording?: boolean;
  /** Allows voucher approval actions for an approver without enabling other writes. */
  liveApproval?: boolean;
  /** Allows payment recording for a treasurer without enabling other writes. */
  livePayment?: boolean;
}) {
  const router = useRouter();
  const { confirm, success: showSuccess, error: showError } = useFeedback();
  const [data, setData] = useState<FinanceData>(initialData ?? seedData);
  const [loaded, setLoaded] = useState(preview);

  useEffect(() => {
    if (preview) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: FinanceData = JSON.parse(raw);
        if (
          parsed.schemaVersion === 2 &&
          Array.isArray(parsed.vouchers) &&
          Array.isArray(parsed.collections) &&
          Array.isArray(parsed.cashAdvances)
        )
          setData(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, [preview]);

  useEffect(() => {
    if (loaded && !preview) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded, preview]);
  const fail = useCallback(
    (error: string): Result => {
      showError({ title: "Unable to complete action", description: error });
      return { ok: false, error };
    },
    [showError],
  );
  const success = useCallback(
    (message: string, id?: string): Result => {
      showSuccess({ title: "Action completed", description: message });
      return { ok: true, id };
    },
    [showSuccess],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      data,
      loaded,
      preview,
      liveRecording: false,
      liveApproval: false,
      livePayment: false,
      resetDemo: () => {
        setData(seedData);
        success("Demo data restored.");
      },
      recordActivity(action, subject, detail) {
        setData((current) => audit(current, action, subject, detail));
      },
      createCase(input) {
        if (!input.purpose.trim() || !input.payee.trim()) return fail("Enter a purpose and payee.");
        if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
          return fail("Enter a valid amount.");
        if (!data.budgetLines.some((line) => line.id === input.budgetLineId))
          return fail("Choose a budget line.");
        if (input.amount > availableForLine(data, input.budgetLineId))
          return fail("The selected budget line has insufficient available appropriation.");
        const prefix = (
          {
            procurement: "PR",
            payroll: "PAY",
            recurring: "BILL",
            travel: "TO",
            transfer: "SK",
          } as const
        )[input.kind];
        const reference = nextNumber(
          prefix,
          data.expenseCases.map((item) => item.reference),
          data.fiscalYear,
        );
        const item: ExpenseCase = {
          ...input,
          id: crypto.randomUUID(),
          reference,
          step: input.kind === "procurement" ? "PR" : "Ready for DV",
          date: todayManila(),
        };
        setData((current) =>
          audit(
            { ...current, expenseCases: [item, ...current.expenseCases] },
            "Expense case created",
            reference,
            input.purpose,
          ),
        );
        return success(`${reference} created.`, item.id);
      },
      advanceCase(id) {
        const item = data.expenseCases.find((entry) => entry.id === id);
        if (!item || item.kind !== "procurement" || item.voucherId)
          return fail("This procurement record cannot advance.");
        const stages = ["PR", "RFQ", "PO", "AIR", "Ready for DV"] as const;
        const next = stages[stages.indexOf(item.step) + 1];
        if (!next) return fail("This procurement record is ready for a voucher.");
        setData((current) =>
          audit(
            {
              ...current,
              expenseCases: current.expenseCases.map((entry) =>
                entry.id === id ? { ...entry, step: next } : entry,
              ),
            },
            "Procurement advanced",
            item.reference,
            `${item.step} → ${next}`,
          ),
        );
        return success(`${item.reference} moved to ${next}.`);
      },
      createVoucher(caseId) {
        const item = data.expenseCases.find((entry) => entry.id === caseId);
        if (!item || item.step !== "Ready for DV" || item.voucherId)
          return fail("This expense case is not ready for a voucher.");
        const number = nextNumber(
          "DV",
          data.vouchers.map((voucher) => voucher.number),
          data.fiscalYear,
        );
        const voucher: Voucher = {
          id: crypto.randomUUID(),
          number,
          sourceCaseId: caseId,
          kind: item.kind,
          payee: item.payee,
          purpose: item.purpose,
          budgetLineId: item.budgetLineId,
          amount: item.amount,
          status: "draft",
          date: todayManila(),
          version: 1,
        };
        setData((current) =>
          audit(
            {
              ...current,
              expenseCases: current.expenseCases.map((entry) =>
                entry.id === caseId ? { ...entry, voucherId: voucher.id } : entry,
              ),
              vouchers: [voucher, ...current.vouchers],
            },
            "Voucher drafted",
            number,
            `From ${item.reference}`,
          ),
        );
        return success(`${number} drafted.`, voucher.id);
      },
      submitVoucher(id) {
        const item = data.vouchers.find((voucher) => voucher.id === id);
        if (!item) return fail("Voucher not found.");
        const error = canSubmitVoucher(data, item);
        if (error) return fail(error);
        setData((current) =>
          audit(
            {
              ...current,
              vouchers: current.vouchers.map((voucher) =>
                voucher.id === id
                  ? { ...voucher, status: "submitted", version: voucher.version + 1 }
                  : voucher,
              ),
            },
            "Voucher submitted",
            item.number,
            "Awaiting approval",
          ),
        );
        return success(`${item.number} submitted for approval.`);
      },
      approveVoucher(id) {
        const item = data.vouchers.find((voucher) => voucher.id === id);
        if (!item || item.status !== "submitted")
          return fail("Only submitted vouchers can be approved.");
        setData((current) =>
          audit(
            {
              ...current,
              vouchers: current.vouchers.map((voucher) =>
                voucher.id === id
                  ? { ...voucher, status: "approved", version: voucher.version + 1 }
                  : voucher,
              ),
            },
            "Voucher approved",
            item.number,
            "Ready for payment",
          ),
        );
        return success(`${item.number} approved.`);
      },
      rejectVoucher(id) {
        const item = data.vouchers.find((voucher) => voucher.id === id);
        if (!item || item.status !== "submitted")
          return fail("Only submitted vouchers can be rejected.");
        setData((current) =>
          audit(
            {
              ...current,
              vouchers: current.vouchers.map((voucher) =>
                voucher.id === id
                  ? { ...voucher, status: "rejected", version: voucher.version + 1 }
                  : voucher,
              ),
            },
            "Voucher rejected",
            item.number,
            "Rejected in demo workflow",
          ),
        );
        return success(`${item.number} rejected.`);
      },
      recordPayment(id, reference) {
        const item = data.vouchers.find((voucher) => voucher.id === id);
        if (!item || item.status !== "approved") return fail("Only approved vouchers can be paid.");
        if (!reference.trim()) return fail("Enter a payment reference.");
        setData((current) =>
          audit(
            {
              ...current,
              vouchers: current.vouchers.map((voucher) =>
                voucher.id === id
                  ? {
                      ...voucher,
                      status: "paid",
                      paidAt: todayManila(),
                      paymentReference: reference.trim(),
                      version: voucher.version + 1,
                    }
                  : voucher,
              ),
            },
            "Payment recorded",
            item.number,
            `Reference ${reference.trim()}`,
          ),
        );
        return success(`Payment for ${item.number} recorded.`);
      },
      createCollection(input) {
        if (!input.payer.trim() || !input.purpose.trim()) return fail("Enter a payer and purpose.");
        if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
          return fail("Enter a valid collection amount.");
        const receiptNumber = nextNumber(
          "OR",
          data.collections.map((item) => item.receiptNumber),
          data.fiscalYear,
        );
        const item: Collection = {
          ...input,
          id: crypto.randomUUID(),
          receiptNumber,
          date: todayManila(),
          status: "issued",
        };
        setData((current) =>
          audit(
            { ...current, collections: [item, ...current.collections] },
            "Receipt issued",
            receiptNumber,
            input.purpose,
          ),
        );
        return success(`${receiptNumber} issued.`, item.id);
      },
      voidCollection(id) {
        const item = data.collections.find((collection) => collection.id === id);
        if (!item || item.status !== "issued") return fail("This receipt cannot be voided.");
        if (receiptUnmatched(data, id) !== item.amount)
          return fail("This receipt is linked to a deposit and cannot be voided here.");
        setData((current) =>
          audit(
            {
              ...current,
              collections: current.collections.map((collection) =>
                collection.id === id ? { ...collection, status: "voided" } : collection,
              ),
            },
            "Receipt voided",
            item.receiptNumber,
            "Voided in demo workflow",
          ),
        );
        return success(`${item.receiptNumber} voided.`);
      },
      createDeposit(input) {
        if (!input.bank.trim() || !input.reference.trim())
          return fail("Enter a destination and deposit/remittance reference.");
        if (
          data.deposits.some(
            (item) =>
              item.kind === input.kind &&
              item.reference.toLowerCase() === input.reference.trim().toLowerCase(),
          )
        )
          return fail("This deposit/remittance reference already exists.");
        if (!input.allocations.length) return fail("Select at least one receipt.");
        const seen = new Set<string>();
        for (const allocation of input.allocations) {
          if (seen.has(allocation.collectionId))
            return fail("A receipt cannot appear twice in a deposit.");
          seen.add(allocation.collectionId);
          if (
            !Number.isSafeInteger(allocation.amount) ||
            allocation.amount <= 0 ||
            allocation.amount > receiptUnmatched(data, allocation.collectionId)
          )
            return fail("An allocation exceeds its receipt's remaining balance.");
        }
        const amount = input.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
        const number = nextNumber(
          input.kind === "deposit" ? "DEP" : "REM",
          data.deposits.map((deposit) => deposit.number),
          data.fiscalYear,
        );
        const deposit: Deposit = {
          ...input,
          id: crypto.randomUUID(),
          number,
          date: todayManila(),
          amount,
          status: "confirmed",
        };
        setData((current) =>
          audit(
            { ...current, deposits: [deposit, ...current.deposits] },
            input.kind === "deposit" ? "Deposit confirmed" : "Remittance confirmed",
            number,
            `${input.allocations.length} receipt(s) matched`,
          ),
        );
        return success(`${number} confirmed.`, deposit.id);
      },
      openAdvance(voucherId) {
        const voucher = data.vouchers.find((item) => item.id === voucherId);
        if (!voucher || voucher.status !== "paid" || voucher.kind !== "travel")
          return fail("Choose a paid travel voucher to open a cash advance.");
        if (data.cashAdvances.some((item) => item.voucherId === voucherId))
          return fail("A cash advance is already linked to this voucher.");
        const advance: CashAdvance = {
          id: crypto.randomUUID(),
          voucherId,
          accountablePerson: voucher.payee,
          amount: voucher.amount,
          openedAt: todayManila(),
        };
        setData((current) =>
          audit(
            { ...current, cashAdvances: [advance, ...current.cashAdvances] },
            "Cash advance opened",
            voucher.number,
            voucher.payee,
          ),
        );
        return success(`Cash advance opened for ${voucher.number}.`, advance.id);
      },
      recordLiquidation(input) {
        const advance = data.cashAdvances.find((item) => item.id === input.advanceId);
        if (!advance) return fail("Cash advance not found.");
        if (!input.description.trim() || !Number.isSafeInteger(input.amount) || input.amount <= 0)
          return fail("Enter a description and valid amount.");
        const used = data.liquidationEntries
          .filter((item) => item.advanceId === input.advanceId)
          .reduce((sum, item) => sum + item.amount, 0);
        if (used + input.amount > advance.amount)
          return fail("This entry exceeds the remaining advance balance.");
        const entry: LiquidationEntry = {
          ...input,
          id: crypto.randomUUID(),
          description: input.description.trim(),
          date: todayManila(),
        };
        const voucher = data.vouchers.find((item) => item.id === advance.voucherId);
        setData((current) =>
          audit(
            { ...current, liquidationEntries: [entry, ...current.liquidationEntries] },
            input.kind === "refund" ? "Advance refund recorded" : "Liquidation expense recorded",
            voucher?.number ?? "Advance",
            input.description.trim(),
          ),
        );
        return success(
          `${input.kind === "refund" ? "Refund" : "Liquidation expense"} recorded.`,
          entry.id,
        );
      },
      addBudgetLine(input) {
        if (!input.code.trim() || !input.name.trim()) return fail("Enter a code and name.");
        if (!Number.isSafeInteger(input.appropriation) || input.appropriation <= 0)
          return fail("Enter a valid appropriation.");
        if (
          data.budgetLines.some(
            (line) => line.code.toLowerCase() === input.code.trim().toLowerCase(),
          )
        )
          return fail("This budget code already exists.");
        const line: BudgetLine = {
          ...input,
          id: crypto.randomUUID(),
          code: input.code.trim(),
          name: input.name.trim(),
          fund: "General Fund",
          color: "#f56618",
        };
        setData((current) =>
          audit(
            { ...current, budgetLines: [...current.budgetLines, line] },
            "Budget line added",
            line.code,
            line.name,
          ),
        );
        return success(`${line.code} added to the budget.`, line.id);
      },
    }),
    [data, loaded, preview, fail, success],
  );

  const providerValue = useMemo<FinanceContextValue>(() => {
    if (!preview) return value;
    const live = initialData ?? value.data;
    const blocked = (): Result =>
      fail("Read-only: recording transactions is not enabled for your account.");
    const record =
      <A extends unknown[]>(
        action: string,
        message: string,
        toArgs: (...input: A) => object,
        allowApprover = false,
        allowTreasurer = false,
      ) =>
      async (...input: A): Promise<Result> => {
        if (
          !liveRecording &&
          !(allowApprover && liveApproval) &&
          !(allowTreasurer && livePayment)
        )
          return blocked();
        try {
          const response = await fetch("/api/finance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, args: toArgs(...input) }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) return fail(result.error || "The transaction could not be recorded.");
          router.refresh();
          return success(message, result.id);
        } catch {
          return fail("The server could not be reached. Try again.");
        }
      };
    const version = (id: string) => live.vouchers.find((voucher) => voucher.id === id)?.version;
    return {
      ...value,
      data: live,
      loaded: true,
      liveRecording,
      liveApproval,
      livePayment,
      resetDemo: () => {
        fail("Live records cannot be reset from the workspace.");
      },
      recordActivity: () => {},
      addBudgetLine: record("addBudgetLine", "Budget line added.", (input) => input),
      createCase: record("createCase", "Expense case created.", (input) => input),
      advanceCase: record("advanceCase", "Moved to the next stage.", (id: string) => ({ id })),
      createVoucher: record("createVoucher", "Voucher drafted.", (id: string) => ({ id })),
      submitVoucher: record("submitVoucher", "Voucher submitted for approval.", (id: string) => ({
        id,
        version: version(id),
      })),
      approveVoucher: record("approveVoucher", "Voucher approved.", (id: string) => ({
        id,
        version: version(id),
      }), true),
      rejectVoucher: record("rejectVoucher", "Voucher rejected.", (id: string) => ({
        id,
        version: version(id),
      }), true),
      recordPayment: record(
        "recordPayment",
        "Payment recorded.",
        (id: string, reference: string) => ({ id, version: version(id), reference }),
        false,
        true,
      ),
      createCollection: record("createCollection", "Receipt issued.", (input) => input),
      voidCollection: record("voidCollection", "Receipt voided.", (id: string) => ({ id })),
      createDeposit: record("createDeposit", "Deposit or remittance confirmed.", (input) => input),
      openAdvance: record("openAdvance", "Cash advance opened.", (voucherId: string) => ({
        voucherId,
      })),
      recordLiquidation: record(
        "recordLiquidation",
        "Liquidation entry recorded.",
        (input) => input,
      ),
    };
  }, [value, preview, fail, success, initialData, liveRecording, liveApproval, livePayment, router]);

  const confirmedValue = useMemo<FinanceContextValue>(() => {
    const records = providerValue.data;
    const voucher = (id: string) => records.vouchers.find((item) => item.id === id);
    const run = async (
      title: string,
      description: string,
      confirmLabel: string,
      action: () => Outcome,
      destructive = false,
      roleAuthorized = false,
    ): Promise<Result> => {
      if (providerValue.preview && !providerValue.liveRecording && !roleAuthorized)
        return fail("Read-only: recording transactions is not enabled for your account.");
      if (!(await confirm({ title, description, confirmLabel, destructive })))
        return { ok: false, error: "Action cancelled." };
      return action();
    };
    return {
      ...providerValue,
      addBudgetLine: (input) =>
        run(
          "Add budget line?",
          `Add ${input.code} · ${input.name} with an appropriation of ${formatMoney(input.appropriation)}?`,
          "Add budget line",
          () => providerValue.addBudgetLine(input),
        ),
      createCase: (input) =>
        run(
          "Create expense case?",
          `Create this expense for ${input.payee} totaling ${formatMoney(input.amount)}?`,
          "Create case",
          () => providerValue.createCase(input),
        ),
      advanceCase: (id) =>
        run(
          "Complete procurement stage?",
          `Move ${records.expenseCases.find((item) => item.id === id)?.reference ?? "this purchase"} to its next document stage?`,
          "Complete stage",
          () => providerValue.advanceCase(id),
        ),
      createVoucher: (id) =>
        run(
          "Create disbursement voucher?",
          "Prepare a draft voucher linked to this expense case?",
          "Create voucher",
          () => providerValue.createVoucher(id),
        ),
      submitVoucher: (id) =>
        run(
          "Submit voucher for review?",
          `Submit ${voucher(id)?.number ?? "this voucher"} for ${formatMoney(voucher(id)?.amount ?? 0)}? Its amount will count against the available budget.`,
          "Submit voucher",
          () => providerValue.submitVoucher(id),
        ),
      approveVoucher: (id) =>
        run(
          "Approve voucher?",
          `Approve ${voucher(id)?.number ?? "this voucher"} for ${voucher(id)?.payee ?? "the payee"}, totaling ${formatMoney(voucher(id)?.amount ?? 0)}? It will be ready for payment.`,
          "Approve voucher",
          () => providerValue.approveVoucher(id),
          false,
          providerValue.liveApproval,
        ),
      rejectVoucher: (id) =>
        run(
          "Reject voucher?",
          `Reject ${voucher(id)?.number ?? "this voucher"}? The current workflow requires a new expense case for a corrected request.`,
          "Reject voucher",
          () => providerValue.rejectVoucher(id),
          true,
          providerValue.liveApproval,
        ),
      recordPayment: (id, reference) => {
        if (!reference.trim()) return fail("Enter a payment reference.");
        return run(
          "Record payment?",
          `Record the full ${formatMoney(voucher(id)?.amount ?? 0)} payment for ${voucher(id)?.number ?? "this voucher"} using reference ${reference.trim()}?`,
          "Record payment",
          () => providerValue.recordPayment(id, reference),
          false,
          providerValue.livePayment,
        );
      },
      createCollection: (input) =>
        run(
          "Issue collection receipt?",
          `Record ${formatMoney(input.amount)} collected from ${input.payer} and issue its receipt?`,
          "Issue receipt",
          () => providerValue.createCollection(input),
        ),
      voidCollection: (id) =>
        run(
          "Void receipt?",
          `Void ${records.collections.find((item) => item.id === id)?.receiptNumber ?? "this receipt"}? The void remains in the receipt history.`,
          "Void receipt",
          () => providerValue.voidCollection(id),
          true,
        ),
      createDeposit: (input) =>
        run(
          input.kind === "deposit" ? "Confirm bank deposit?" : "Confirm treasury remittance?",
          `Match ${formatMoney(input.allocations.reduce((sum, item) => sum + item.amount, 0))} to ${input.bank} using reference ${input.reference}?`,
          "Confirm batch",
          () => providerValue.createDeposit(input),
        ),
      openAdvance: (id) =>
        run(
          "Open cash advance?",
          `Track ${formatMoney(voucher(id)?.amount ?? 0)} from ${voucher(id)?.number ?? "this paid travel voucher"} as an accountable advance for ${voucher(id)?.payee ?? "the payee"}?`,
          "Open advance",
          () => providerValue.openAdvance(id),
        ),
      recordLiquidation: (input) =>
        run(
          input.kind === "refund" ? "Record cash refund?" : "Record accepted expense?",
          `Apply ${formatMoney(input.amount)} to this advance using evidence reference “${input.description}”?`,
          "Record entry",
          () => providerValue.recordLiquidation(input),
        ),
    };
  }, [providerValue, confirm, fail]);

  return <FinanceContext.Provider value={confirmedValue}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within FinanceProvider");
  return context;
}
