// Aplica el modo claro/oscuro guardado antes de pintar la página
try { var t = localStorage.getItem('dec-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
