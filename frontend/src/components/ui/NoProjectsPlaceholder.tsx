'use client';

import React from 'react';
import './NoProjectsPlaceholder.css';

export const NoProjectsPlaceholder = () => {
  const title = "새로운 프로젝트 생성";
  const subtitle = "Navo AI가 아이디어를 현실로 만듭니다";

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
