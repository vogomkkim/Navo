export function checkAuth() {
  const token = localStorage.getItem('navo_token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return token;
}

export function handleLogout() {
  localStorage.removeItem('navo_token');
  localStorage.removeItem('navo_user');
  window.location.href = '/login.html';
}
