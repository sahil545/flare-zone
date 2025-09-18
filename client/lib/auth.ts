export function getToken(): string | null {
  try {
    return localStorage.getItem("wp_jwt_token");
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem("wp_jwt_token", token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem("wp_jwt_token");
  } catch {}
}
