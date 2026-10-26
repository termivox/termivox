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

  /* 7. Ortsvorschläge im Pilot-Formular (Feld "Ort").
        Die Liste orte.json liegt auf der Seite selbst (Quelle: GeoNames, CC BY 4.0) und wird erst
        beim ersten Klick ins Feld geladen. Eingaben gehen an keinen Dritten. Freie Eingabe bleibt möglich. */
  function ortSuche() {
    var input = document.getElementById('f3');
    var liste = document.getElementById('orte-liste');
    if (!input || !liste || !window.fetch) return;

    var MAX = 8, MIN = 3;
    var orte = null, laden = null;
    var treffer = [], aktiv = -1;

    function klein(s) { return String(s).toLocaleLowerCase('de'); }

    // Orte erst bei Bedarf laden (einmalig); Ergebnis als Promise, damit schnelles Tippen wartet
    function ladeOrte() {
      if (orte) return Promise.resolve(orte);
      if (!laden) {
        laden = fetch('orte.json')
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (d) { orte = Array.isArray(d) ? d : []; return orte; })
          .catch(function () { laden = null; orte = null; return []; });   // ohne Liste: freie Eingabe
      }
      return laden;
    }

    function schliessen() {
      liste.hidden = true;
      liste.textContent = '';
      treffer = [];
      aktiv = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function markieren(i) {
      var punkte = liste.children;
      for (var k = 0; k < punkte.length; k++) punkte[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
      aktiv = i;
      if (i >= 0 && punkte[i]) {
        input.setAttribute('aria-activedescendant', punkte[i].id);
        if (punkte[i].scrollIntoView) punkte[i].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function waehlen(name) {
      input.value = name;
      schliessen();
      input.focus();
    }

    function zeigen(q) {
      var ql = klein(q);
      treffer = [];
      for (var i = 0; i < orte.length && treffer.length < MAX; i++) {
        if (klein(orte[i]).indexOf(ql) === 0) treffer.push(orte[i]);   // Liste ist nach Größe sortiert
      }
      liste.textContent = '';
      if (!treffer.length) { schliessen(); return; }
      treffer.forEach(function (name, i) {
        var li = document.createElement('li');
        li.id = 'orte-o-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        var b = document.createElement('b');
        b.textContent = name.slice(0, q.length);
        li.appendChild(b);
        li.appendChild(document.createTextNode(name.slice(q.length)));
        li.addEventListener('click', function () { waehlen(name); });
        liste.appendChild(li);
      });
      liste.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      aktiv = -1;
      input.removeAttribute('aria-activedescendant');
    }

    function aktualisieren() {
      var q = input.value.replace(/^\s+/, '');
      if (q.replace(/\s+$/, '').length < MIN) { schliessen(); return; }
      ladeOrte().then(function () {
        // Eingabe könnte sich während des Ladens geändert haben
        var jetzt = input.value.replace(/^\s+/, '');
        if (jetzt.replace(/\s+$/, '').length < MIN) { schliessen(); return; }
        if (orte && orte.length) zeigen(jetzt); else schliessen();
      });
    }

    input.addEventListener('focus', ladeOrte);
    input.addEventListener('click', ladeOrte);
    input.addEventListener('input', aktualisieren);

    input.addEventListener('keydown', function (e) {
      var offen = !liste.hidden && treffer.length > 0;
      if (e.key === 'ArrowDown') {
        if (!offen) { aktualisieren(); return; }
        e.preventDefault();
        markieren(aktiv + 1 >= treffer.length ? 0 : aktiv + 1);
      } else if (e.key === 'ArrowUp') {
        if (!offen) return;
        e.preventDefault();
        markieren(aktiv <= 0 ? treffer.length - 1 : aktiv - 1);
      } else if (e.key === 'Enter') {
        if (offen && aktiv >= 0) { e.preventDefault(); waehlen(treffer[aktiv]); }   // ohne Auswahl: normales Absenden
      } else if (e.key === 'Escape') {
        if (offen) { e.preventDefault(); schliessen(); }
      } else if (e.key === 'Tab') {
        schliessen();
      }
    });

    // Klick/Tippen auf die Liste darf das Feld nicht verlassen (sonst schließt sich die Liste zu früh)
    liste.addEventListener('mousedown', function (e) { e.preventDefault(); });
    input.addEventListener('blur', function () { setTimeout(schliessen, 120); });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !liste.contains(e.target)) schliessen();
    });
  }

  /* 7. Erklärvideo (index.html): Es startet nie von selbst. Erst der Klick auf das Vorschaubild
        setzt das Video ein und spielt es ab. Dabei wird anonym gezählt, dass geklickt wurde:
        ein Ereignis ohne Namen, IP-Adresse oder Cookies, an den eigenen n8n-Server. */
  function erklaerfilm() {
    var box = document.getElementById('film');
    var knopf = document.getElementById('film-start');
    if (!box || !knopf) return;
    var ZAEHLER = 'https://n8n.termivox.com/webhook/video-zaehler';
    knopf.addEventListener('click', function () {
      var video = document.createElement('video');
      video.controls = true;
      video.setAttribute('playsinline', '');
      video.preload = 'none';
      video.poster = 'erklaerfilm-poster.jpg';
      video.setAttribute('aria-label', 'So funktioniert Termivox, 2 Minuten');
      video.src = 'erklaerfilm.mp4';
      box.replaceChild(video, knopf);
      var spielt = video.play();
      if (spielt && spielt.catch) spielt.catch(function () { /* Bedienelemente stehen bereit */ });
      video.focus();
      if (window.fetch) {
        try {
          fetch(ZAEHLER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ereignis: 'video_play' }),
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            keepalive: true
          }).catch(function () { /* Zählen ist unwichtig, das Video läuft trotzdem */ });
        } catch (e) { /* ignorieren */ }
      }
    });
  }

  legacyAnchors();
  window.addEventListener('hashchange', legacyAnchors);
  mobileMenu();
  branchTabs();
  faq();
  calculator();
  pilotForm();
  ortSuche();
  erklaerfilm();
})();
