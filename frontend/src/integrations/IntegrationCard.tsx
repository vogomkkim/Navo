// frontend/src/integrations/IntegrationCard.tsx
"use client";

import React from "react";

interface IntegrationCardProps {
  service: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    isConnected: boolean;
    connectedAt?: string;
  };
  onConnect: () => void;
  onDisconnect: () => void;
}

export function IntegrationCard({
  service,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1.5rem",
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>{service.icon}</div>
        <div>
          <h4 style={{ margin: 0, color: "#333", fontSize: "1.1rem" }}>
            {service.name}
          </h4>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#666",
              fontSize: "0.9rem",
            }}
          >
            {service.description}
          </p>
          {service.isConnected && service.connectedAt && (
            <p
              style={{
                margin: "0.25rem 0 0 0",
                color: "#10b981",
                fontSize: "0.8rem",
              }}
            >
              연동됨: {new Date(service.connectedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div>
        {service.isConnected ? (
          <button
            onClick={onDisconnect}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "1px solid #dc2626",
              background: "#fff",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            연동 해제
          </button>
        ) : (
          <button
            onClick={onConnect}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "none",
              background: "#4f46e5",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            연동하기
          </button>
        )}
      </div>
    </div>
  );
}
