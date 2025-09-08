'use client';

import React from 'react';
import './NoProjectsPlaceholder.css';
import StarfieldWarp from '@/components/ui/StarfieldWarp';

export const NoProjectsPlaceholder = () => {
  const title = '새로운 프로젝트 생성';
  const subtitle = 'Navo AI가 아이디어를 현실로 만듭니다';

  return (
    <StarfieldWarp count={30} speed={0.5} milkyWayOpacity={0.6}>
      <div className="pulsating-orb" />
      <h2 className="glitch-text" data-text={title}>
        {title}
      </h2>
      <p className="sub-text">{subtitle}</p>
    </StarfieldWarp>
  );
};
