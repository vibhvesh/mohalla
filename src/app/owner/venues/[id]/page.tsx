import { Suspense } from "react";
import { OwnerManage } from "@/components/owner-manage";

export default function ManageVenuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading ground…</p>}>
      <OwnerManage />
    </Suspense>
  );
}
