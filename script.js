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
