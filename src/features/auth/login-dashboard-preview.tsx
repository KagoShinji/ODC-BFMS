"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FinanceProvider } from "@/data/demo/finance-provider";
import { seedData } from "@/data/demo/seed";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import styles from "./login.module.css";

/** The real dashboard and shell, isolated from stored or live financial records. */
export default function LoginDashboardPreview({ barangayName }: { barangayName?: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1440));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewport} className={styles.previewViewport}>
      {scale > 0 && (
        <div className={styles.dashboardCanvas} style={{ transform: `scale(${scale})` }}>
          <FinanceProvider
            preview
            initialData={{ ...seedData, barangay: barangayName || seedData.barangay }}
          >
            <AppShell
              illustration
              account={{ mode: "demo", level: "superadmin", adminBarangayIds: [], barangayIds: [] }}
            >
              <DashboardView />
            </AppShell>
          </FinanceProvider>
        </div>
      )}
    </div>
  );
}
