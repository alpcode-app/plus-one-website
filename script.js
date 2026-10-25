// Mobile Navigation
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav__toggle');
const menu = document.getElementById('nav-menu');

toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  nav.dataset.open = open;
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
});
menu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    menu.classList.remove('open');
    nav.dataset.open = false;
    toggle.setAttribute('aria-expanded', false);
  })
);

// Galerie-Lightbox
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lbImg = lightbox.querySelector('img');
  document.querySelectorAll('.gallery__item').forEach((item) =>
    item.addEventListener('click', () => {
      lbImg.src = item.dataset.full;
      lbImg.alt = item.querySelector('img').alt;
      lightbox.showModal();
    })
  );
  lightbox.addEventListener('click', () => lightbox.close());
}

// Hero-Loop: bei "Bewegung reduzieren" gar nicht laden, sonst Pause-Button anbieten
const heroVideo = document.querySelector('.hero__video');
const heroPause = document.querySelector('.hero__pause');
if (heroVideo) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.preload = 'none';
    heroVideo.pause();
  } else {
    heroPause.hidden = false;
    heroPause.addEventListener('click', () => {
      const paused = !heroVideo.paused;
      paused ? heroVideo.pause() : heroVideo.play();
      heroPause.classList.toggle('is-paused', paused);
      heroPause.setAttribute('aria-label', paused ? 'Hintergrundvideo abspielen' : 'Hintergrundvideo pausieren');
    });
  }
}

// Videos: Klick-zum-Laden. YouTube (youtube-nocookie) wird erst nach dem Klick kontaktiert.
document.querySelectorAll('.yt').forEach((box) =>
  box.querySelector('.yt__play').addEventListener('click', () => {
    const { yt, src, title } = box.dataset;
    let player;
    if (yt) {
      player = document.createElement('iframe');
      player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0&playsinline=1`;
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
    } else {
      player = document.createElement('video');
      player.src = src;
      player.controls = true;
      player.autoplay = true;
      player.playsInline = true;
    }
    player.title = title;
    box.replaceChildren(player);
    box.classList.add('is-playing');
    // andere laufende lokale Videos anhalten
    document.querySelectorAll('.yt video').forEach((v) => v !== player && v.pause());
  })
);

// Buchungsformular -> vorausgefüllte E-Mail
const form = document.getElementById('booking-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('[required]').forEach((f) => {
      const ok = f.checkValidity();
      f.setAttribute('aria-invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) return;

    const d = Object.fromEntries(new FormData(form));
    const datum = d.datum ? new Date(d.datum).toLocaleDateString('de-DE') : 'noch offen';
    const subject = `Booking-Anfrage: ${d.anlass} – ${d.name}`;
    const body = [
      'Hallo +one,',
      '',
      d.nachricht || 'wir hätten Lust auf Live-Musik von euch!',
      '',
      `Anlass: ${d.anlass}`,
      `Datum: ${datum}`,
      `Ort: ${d.ort || '–'}`,
      '',
      'Viele Grüße',
      d.name,
      d.email,
    ].join('\n');
    location.href = `mailto:keidlers@gmx.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// Sanftes Einblenden der Abschnitte
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    }),
  { threshold: 0.12 }
);
document.querySelectorAll('.timeline li, .gig, .video-grid figure, .members, .form').forEach((el) => {
  el.classList.add('reveal');
  io.observe(el);
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
