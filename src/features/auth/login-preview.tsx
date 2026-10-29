"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BrandMark, useBranding } from "@/components/layout/brand";
import styles from "./login.module.css";

const DashboardPreview = dynamic(() => import("./login-dashboard-preview"), { ssr: false });

export function LoginPreview({ barangayName }: { barangayName?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => setVisible(desktop.matches);
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  return (
    <div className={styles.preview} aria-hidden="true" inert>
      <div className={styles.previewToolbar}>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c4cac7]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#d1d6d3]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#dce0dd]" />
        </div>
        <span className="text-[10px] tracking-wide text-[#7c8781]">
          Dashboard preview · Sample data
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      </div>
      {visible && <DashboardPreview barangayName={barangayName} />}
    </div>
  );
}

export function LoginBrand() {
  const branding = useBranding();

  return (
    <div className={styles.brand}>
      <BrandMark />
      <div className="min-w-0">
        <p className={styles.brandName}>{branding.appName}</p>
        {branding.organizationName && (
          <p className={styles.brandOrganization}>by {branding.organizationName}</p>
        )}
      </div>
    </div>
  );
}
