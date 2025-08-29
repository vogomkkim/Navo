---
title: "문서 유지보수 가이드"
updated: "2025-08-29"
version: "1.0"
---

# 문서 시스템 개요

이 레포는 **5개 핵심 문서**로 구성된 유지보수 시스템을 사용합니다:

- `PROJECT_INDEX.md` - 문서 색인 및 운영 원칙
- `GOALS_IMMUTABLE.md` - 불변 목표 및 성공 기준
- `PLAN_MACRO.md` - 거시적 계획 (6개월 단위)
- `PLAN_MICRO.md` - 미시적 계획 (스프린트 단위)
- `STATUS_PROGRESS.md` - 현재 상태 및 진행 상황

# 반복 프롬프트 시스템

## 1. 스프린트 갱신(미시)
**대상**: `PLAN_MICRO.md` + `STATUS_PROGRESS.md`

- PLAN_MICRO.md: 스프린트 기간/목표/Top7 테이블 최신화
- STATUS_PROGRESS.md: KPI 수치/오늘 요약/Next 3/진행 로그 업데이트
- 장문 금지, 상대경로 링크만 사용
- 변경 diff + 단일 커밋 메시지 제안

## 2. 거시 플랜 롤업
**대상**: `PLAN_MACRO.md`

- Now/Next/Later를 현재 상태 기준으로 3줄씩 재정렬
- 로드맵 표(Epic/Goal/ETA/링크) 갱신
- 리스크·의존성 각 2줄 업데이트
- 변경 diff + 커밋 메시지 제안

## 3. 불변 목표 점검
**대상**: `GOALS_IMMUTABLE.md`

- 코드/지표와 대조해 불일치 시 ADR 필요 표시
- 본문 수정 금지, 상단에만 "⚠ ADR 필요:" 주석 추가
- 변경 diff + 커밋 메시지 제안

## 4. 정합성 감사 & 최소 패치
**대상**: 5개 파일 전체

- 코드/테스트/스키마와 불일치 5줄 이내 요약
- 수정 필요한 단락만 최소 패치 (삭제/링크치환 우선)
- 새 문서/편집 금지
- 변경 diff + 커밋 메시지 제안

## 5. 커서 AI 복기
**대상**: Cursor AI용 지시사항

- 5개 파일 읽고 목표/플랜/상태 복기
- 불일치/누락 5줄 요약 + next-3 제안
- facts_from: code, tests, schema, openapi
- never invent facts, propose tiny diffs

# 워크플로우 원칙

## 📋 읽기 전용 모드 (기본)
```
1. 파일 읽기 → 업데이트 로직 적용 → diff 출력
2. 사용자 승인 → 실제 파일 변경 + 커밋
3. 기준 데이터 절대 변경되지 않음
```

## 🎯 핵심 원칙
- ✅ **기준 데이터 보존**: 원본 파일 절대 직접 수정
- ✅ **투명성 보장**: 모든 변경사항 diff로 표시
- ✅ **사용자 승인**: "적용해" 명령 전까지 실제 변경 안 함
- ✅ **반복 가능성**: 언제든 같은 프롬프트 재사용 가능
- ✅ **최소 변경**: 장문 설명 대신 링크/측정치 위주

# 커밋 메시지 포맷

```bash
# 미시 업데이트
docs: update sprint W{n} - PLAN_MICRO.md + STATUS_PROGRESS.md

# 거시 업데이트
docs: update macro plan - PLAN_MACRO.md roadmap sync

# ADR 추가
docs: add ADR notice - GOALS_IMMUTABLE.md validation

# 정합성 패치
docs: patch inconsistencies - {files} alignment
```

# 사용 예시

```
사용자: "2) 반복 프롬프트 — 스프린트 갱신(미시)"
AI: [분석 진행...]
AI: 📋 변경사항 diff 표시
AI: "적용할까요? (y/n)"

사용자: "y"
AI: [실제 파일 변경 + 커밋]
```

이 시스템으로 문서의 일관성과 최신성을 유지합니다.
