// Web pública: menú fijo que baja al hacer scroll, carrusel, pestañas, buscador, modo noche,
// cinta de tendencias, aviso de compra y barra de lectura.
(function () {
  var reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Al abrir una página nueva (una noticia, una sección), empezar siempre arriba; con las flechas, volver donde estabas
  var nav0 = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!location.hash && (!nav0 || nav0.type === 'navigate')) {
    // scrollIntoView también sube el marco que contiene la página cuando se ve dentro de otra (vista previa)
    var arriba = function () { document.documentElement.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    var tocado = false, marcar0 = function () { tocado = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { addEventListener(t, marcar0, { once: true, passive: true }); });
    arriba();
    addEventListener('load', function () { if (!tocado) arriba(); });   // si el lector ya empezó a bajar, no lo movemos
  }

  // Banner de la portada: en celular, su propia imagen de espera; con menos movimiento, solo el logo final
  var banner = document.getElementById('banner');
  if (banner) {
    var cel = matchMedia('(max-width: 640px)').matches;
    if (reducido) {
      banner.pause();
      Array.prototype.slice.call(banner.querySelectorAll('source')).forEach(function (s) { s.remove(); });
      banner.poster = cel ? 'video/banner-celular-final.jpg?v=3' : 'video/banner-final.jpg?v=3';
      banner.load();
    } else {
      if (cel) banner.poster = 'video/banner-celular-inicio.jpg?v=3';
      // Safari (iPhone) no respeta "media" en <source> y ponía el video ancho recortado: dejamos solo el que toca
      var sobra = Array.prototype.filter.call(banner.querySelectorAll('source'), function (s) { return !!s.media !== cel; });
      if (sobra.length) {
        sobra.forEach(function (s) { s.remove(); });
        banner.load();
        var p = banner.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
  }

  // Menú oscuro: se queda fijo arriba al pasar la cabecera
  var nav = document.getElementById('nav'), lugar = document.getElementById('nav-lugar');
  if (nav && lugar && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      lugar.style.minHeight = nav.offsetHeight + 'px';
      nav.classList.toggle('fija', !e[0].isIntersecting && e[0].boundingClientRect.top < 0);
    }).observe(lugar);
  }

  // Flechas atrás / adelante: recuerdan cuántos pasos se retrocedió para poder volver a avanzar
  var atras = document.getElementById('atras'), adelante = document.getElementById('adelante');
  if (atras && adelante) {
    var leer = function () { try { return parseInt(sessionStorage.getItem('dec-adelante')) || 0; } catch (e) { return 0; } };
    var guardar = function (n) { try { sessionStorage.setItem('dec-adelante', String(Math.max(0, n))); } catch (e) {} };
    var desdeAqui = false;
    try { desdeAqui = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    var hayAtras = desdeAqui || history.length > 1;
    if (!hayAtras && location.pathname === '/') atras.setAttribute('aria-disabled', 'true');
    var pintarAdelante = function () { leer() ? adelante.removeAttribute('aria-disabled') : adelante.setAttribute('aria-disabled', 'true'); };
    pintarAdelante();
    addEventListener('pageshow', pintarAdelante);   // al volver con la flecha, la página puede venir de la memoria del navegador
    atras.addEventListener('click', function () {
      if (hayAtras) { guardar(leer() + 1); history.back(); }
      else if (location.pathname !== '/') location.href = '/';
    });
    adelante.addEventListener('click', function () {
      if (!leer()) return;
      guardar(leer() - 1);
      history.forward();
    });
    // Si eliges otra noticia o sección, ya no hay "adelante" (como en cualquier navegador)
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && a.origin === location.origin && !a.target) guardar(0);
    });
  }

  // Buscador desplegable
  var abrir = document.getElementById('abrir-buscar'), panel = document.getElementById('panel-buscar');
  if (abrir && panel) abrir.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    abrir.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('input').focus();
  });

  // Cinta de tendencias continua
  var cinta = document.getElementById('cinta');
  if (cinta) cinta.innerHTML += cinta.innerHTML.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ');

  // Modo noche (interruptor)
  var root = document.documentElement, tema = document.getElementById('tema');
  function oscuro() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function pintarTema() { if (tema) tema.setAttribute('aria-checked', String(oscuro())); }
  pintarTema();
  if (tema) tema.addEventListener('click', function () {
    var n = oscuro() ? 'light' : 'dark';
    root.setAttribute('data-theme', n);
    try { localStorage.setItem('dec-theme', n); } catch (e) {}
    pintarTema();
  });

  // Carrusel: se desliza con el dedo; avanza solo cada 6,5 s; se pausa al pasar el ratón o al tocar
  var car = document.getElementById('carrusel'), pista = document.getElementById('carrusel-pista');
  if (car && pista) {
    var diapos = pista.children, puntos = car.querySelectorAll('.carrusel-puntos button'), actual = 0, reloj = null, PAUSA = 6500;
    function marcar(i) {
      actual = i;
      for (var k = 0; k < diapos.length; k++) diapos[k].classList.toggle('activa', k === i);
      puntos.forEach(function (p, k) {
        p.classList.toggle('visto', k < i);
        if (k === i) { p.removeAttribute('aria-selected'); void p.offsetWidth; p.setAttribute('aria-selected', 'true'); }
        else p.removeAttribute('aria-selected');
      });
    }
    function ir(i) {
      i = (i + diapos.length) % diapos.length;
      pista.scrollTo({ left: i * pista.clientWidth, behavior: reducido ? 'auto' : 'smooth' });
      marcar(i);
    }
    function programar() {
      clearTimeout(reloj);
      if (!reducido && diapos.length > 1 && !car.classList.contains('quieto')) reloj = setTimeout(function () { ir(actual + 1); programar(); }, PAUSA);
    }
    car.querySelectorAll('.c-btn').forEach(function (b) { b.addEventListener('click', function () { ir(actual + Number(b.dataset.dir)); programar(); }); });
    puntos.forEach(function (p) { p.addEventListener('click', function () { ir(Number(p.dataset.i)); programar(); }); });
    var fin;
    pista.addEventListener('scroll', function () {
      clearTimeout(fin);
      fin = setTimeout(function () {
        var i = Math.round(pista.scrollLeft / pista.clientWidth);
        if (i !== actual) { marcar(i); programar(); }
      }, 120);
    }, { passive: true });
    car.addEventListener('mouseenter', function () { car.classList.add('quieto'); clearTimeout(reloj); });
    car.addEventListener('mouseleave', function () { car.classList.remove('quieto'); programar(); });
    car.addEventListener('focusin', function () { car.classList.add('quieto'); clearTimeout(reloj); });
    car.addEventListener('focusout', function () { car.classList.remove('quieto'); programar(); });
    document.addEventListener('visibilitychange', function () { document.hidden ? clearTimeout(reloj) : programar(); });
    car.style.setProperty('--pausa', PAUSA + 'ms');
    if (reducido) car.classList.add('quieto');
    marcar(0); programar();
  }

  // Pestañas "Recientes / Más leídas"
  document.querySelectorAll('.pest-botones').forEach(function (grupo) {
    var botones = grupo.querySelectorAll('[role=tab]');
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        botones.forEach(function (o) {
          var si = o === b;
          o.setAttribute('aria-selected', String(si));
          document.getElementById(o.getAttribute('aria-controls')).hidden = !si;
        });
      });
    });
  });

  // Aviso de compra del diario digital: sale abajo hasta que lo cierras (vuelve en la próxima visita)
  var dock = document.getElementById('dock');
  if (dock) {
    var cerrado = false;
    try { cerrado = sessionStorage.getItem('dec-dock') === '1'; } catch (e) {}
    if (!cerrado) setTimeout(function () { dock.hidden = false; document.body.classList.add('con-dock'); }, 2500);
    document.getElementById('dock-cerrar').addEventListener('click', function () {
      dock.hidden = true; document.body.classList.remove('con-dock');
      try { sessionStorage.setItem('dec-dock', '1'); } catch (e) {}
    });
  }

  // Aparición suave al bajar: solo lo que aún no se ve; lo de arriba ya está quieto y visible
  if (!reducido && 'IntersectionObserver' in window) {
    var mirar = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('visto-ya');
        el.classList.remove('por-ver');
        mirar.unobserve(el);
        setTimeout(function () { el.style.transitionDelay = ''; el.classList.remove('visto-ya'); }, 1300);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    var grupos = {};
    document.querySelectorAll('.feed, .imp, .nota, .widget, .lista-edictos li, .av-tipos li, .dd-archivo li, .plan, .linea li, .redes-lista li, .dd-pasos li, .boys-principal').forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) return;
      var padre = el.parentElement, i = grupos[padre && padre.className] = ((grupos[padre && padre.className] || 0) + 1) % 4;
      el.style.transitionDelay = (i * 0.08) + 's';
      el.classList.add('por-ver');
      mirar.observe(el);
    });
  }

  // Barra que avanza mientras se lee la noticia
  var barra = document.getElementById('progreso'), art = document.querySelector('.art');
  if (barra && art) {
    var pintar = function () {
      var r = art.getBoundingClientRect(), total = r.height - innerHeight;
      barra.style.transform = 'scaleX(' + (total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1) + ')';
    };
    addEventListener('scroll', pintar, { passive: true });
    addEventListener('resize', pintar);
    pintar();
  }

  // Botones de copiar (teléfono, enlace de la noticia)
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var span = b.querySelector('span') || b, original = span.textContent;
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var listo = function () { span.textContent = 'Copiado'; setTimeout(function () { span.textContent = original; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(listo, function () { prompt('Copia este texto:', t); });
      else prompt('Copia este texto:', t);
    });
  });
})();
