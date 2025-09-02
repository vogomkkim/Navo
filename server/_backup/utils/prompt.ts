import createDOMPurify from 'dompurify';

const purify = createDOMPurify();

export function buildNlToComponentPrompt(description: string): string {
  return `You are a UI component generator for a low-code website builder.
Given the user's natural language description, produce a SINGLE component definition as compact JSON.
Constraints:
- Output ONLY pure JSON, no backticks, no explanations.
- Use mustache-style placeholders in HTML template: {{id}}, {{propName}}.
- Keep HTML semantic and accessible.
- Include minimal, scoped CSS as one string (no <style> tag).
- props_schema must be a JSON Schema object describing editable props.

Required JSON shape:
{
  "name": string,
  "display_name": string,
  "description": string,
  "category": string,
  "props_schema": { "type": "object", "properties": {} },
  "render_template": string,
  "css_styles": string
}

User description:
${description}
`;
}

export function sanitizeLayout(layout: any): any {
  if (!layout) return layout;
  const sanitizedLayout = JSON.parse(JSON.stringify(layout));
  function traverse(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = purify.sanitize(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      }
    }
  }
  traverse(sanitizedLayout);
  return sanitizedLayout;
}

export function deriveProjectName(message: string): string {
  const keywords = extractProjectKeywords(message);
  if (keywords.length > 0) {
    const projectName = generateMeaningfulProjectName(keywords);
    return projectName.length > 20 ? projectName.slice(0, 20) : projectName;
  }
  const defaultNames = [
    '네오스페이스',
    '퓨처허브',
    '인노베이션존',
    '크리에이티브랩',
    '테크플로우',
    '디지털스튜디오',
    '아이디어팩토리',
    '스마트워크스',
    '클라우드네스트',
    '데이터허브',
    '코드스튜디오',
    '웹크래프트',
    '앱마스터',
    '디지털아트',
    '테크마스터',
    '매직랩',
    '크래프트존',
    '팩토리스페이스',
    '스튜디오허브',
    '플로우크래프트',
    '네오매직',
    '퓨처크래프트',
    '인노베이션매직',
    '크리에이티브매직',
    '테크크래프트',
  ];
  const timestamp = Date.now();
  const randomIndex = timestamp % defaultNames.length;
  return defaultNames[randomIndex];
}

export function extractProjectKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const keywords: string[] = [];
  if (lowerMessage.includes('sns') || lowerMessage.includes('소셜'))
    keywords.push('social');
  if (lowerMessage.includes('블로그')) keywords.push('blog');
  if (lowerMessage.includes('쇼핑') || lowerMessage.includes('커머스'))
    keywords.push('shop');
  if (lowerMessage.includes('퀴즈') || lowerMessage.includes('학습'))
    keywords.push('learn');
  if (lowerMessage.includes('게임')) keywords.push('game');
  if (lowerMessage.includes('채팅')) keywords.push('chat');
  if (lowerMessage.includes('결제')) keywords.push('payment');
  if (lowerMessage.includes('경매')) keywords.push('auction');
  if (lowerMessage.includes('로그인') || lowerMessage.includes('인증'))
    keywords.push('auth');
  if (lowerMessage.includes('프로필')) keywords.push('profile');
  if (lowerMessage.includes('게시물') || lowerMessage.includes('포스트'))
    keywords.push('post');
  if (lowerMessage.includes('댓글')) keywords.push('comment');
  if (lowerMessage.includes('피드')) keywords.push('feed');
  if (lowerMessage.includes('친구')) keywords.push('friend');
  if (lowerMessage.includes('실시간')) keywords.push('realtime');
  return keywords;
}

