type LogLevel = "debug" | "info" | "warn" | "error";

// 환경 변수로 로그 레벨 제어
const LOG_LEVEL = (process.env.LOG_LEVEL || "info") as LogLevel;
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

// 스택 트레이스에서 호출자 정보 추출
function getCallerInfo(): { moduleName: string; class: string; line: number } {
  const stack = new Error().stack;
  if (!stack) {
    console.log("❌ Stack trace is null or undefined");
    return { moduleName: "", class: "", line: 0 };
  }

  const lines = stack.split("\n");

  // 디버깅: 스택 트레이스 패턴 확인 (항상 출력)
  console.log("🔍 Stack trace lines:", lines.slice(0, 8));
  console.log("🔍 Total lines:", lines.length);

  // 3번째 줄부터 실제 호출자 정보가 있음 (0: Error, 1: getCallerInfo, 2: formatMessage, 3: 실제 호출자)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    console.log(`🔍 Line ${i}:`, line);

    if (line.includes("navo/")) {
      console.log("✅ Found navo/ in line:", line);
      // navo/ 경로가 포함된 라인에서 정보 추출
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        console.log("✅ Match found:", match);
        const [, functionName, filePath, lineNum] = match;
        const moduleMatch = filePath.match(/navo\/(.+?)\//);
        const moduleName = moduleMatch ? moduleMatch[1] : "unknown";
        const className = functionName || "anonymous";
        console.log("✅ Extracted:", {
          moduleName,
          class: className,
          line: parseInt(lineNum),
        });
        return { moduleName, class: className, line: parseInt(lineNum) };
      }
    }
  }

  console.log("❌ No navo/ path found in stack trace");
  return { moduleName: "unknown", class: "unknown", line: 0 };
}

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: unknown
): string {
  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").replace("Z", "");
  const levelText = level.toUpperCase().padEnd(5);

  const caller = getCallerInfo();
  const moduleText = caller.moduleName.padEnd(12);
  const classText = `${caller.class}:${caller.line}`.padEnd(20);

  let output = `[${timestamp}] [${levelText}] [${moduleText}] [${classText}] : ${message}`;

  // meta가 있으면 간단하게 추가
  if (meta !== undefined) {
    if (typeof meta === "object" && meta !== null) {
      // 중요한 정보만 추출
      const simpleMeta = extractImportantInfo(meta);
      if (simpleMeta) {
        output += ` | ${simpleMeta}`;
      }
    } else {
      output += ` | ${String(meta)}`;
    }
  }

  return output;
}

// 중요한 정보만 추출하는 함수
function extractImportantInfo(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;

  // 에러 객체인 경우
  if (obj.error || obj.message) {
    return obj.error || obj.message;
  }

  // 상태 정보인 경우
  if (obj.status || obj.statusCode) {
    return `Status: ${obj.status || obj.statusCode}`;
  }

  // 간단한 정보만 반환
  const keys = Object.keys(obj);
  if (keys.length <= 3) {
    return keys.map((key) => `${key}: ${obj[key]}`).join(", ");
  }

  return null;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog("debug") && process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },

  // 로그 레이아웃 테스트용
  testLayout() {
    this.debug("Debug message test");
    this.info("Info message test");
    this.warn("Warning message test");
    this.error("Error message test");
  },
};

export default logger;
