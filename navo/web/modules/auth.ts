export function checkAuth(): string | false {
  const token = localStorage.getItem('navo_token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return token;
}

export function handleLogout(): void {
  localStorage.removeItem('navo_token');
  localStorage.removeItem('navo_user');
  window.location.href = '/login.html';
}
