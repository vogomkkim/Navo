import { execSync } from 'node:child_process';

interface CommitEntry {
  shortHash: string;
  author: string;
  date: string;
  subject: string;
}

interface CliOptions {
  limit: number;
  since?: string;
  changelogPath: string;
}

function parseCliArgs(argv: string[]): CliOptions {
  const defaultOptions: CliOptions = {
    limit: 10,
    changelogPath: 'docs/progress/CHANGELOG.md',
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit' && i + 1 < argv.length) {
      defaultOptions.limit = Number(argv[++i]) || defaultOptions.limit;
    } else if (arg === '--since' && i + 1 < argv.length) {
      defaultOptions.since = argv[++i];
    } else if (arg === '--changelog' && i + 1 < argv.length) {
      defaultOptions.changelogPath = argv[++i];
    }
  }

  return defaultOptions;
}

function getRecentCommits(options: CliOptions): CommitEntry[] {
  const sincePart = options.since ? ` --since="${options.since}"` : '';
  const cmd = `git log -n ${options.limit}${sincePart} --date=short --pretty=format:'%h|%an|%ad|%s'`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf8' });
    const lines = stdout.split('\n').filter(Boolean);
    return lines.map((line) => {
      const [shortHash, author, date, subject] = line.split('|');
      return { shortHash, author, date, subject };
    });
  } catch (error) {
    console.error('git log 실행 중 오류가 발생했습니다.', error);
    return [];
  }
}

function readChangelog(path: string): string[] {
  try {
    const content = execSync(`cat ${path}`, { encoding: 'utf8' });
    const lines = content.split('\n');

    const startIdx = lines.findIndex((l) => l.trim().toLowerCase() === '## unreleased');
    if (startIdx === -1) return [];

    // Collect bullet points under Added/Changed/Fixed until next header (##)
    const items: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('## ')) break;
      // bullets start with '-' optionally preceded by spaces
      if (/^\s*-\s+/.test(line)) {
        items.push(line.replace(/^\s*-\s+/, '').trim());
      }
    }
    return items;
  } catch (error) {
    console.warn('CHANGELOG을 읽는 중 오류가 발생했습니다.', error);
    return [];
  }
}

function buildSlackText(commits: CommitEntry[], changelogItems: string[], options: CliOptions): string {
  const header = `*🧭 NAVO 업데이트 요약*`;

  const commitHeader = `*최근 커밋 (${options.limit}개${options.since ? `, ${options.since} 이후` : ''})*`;
  const commitLines = commits.length
    ? commits
        .map((c) => `• ${c.date} ${c.shortHash} — ${c.subject} _(by ${c.author})_`)
        .join('\n')
    : '최근 커밋 정보를 가져오지 못했습니다.';

  const changelogHeader = '*CHANGELOG - Unreleased 주요 변경사항*';
  const changelogLines = changelogItems.length
    ? changelogItems.map((i) => `• ${i}`).join('\n')
    : '변경 내역이 없거나 읽어올 수 없습니다.';

  const footer = '_이 메시지는 자동 생성되었습니다._';

  return [header, '', commitHeader, commitLines, '', changelogHeader, changelogLines, '', footer].join('\n');
}

async function postToSlack(webhookUrl: string, text: string): Promise<Response> {
  // Node 18+ has global fetch
  return fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

async function main() {
  const options = parseCliArgs(process.argv);

  const commits = getRecentCommits(options);
  const changelogItems = readChangelog(options.changelogPath);
  const text = buildSlackText(commits, changelogItems, options);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[DRY-RUN] SLACK_WEBHOOK_URL 미설정. 아래 메시지를 콘솔에 출력합니다:');
    console.log('---');
    console.log(text);
    console.log('---');
    process.exit(0);
  }

  try {
    const res = await postToSlack(webhookUrl, text);
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Slack Webhook 전송 실패:', res.status, res.statusText, errBody);
      process.exit(1);
    }
    console.log('Slack 전송 성공');
  } catch (error) {
    console.error('Slack Webhook 호출 중 오류:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});