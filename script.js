/* ==========================================================================
   Termivox – gemeinsames Skript für alle fünf Seiten.
   Ohne Abhängigkeiten. Jede Funktion prüft zuerst, ob ihre Elemente existieren.
   ========================================================================== */
(function () {
  'use strict';

  /* 1. Alte Anker der früheren Startseite auf die neuen Seiten umleiten.
        Nur auf index.html (body[data-page="start"]). */
  function legacyAnchors() {
    if (document.body.getAttribute('data-page') !== 'start') return;
    var map = {
      '#faq': 'preise.html#faq',
      '#preise': 'preise.html#preise',
      '#funktionen': 'funktionen.html',
      '#ablauf': 'funktionen.html#ablauf',
      '#branchen': 'branchen.html',
      '#bewertungen': 'index.html#vorteile',
      '#roi': 'index.html#rechner'
    };
    var target = map[window.location.hash];
    if (target) window.location.replace(target);
  }

  /* 2. Mobiles Menü (unter 1000 px): auf-/zuklappen, schließt bei Linkklick,
        Klick außerhalb und mit Escape. */
  function mobileMenu() {
    var btn = document.querySelector('.menu-btn[aria-controls]');
    var menu = btn ? document.getElementById(btn.getAttribute('aria-controls')) : null;
    if (!btn || !menu) return;

    function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
    function setOpen(open, returnFocus) {
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      if (!open && returnFocus) btn.focus();
    }

    btn.addEventListener('click', function () { setOpen(!isOpen()); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
    // Beim Wechsel auf die Desktop-Breite Menü-Zustand zurücksetzen
    var wide = window.matchMedia('(min-width: 1001px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* 3. Branchen-Tabs: zeigt nur das gewählte Beispielgespräch. */
  function branchTabs() {
    var tabs = document.querySelectorAll('.tab[aria-controls]');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          t.setAttribute('aria-pressed', String(on));
          if (!panel) return;
          panel.hidden = !on;
          if (on) {
            // Einblend-Animation neu starten (wirkt nur ohne reduzierte Bewegung)
            panel.classList.remove('fade');
            void panel.offsetWidth;
            panel.classList.add('fade');
          }
        });
      });
    });
  }

  /* 4. FAQ: immer nur eine Antwort offen. Ohne JavaScript sind alle Antworten
        sichtbar (siehe <noscript> in preise.html). */
  function faq() {
    var buttons = document.querySelectorAll('.fq-b[aria-controls]');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var openThis = btn.getAttribute('aria-expanded') !== 'true';
        buttons.forEach(function (b) {
          var on = b === btn && openThis;
          var answer = document.getElementById(b.getAttribute('aria-controls'));
          b.setAttribute('aria-expanded', String(on));
          if (answer) answer.hidden = !on;
        });
      });
    });
  }

  /* 5. Rechenbeispiel (index.html): Werte live bei jeder Eingabe neu berechnen. */
  function calculator() {
    var inputs = {
      termine: document.getElementById('r1'),
      preis: document.getElementById('r2'),
      noshow: document.getElementById('r3'),
      auto: document.getElementById('r4')
    };
    var out = {
      termine: document.getElementById('r1-v'),
      preis: document.getElementById('r2-v'),
      noshow: document.getElementById('r3-v'),
      auto: document.getElementById('r4-v'),
      umsatz: document.getElementById('res-umsatz'),
      gerettet: document.getElementById('res-gerettet'),
      zeit: document.getElementById('res-zeit')
    };
    var key;
    for (key in inputs) if (!inputs[key]) return;
    for (key in out) if (!out[key]) return;

    function de(n) { return Math.round(n).toLocaleString('de-DE'); }
    function eur(n) { return de(n) + ' €'; }

    function update() {
      var termine = Number(inputs.termine.value);
      var preis = Number(inputs.preis.value);
      var noshow = Number(inputs.noshow.value);
      var auto = Number(inputs.auto.value);

      // Formeln wie in der Vorlage
      var umsatz = termine * preis;
      var verlust = umsatz * noshow / 100;
      var gerettet = verlust * auto / 100;
      var stundenWoche = (termine * 5 * auto / 100) / 60 / 4.33;

      var texts = {
        termine: de(termine),
        preis: eur(preis),
        noshow: noshow + ' %',
        auto: auto + ' %'
      };
      for (var k in texts) {
        out[k].textContent = texts[k];
        inputs[k].setAttribute('aria-valuetext', texts[k]);
      }
      out.umsatz.textContent = eur(umsatz);
      out.gerettet.textContent = eur(gerettet);
      out.zeit.textContent = stundenWoche.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Std.';
    }

    for (key in inputs) inputs[key].addEventListener('input', update);
    update();
  }

  /* 6. Pilot-Formular: sendet die Anfrage ohne Neuladen per POST an n8n.
        Keine Zugangsdaten im Code; die Adresse ist ein öffentlicher Webhook. */
  function pilotForm() {
    var form = document.getElementById('pilot-form');
    if (!form || !window.fetch) return;
    var URL = 'https://n8n.termivox.com/webhook/pilot-anfrage';
    var NETZ = 'Das hat gerade nicht geklappt. Bitte versuchen Sie es später noch einmal oder schreiben Sie uns.';
    var btn = form.querySelector('button[type="submit"]');
    var fehler = document.getElementById('pform-fehler');
    var danke = document.getElementById('pform-danke');
    var sub = document.querySelector('.pform-sub');
    var label = btn.textContent;
    var sendet = false;

    function zeigeFehler(text) { fehler.textContent = text; fehler.hidden = false; }
    function frei() { sendet = false; btn.disabled = false; btn.removeAttribute('aria-disabled'); btn.textContent = label; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sendet) return;
      fehler.hidden = true;
      fehler.textContent = '';
      var f = form.elements;

      // Pflichtfelder: leere Angaben (auch nur Leerzeichen) und fehlende Zustimmung abfangen
      var pflicht = ['betrieb', 'ort', 'ansprechperson', 'kontakt'];
      for (var i = 0; i < pflicht.length; i++) {
        if (!String(f[pflicht[i]].value || '').trim()) {
          zeigeFehler('Bitte füllen Sie alle Felder aus.');
          f[pflicht[i]].focus();
          return;
        }
      }
      if (!f.datenschutz.checked) {
        zeigeFehler('Bitte bestätigen Sie die Datenschutzerklärung.');
        f.datenschutz.focus();
        return;
      }

      sendet = true;
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = 'Wird gesendet…';

      var body = {
        betrieb: String(f.betrieb.value).trim(),
        branche: f.branche.value,
        ort: String(f.ort.value).trim(),
        ansprechperson: String(f.ansprechperson.value).trim(),
        kontakt: String(f.kontakt.value).trim(),
        datenschutz: !!f.datenschutz.checked,
        website: f.website.value
      };

      fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (res) {
          return res.json().then(function (d) { return d; }, function () { return null; });
        })
        .then(function (d) {
          if (d && d.success === true) {
            form.hidden = true;
            if (sub) sub.hidden = true;
            danke.hidden = false;
            danke.focus();
            return;
          }
          var text = d && d.success === false && typeof d.error === 'string' ? d.error.trim() : '';
          zeigeFehler(text || NETZ);
          frei();
        })
        .catch(function () {
          zeigeFehler(NETZ);
          frei();
        });
    });
  }

  legacyAnchors();
  window.addEventListener('hashchange', legacyAnchors);
  mobileMenu();
  branchTabs();
  faq();
  calculator();
  pilotForm();
})();
