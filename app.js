(function () {
  "use strict";

  var ICONS = {
    ferry: "icon-ferry",
    transit: "icon-transit",
    landmark: "icon-landmark",
    pool: "icon-pool",
    wine: "icon-wine",
    bag: "icon-bag",
    bed: "icon-bed",
    food: "icon-food",
    plane: "icon-plane",
    sun: "icon-sun"
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function iconUse(name) {
    var id = ICONS[name] || "icon-sun";
    return '<svg class="icon"><use href="#' + id + '"></use></svg>';
  }

  fetch("data.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(init)
    .catch(function (err) {
      var el = document.getElementById("timeline");
      if (el) {
        el.innerHTML =
          '<p style="color:var(--terracotta-deep)">Kunne ikke indlæse rejseplanen (data.json). ' +
          esc(err.message) +
          "</p>";
      }
      console.error(err);
    });

  function init(data) {
    renderTicket(data.trip.departure);
    renderRoute(data.route);
    renderTimeline(data.days);
    renderEssentials(data.trip.departure, data.route);
    startCountdown(data.trip.departure.iso);
    markToday(data.days);
    wireMapMarkers();
  }

  /* ---------- Ticket / hero ---------- */
  function renderTicket(dep) {
    var route = document.getElementById("ticket-route");
    if (route) {
      route.innerHTML =
        "Afgang <b>" + esc(dep.airport) + "</b> · " + esc(dep.dateLabel) + " · " + esc(dep.departureTime);
    }
    var note = document.getElementById("ticket-note-time");
    if (note) note.textContent = dep.checkIn;
  }

  /* ---------- Route map labels ---------- */
  function renderRoute(route) {
    route.forEach(function (stop) {
      var nameEl = document.getElementById("route-" + stop.id + "-name");
      var dateEl = document.getElementById("route-" + stop.id + "-date");
      if (nameEl) nameEl.textContent = stop.name;
      if (dateEl) dateEl.textContent = stop.date;
    });
  }

  /* ---------- Timeline ---------- */
  function renderActivity(act) {
    var toneClass = act.tone ? " tone-" + act.tone : "";
    var badge = act.highlight
      ? '<span class="highlight-badge">' + iconUse("sun") + esc(act.highlight) + "</span>"
      : "";
    return (
      '<div class="activity' +
      toneClass +
      '">' +
      '<span class="icon-badge">' +
      iconUse(act.icon) +
      "</span>" +
      '<span class="activity-body">' +
      '<span class="activity-time">' +
      esc(act.time) +
      "</span>" +
      '<p class="activity-text">' +
      esc(act.text) +
      "</p>" +
      badge +
      "</span>" +
      "</div>"
    );
  }

  function renderDay(day, isFirst) {
    var previewIcons = [];
    (day.activities || []).forEach(function (a) {
      if (previewIcons.indexOf(a.icon) === -1) previewIcons.push(a.icon);
    });
    var previewHtml = previewIcons.map(iconUse).join("");

    var mapLinksHtml = (day.mapLinks || [])
      .map(function (l) {
        var url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(l.query);
        return (
          '<a class="map-link" href="' +
          url +
          '" target="_blank" rel="noopener"><svg class="icon"><use href="#icon-pin"></use></svg>' +
          esc(l.label) +
          "</a>"
        );
      })
      .join("");

    var activitiesHtml = (day.activities || []).map(renderActivity).join("");

    var el = document.createElement("details");
    el.className = "day";
    el.id = day.id;
    if (isFirst) el.open = true;
    el.innerHTML =
      "<summary>" +
      '<span class="day-date"><span class="dow">' +
      esc(day.dow) +
      '</span><span class="num">' +
      esc(day.dayNum) +
      "</span></span>" +
      '<span class="day-head-main">' +
      '<span class="city">' +
      esc(day.city) +
      "</span>" +
      '<span class="teaser">' +
      esc(day.teaser) +
      "</span>" +
      "</span>" +
      '<span class="day-preview-icons">' +
      previewHtml +
      "</span>" +
      '<svg class="chevron"><use href="#icon-chevron"></use></svg>' +
      "</summary>" +
      '<div class="day-body">' +
      (mapLinksHtml ? '<div class="map-links">' + mapLinksHtml + "</div>" : "") +
      activitiesHtml +
      "</div>";
    return el;
  }

  function renderTimeline(days) {
    var container = document.getElementById("timeline");
    if (!container) return;
    container.innerHTML = "";
    days.forEach(function (day, i) {
      container.appendChild(renderDay(day, i === 0));
    });
  }

  /* ---------- Essentials footer ---------- */
  function renderEssentials(dep, route) {
    var checkin = document.getElementById("ess-checkin");
    var departure = document.getElementById("ess-departure");
    var routeEl = document.getElementById("ess-route");
    if (checkin) checkin.textContent = dep.checkIn + " · " + dep.airport;
    if (departure) departure.textContent = dep.departureTime + " · " + dep.dateLabel;
    if (routeEl) routeEl.textContent = route.map(function (r) { return r.name; }).join(" · ");
  }

  /* ---------- Countdown ---------- */
  function startCountdown(iso) {
    var target = new Date(iso).getTime();
    var elDays = document.getElementById("cd-days");
    var elHours = document.getElementById("cd-hours");
    var elMins = document.getElementById("cd-mins");
    var elSecs = document.getElementById("cd-secs");
    var elStatus = document.getElementById("ticket-status");
    if (!elDays) return;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        var backHome = -diff > 1000 * 60 * 60 * 6;
        elDays.textContent = elHours.textContent = elMins.textContent = elSecs.textContent = "—";
        elStatus.textContent = backHome ? "Turen er slut" : "God rejse!";
        return;
      }
      var s = Math.floor(diff / 1000);
      elDays.textContent = Math.floor(s / 86400);
      elHours.textContent = pad(Math.floor((s % 86400) / 3600));
      elMins.textContent = pad(Math.floor((s % 3600) / 60));
      elSecs.textContent = pad(s % 60);
      elStatus.textContent = s < 86400 ? "I dag!" : "Nedtælling";
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- "I dag"-mærkat ---------- */
  function localDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function markToday(days) {
    var todayStr = localDateStr(new Date());
    days.forEach(function (day) {
      if (day.date !== todayStr) return;
      var el = document.getElementById(day.id);
      if (!el) return;
      el.open = true;
      var city = el.querySelector(".city");
      if (city && !city.querySelector(".today-pill")) {
        var pill = document.createElement("span");
        pill.className = "today-pill";
        pill.textContent = "I dag";
        city.appendChild(pill);
      }
    });
  }

  /* ---------- Map markers -> scroll to day ---------- */
  function wireMapMarkers() {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".map-marker").forEach(function (marker) {
      function go() {
        var id = marker.getAttribute("data-target");
        var el = document.getElementById(id);
        if (!el) return;
        el.open = true;
        el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        el.style.outline = "2px solid var(--sea)";
        el.style.outlineOffset = "3px";
        setTimeout(function () {
          el.style.outline = "";
          el.style.outlineOffset = "";
        }, 1400);
      }
      marker.addEventListener("click", go);
      marker.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }
})();