export function generateMeaningfulProjectName(keywords: string[]): string {
  const nameMap: { [key: string]: string[] } = {
    social: [
      '소셜커넥트',
      '소셜허브',
      '커뮤니티존',
      '소셜스페이스',
      '프렌드허브',
      '소셜매직',
      '커넥트존',
      '소셜팩토리',
      '프렌드스튜디오',
      '소셜크래프트',
    ],
    blog: [
      '블로그스페이스',
      '포스트허브',
      '스토리랩',
      '컨텐츠스튜디오',
      '블로그마스터',
      '스토리팩토리',
      '포스트크래프트',
      '블로그매직',
      '스토리존',
      '컨텐츠크래프트',
    ],
    shop: [
      '스마트쇼핑',
      '커머스허브',
      '쇼핑존',
      '마켓플레이스',
      '스토어랩',
      '쇼핑매직',
      '커머스크래프트',
      '스토어팩토리',
      '쇼핑스튜디오',
      '마켓크래프트',
    ],
    learn: [
      '러닝플로우',
      '에듀허브',
      '스터디존',
      '학습스페이스',
      '지식랩',
      '러닝매직',
      '에듀크래프트',
      '스터디팩토리',
      '학습스튜디오',
      '지식크래프트',
    ],
    game: [
      '게임존',
      '플레이허브',
      '엔터테인먼트랩',
      '게임스튜디오',
      '플레이존',
      '게임매직',
      '플레이크래프트',
      '게임팩토리',
      '엔터테인먼트스튜디오',
      '플레이크래프트',
    ],
    chat: [
      '채팅허브',
      '메시지존',
      '커뮤니케이션랩',
      '채팅스페이스',
      '톡허브',
      '채팅매직',
      '메시지크래프트',
      '톡팩토리',
      '채팅스튜디오',
      '메시지크래프트',
    ],
    payment: [
      '페이플로우',
      '결제허브',
      '파이낸스존',
      '페이스튜디오',
      '머니랩',
      '페이매직',
      '결제크래프트',
      '파이낸스팩토리',
      '페이스튜디오',
      '머니크래프트',
    ],
    auction: [
      '옥션프로',
      '경매허브',
      '비딩존',
      '옥션스페이스',
      '경매랩',
      '옥션매직',
      '경매크래프트',
      '비딩팩토리',
      '옥션스튜디오',
      '경매크래프트',
    ],
    auth: [
      '인증시스템',
      '시큐리티허브',
      '로그인존',
      '인증랩',
      '시큐리티존',
      '인증매직',
      '시큐리티크래프트',
      '로그인팩토리',
      '인증스튜디오',
      '시큐리티크래프트',
    ],
    profile: [
      '프로필허브',
      '유저존',
      '프로필스페이스',
      '유저랩',
      '프로필스튜디오',
      '프로필매직',
      '유저크래프트',
      '프로필팩토리',
      '유저스튜디오',
      '프로필크래프트',
    ],
    post: [
      '포스트쉐어',
      '포스트허브',
      '컨텐츠존',
      '포스트랩',
      '쉐어스페이스',
      '포스트매직',
      '컨텐츠크래프트',
      '쉐어팩토리',
      '포스트스튜디오',
      '컨텐츠크래프트',
    ],
    comment: [
      '댓글허브',
      '코멘트존',
      '댓글랩',
      '피드백허브',
      '코멘트스튜디오',
      '댓글매직',
      '코멘트크래프트',
      '피드백팩토리',
      '댓글스튜디오',
      '코멘트크래프트',
    ],
    feed: [
      '피드플로우',
      '피드허브',
      '스트림존',
      '피드랩',
      '플로우스페이스',
      '피드매직',
      '스트림크래프트',
      '플로우팩토리',
      '피드스튜디오',
      '스트림크래프트',
    ],
    friend: [
      '친구커넥트',
      '친구허브',
      '커넥트존',
      '친구랩',
      '커넥트스튜디오',
      '친구매직',
      '커넥트크래프트',
      '친구팩토리',
      '친구스튜디오',
      '커넥트크래프트',
    ],
    realtime: [
      '실시간허브',
      '리얼타임존',
      '실시간랩',
      '라이브허브',
      '리얼타임스페이스',
      '실시간매직',
      '라이브크래프트',
      '리얼타임팩토리',
      '실시간스튜디오',
      '라이브크래프트',
    ],
  };

  if (keywords.length === 1) {
    const names = nameMap[keywords[0]] || [`${keywords[0]}앱`];
    const timestamp = Date.now();
    const randomIndex = timestamp % names.length;
    return names[randomIndex];
  }

  if (keywords.length >= 2) {
    const primaryNames = nameMap[keywords[0]] || [keywords[0]];
    const secondaryNames = nameMap[keywords[1]] || [keywords[1]];
    const timestamp = Date.now();
    const primaryIndex = timestamp % primaryNames.length;
    const secondaryIndex = (timestamp >> 8) % secondaryNames.length;
    const primary = primaryNames[primaryIndex];
    const secondary = secondaryNames[secondaryIndex];
    return `${primary}${secondary}`;
  }

  const defaultNames = [
    '네오스페이스',
    '퓨처허브',
    '인노베이션존',
    '크리에이티브랩',
    '테크플로우',
    '디지털스튜디오',
    '아이디어팩토리',
    '스마트워크스',
    '클라우드네스트',
    '데이터허브',
    '코드스튜디오',
    '웹크래프트',
    '앱마스터',
    '디지털아트',
    '테크마스터',
    '매직랩',
    '크래프트존',
    '팩토리스페이스',
    '스튜디오허브',
    '플로우크래프트',
    '네오매직',
    '퓨처크래프트',
    '인노베이션매직',
    '크리에이티브매직',
    '테크크래프트',
  ];
  const timestamp = Date.now();
  const randomIndex = timestamp % defaultNames.length;
  return defaultNames[randomIndex];
}
