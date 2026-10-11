import { Suspense } from "react";
import { PaymentsView } from "@/components/PaymentsView";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="card h-64 animate-pulse" />}>
      <PaymentsView />
    </Suspense>
  );
}
