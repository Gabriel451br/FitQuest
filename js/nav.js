// Navegação por hash (#/rota/param).
export function go(path) {
  location.hash = `#/${path}`;
}
