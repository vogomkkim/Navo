export interface ResolveNodeLike {
  id: string;
  name: string; // file name with extension
  nodeType: 'FILE' | 'DIRECTORY';
  metadata?: { path?: string };
}

export interface ResolvedPageResult {
  nodeId: string | null;
  score: number;
  matchedName?: string;
  candidates: Array<{
    nodeId: string;
    score: number;
    name: string;
    path: string;
  }>; // sorted desc
}

// Basic Korean → canonical route name synonyms
const SYNONYMS: Record<string, string[]> = {
  home: [
    '첫화면',
    '처음',
    '메인',
    '기본',
    '홈',
    '메인화면',
    '첫 화면',
    '기본화면',
  ],
  index: ['인덱스'],
  login: ['로그인', 'login', 'sign in', '로그인화면'],
  signup: ['회원가입', '가입', 'sign up', 'register', '회원가입화면'],
  quiz: ['퀴즈', '문제', 'quiz'],
  result: ['정답', '결과', 'result', '채점'],
  list: ['목록', '리스트', 'list'],
  stats: ['통계', 'statistics', 'stats', '분석'],
  score: ['점수', 'score'],
  profile: ['프로필', '마이페이지', '계정', 'profile'],
  settings: ['설정', '세팅', '환경설정', 'settings'],
  search: ['검색', 'search'],
  cart: ['장바구니', 'cart'],
  checkout: ['결제', 'checkout', '구매'],
  dashboard: ['대시보드', 'dashboard'],
};

const EXT_WEIGHT: Record<string, number> = {
  tsx: 3,
  jsx: 3,
  ts: 1,
  js: 1,
  html: 1,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.(tsx|jsx|ts|js|html)$/i, '')
    .replace(/[^a-z0-9가-힣/_-]+/gi, ' ')
    .trim();
}

function splitSegments(pathOrName: string): string[] {
  return normalize(pathOrName)
    .split(/[\s/_-]+/)
    .filter(Boolean);
}

function synonymsFor(utterance: string): string[] {
  const result: string[] = [];
  const low = normalize(utterance);
  Object.entries(SYNONYMS).forEach(([canon, words]) => {
    if (words.some((w) => low.includes(normalize(w)))) {
      result.push(canon);
    }
  });
  // direct tokens also included
  result.push(...splitSegments(low));
  return Array.from(new Set(result));
}

function depthOf(path: string | undefined): number {
  if (!path) return 999;
  const parts = path.split('/').filter(Boolean);
  return parts.length;
}

export function resolveTargetPage(
  utterance: string,
  nodes: ResolveNodeLike[]
): ResolvedPageResult {
  const tokens = synonymsFor(utterance);

  const candidates = nodes
    .filter((n) => n.nodeType === 'FILE')
    .map((n) => {
      const name = n.name;
      const fullPath = n.metadata?.path || name;
      const base = normalize(name);
      const pathNorm = normalize(fullPath);
      const segs = new Set([
        ...splitSegments(base),
        ...splitSegments(pathNorm),
      ]);

      // extension weight
      const extMatch = name.match(/\.(tsx|jsx|ts|js|html)$/i);
      const ext = (extMatch?.[1] || '').toLowerCase();
      let score = EXT_WEIGHT[ext] ?? 0;

      // exact canonical matches
      if (segs.has('home')) score += 8;
      if (segs.has('index')) score += 6;

      // token matches
      tokens.forEach((t) => {
        if (!t) return;
        if (segs.has(t)) score += 5;
        else if (pathNorm.includes(t) || base.includes(t)) score += 2;
      });

      // root depth bonus
      const depth = depthOf(n.metadata?.path);
      if (depth <= 1) score += 3;
      else if (depth === 2) score += 1;

      return { nodeId: n.id, score, name, path: fullPath };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? null;
  return {
    nodeId: best?.nodeId ?? null,
    score: best?.score ?? 0,
    matchedName: best?.name,
    candidates,
  };
}
