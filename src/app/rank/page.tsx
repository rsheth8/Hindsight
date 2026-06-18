import { Suspense } from "react";
import { RankView } from "@/components/RankView";

export default function RankPage() {
  return (
    <Suspense fallback={null}>
      <RankView />
    </Suspense>
  );
}
