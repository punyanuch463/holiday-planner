"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TripForm from "@/components/trips/TripForm";

function NewTripContent() {
    const searchParams = useSearchParams();
    const date = searchParams.get("date") ?? "";

    return <TripForm initialDate={date} />;
}

export default function NewTripPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#fff7f2] p-10 text-center text-[#a18b7c]">
                    กำลังโหลด...
                </div>
            }
        >
            <NewTripContent />
        </Suspense>
    );
}