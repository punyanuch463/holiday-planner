
import { Suspense } from "react";
import TripDetailContent from "./TripDetailContent";

export default function TripDetailPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#fff7f2] p-10 text-center text-[#a18b7c]">
                    กำลังโหลดข้อมูลทริป... 🌷
                </main>
            }
        >
            <TripDetailContent />
        </Suspense>
    );
}
