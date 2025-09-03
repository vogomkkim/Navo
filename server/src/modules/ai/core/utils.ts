export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry(fn, maxRetries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await sleep(delay * Math.pow(2, i)); // exponential backoff
        }
      }
    }
    throw lastError;
  };
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
