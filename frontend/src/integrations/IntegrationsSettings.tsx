// frontend/src/integrations/IntegrationsSettings.tsx
"use client";

import React from "react";
import { IntegrationCard } from "./IntegrationCard";
import { VercelCard } from "./VercelCard";

export function IntegrationsSettings() {
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h3 style={{ marginTop: 0, color: "#333", marginBottom: "1.5rem" }}>
        연동 서비스 관리
      </h3>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>
        외부 서비스를 연동하여 프로젝트 배포와 관리를 자동화할 수 있습니다.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <VercelCard />
        {/* 향후 다른 연동 서비스들 추가 예정 */}
      </div>
    </div>
  );
}
