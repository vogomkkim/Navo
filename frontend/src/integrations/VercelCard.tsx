// frontend/src/integrations/VercelCard.tsx
"use client";

import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { IntegrationCard } from "./IntegrationCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface VercelStatus {
  isConnected: boolean;
  connectedAt?: string;
  teamId?: string;
  teamName?: string;
}

export function VercelCard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: vercelStatus, isLoading } = useQuery<VercelStatus>({
    queryKey: ["vercel-integration-status"],
    queryFn: () => fetchApi("/api/vercel/status", { token }),
    enabled: !!token,
    // Set a default value to prevent undefined errors during initial render
    initialData: { isConnected: false },
  });

  const handleConnect = () => {
    window.location.href = "/api/vercel/auth";
  };

  const handleDisconnect = async () => {
    if (!token) return;

    try {
      // For now, we assume the disconnect API exists as per the guide.
      // If not, this will fail gracefully and the user will be alerted.
      // A useMutation hook would be more robust here.
      await fetchApi("/api/vercel/disconnect", {
        method: "DELETE",
        token,
      });

      alert("Vercel 연동이 해제되었습니다.");
      // Refetch the status to update the UI
      queryClient.invalidateQueries({
        queryKey: ["vercel-integration-status"],
      });
    } catch (error) {
      console.error("Vercel 연동 해제 실패:", error);
      alert("연동 해제에 실패했습니다.");
    }
  };

  const vercelService = {
    id: "vercel",
    name: "Vercel",
    description: "프로젝트를 Vercel에 자동 배포하고 관리합니다.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    isConnected: vercelStatus?.isConnected ?? false,
    connectedAt: vercelStatus?.connectedAt,
  };

  if (isLoading) {
    return (
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "1.5rem",
          backgroundColor: "#f9f9f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ color: "#666" }}>연동 상태를 확인하는 중...</div>
      </div>
    );
  }

  return (
    <IntegrationCard
      service={vercelService}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
}
