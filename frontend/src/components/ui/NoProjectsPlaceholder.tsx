'use client';

import React from 'react';
import './NoProjectsPlaceholder.css';

export const NoProjectsPlaceholder = () => {
  const title = "새로운 프로젝트 생성";
  const subtitle = "채팅을 통해 창조를 시작하세요";

  return (
    <div className="placeholder-container">
      <div className="pulsating-orb" />
      <h2 className="glitch-text" data-text={title}>
        {title}
      </h2>
      <p className="sub-text">{subtitle}</p>
    </div>
  );
};
