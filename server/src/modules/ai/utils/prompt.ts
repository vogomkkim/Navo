export function deriveProjectName(description: string) {
  // 프로젝트 이름 추출 로직
  const words = description.split(' ');
  const relevantWords = words.filter(
    (word) =>
      word.length > 2 &&
      !['the', 'and', 'for', 'with', 'that', 'this'].includes(
        word.toLowerCase()
      )
  );

  if (relevantWords.length > 0) {
    return relevantWords.slice(0, 3).join('-').toLowerCase();
  }

  return 'my-project';
}
