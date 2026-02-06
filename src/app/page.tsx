"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ResearchForm from "@/components/ResearchForm";
import Spinner from "@/components/Spinner";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New Research</h1>
        <p className="mt-2 text-gray-600">
          Enter a topic and Pulse will research it across Reddit and X using AI.
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ResearchForm />
      </div>
    </div>
  );
}
