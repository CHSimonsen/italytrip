(function () {
  "use strict";

  /* Temporary debug net: surfaces any script/network error as a native
     alert so it's visible on a phone with no devtools access. Remove
     once the unlock issue is confirmed fixed. */
  alert("app.js indlæst (build diag5)");
  window.addEventListener("error", function (e) {
    alert("Script-fejl: " + (e.message || "ukendt") + (e.filename ? "\n" + e.filename + ":" + e.lineno : ""));
  });
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    alert("Uventet fejl (promise): " + (reason && reason.message ? reason.message : String(reason)));
  });

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
  var ICON_KEYS = Object.keys(ICONS);

  var REPO_OWNER = "CHSimonsen";
  var REPO_NAME = "italytrip";
  var REPO_BRANCH = "main";
  var DATA_PATH = "data.json";
  var TOKEN_KEY = "rejseplanEditToken";
  var CONTENTS_URL =
    "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + DATA_PATH;

  var APP_DATA = null;

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
    APP_DATA = data;
    renderTicket(data.trip.departure);
    renderRoute(data.route);
    renderTimeline(data.days);
    renderEssentials(data.trip.departure, data.route);
    startCountdown(data.trip.departure.iso);
    markToday(data.days);
    wireMapMarkers();
    initEditing();
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
  function renderActivity(act, dayId, index) {
    var toneClass = act.tone ? " tone-" + act.tone : "";
    var badge = act.highlight
      ? '<span class="highlight-badge">' + iconUse("sun") + esc(act.highlight) + "</span>"
      : "";
    var deleteBtn = isEditMode()
      ? '<button type="button" class="activity-delete" data-day="' +
        esc(dayId) +
        '" data-index="' +
        index +
        '" aria-label="Slet dette punkt">' +
        '<svg class="icon"><use href="#icon-trash"></use></svg>' +
        "</button>"
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
      deleteBtn +
      "</div>"
    );
  }

  function renderAddStepButton(dayId) {
    if (!isEditMode()) return "";
    return '<button type="button" class="add-step-btn" data-day="' + esc(dayId) + '">+ Tilføj punkt</button>';
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

    var activitiesHtml = (day.activities || [])
      .map(function (a, i) {
        return renderActivity(a, day.id, i);
      })
      .join("");

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
      '<div class="activity-list" data-day="' +
      esc(day.id) +
      '">' +
      activitiesHtml +
      "</div>" +
      '<div class="day-body-actions" data-day="' +
      esc(day.id) +
      '">' +
      renderAddStepButton(day.id) +
      "</div>" +
      "</div>";
    return el;
  }

  function renderTimeline(days) {
    var container = document.getElementById("timeline");
    if (!container) return;
    var openIds = [];
    container.querySelectorAll(".day[open]").forEach(function (d) {
      openIds.push(d.id);
    });
    container.innerHTML = "";
    days.forEach(function (day, i) {
      var el = renderDay(day, i === 0);
      if (openIds.indexOf(day.id) !== -1) el.open = true;
      container.appendChild(el);
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

  /* ==========================================================
     Editing: password-gated direct save to GitHub.

     The "password" is a GitHub fine-grained Personal Access Token
     scoped to ONLY this repo, Contents: Read and write. It's stored
     in this browser's localStorage after the first successful entry
     and sent straight to GitHub's API — never to any other server.
     Anyone without it can still view the page normally; they just
     don't see the add/delete controls.
     ========================================================== */

  function getStoredToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function setStoredToken(t) {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch (e) {}
  }
  function clearStoredToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }
  function isEditMode() {
    return !!getStoredToken();
  }

  function b64EncodeUnicode(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function b64DecodeUnicode(b64) {
    var binary = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function githubRequest(token, method, body) {
    var opts = {
      method: method,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json"
      }
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    var url = CONTENTS_URL + (method === "GET" ? "?ref=" + REPO_BRANCH : "");
    return fetch(url, opts)
      .catch(function () {
        var err = new Error("Kunne ikke forbinde til GitHub (netværk eller CORS blokerede anmodningen).");
        err.network = true;
        throw err;
      })
      .then(function (res) {
        if (!res.ok) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (body) {
              var err = new Error("GitHub API-fejl (" + res.status + "): " + (body.message || res.statusText));
              err.status = res.status;
              throw err;
            });
        }
        return res.json();
      });
  }

  function githubGetFile(token) {
    return githubRequest(token, "GET").then(function (json) {
      return { sha: json.sha, data: JSON.parse(b64DecodeUnicode(json.content)) };
    });
  }

  function githubPutFile(token, dataObj, sha, message) {
    var content = b64EncodeUnicode(JSON.stringify(dataObj, null, 2) + "\n");
    return githubRequest(token, "PUT", {
      message: message,
      content: content,
      sha: sha,
      branch: REPO_BRANCH
    });
  }

  function setBusy(busy) {
    document.body.classList.toggle("is-saving", busy);
  }

  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(function () {
      el.classList.add("show");
    });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () {
        el.hidden = true;
      }, 200);
    }, 2600);
  }

  function withEdit(mutatorFn, commitMessage) {
    var token = getStoredToken();
    if (!token) return;
    setBusy(true);
    githubGetFile(token)
      .then(function (current) {
        var updated = mutatorFn(current.data);
        return githubPutFile(token, updated, current.sha, commitMessage).then(function () {
          return updated;
        });
      })
      .then(function (updated) {
        APP_DATA = updated;
        renderTimeline(updated.days);
        markToday(updated.days);
        showToast("Gemt ✓");
      })
      .catch(function (err) {
        if (err && (err.status === 401 || err.status === 403)) {
          clearStoredToken();
          updateEditToggle();
          renderTimeline(APP_DATA.days);
          markToday(APP_DATA.days);
          showToast("Adgangskoden virker ikke længere.");
        } else if (err && err.status === 409) {
          showToast("Planen blev lige ændret et andet sted — prøv igen.");
        } else {
          showToast("Kunne ikke gemme: " + (err && err.message ? err.message : "ukendt fejl"));
        }
      })
      .finally(function () {
        setBusy(false);
      });
  }

  /* ---------- Auth modal ---------- */
  function openAuthModal(onDone) {
    var backdrop = document.getElementById("auth-modal");
    var input = document.getElementById("auth-input");
    var error = document.getElementById("auth-error");
    var submitBtn = document.getElementById("auth-submit");
    var cancelBtn = document.getElementById("auth-cancel");
    if (!backdrop || !input || !submitBtn || !cancelBtn) return;

    error.hidden = true;
    input.value = "";
    backdrop.hidden = false;
    input.focus();

    function cleanup() {
      backdrop.hidden = true;
      submitBtn.removeEventListener("click", onSubmit);
      cancelBtn.removeEventListener("click", onCancel);
      input.removeEventListener("keydown", onKeydown);
    }
    function onCancel() {
      cleanup();
      onDone(false);
    }
    function onSubmit() {
      try {
        var token = input.value.trim();
        alert("Klik registreret. Token-længde: " + token.length);
        if (!token) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Tjekker …";
        error.hidden = true;
        githubGetFile(token)
          .then(function () {
            setStoredToken(token);
            submitBtn.disabled = false;
            submitBtn.textContent = "Lås op";
            cleanup();
            onDone(true);
          })
          .catch(function (err) {
            console.error("Kunne ikke låse op:", err);
            submitBtn.disabled = false;
            submitBtn.textContent = "Lås op";
            var msg =
              err && err.status === 404
                ? "Koden virker, men kan ikke finde data.json — tjek at token har adgang til italytrip."
                : err && (err.status === 401 || err.status === 403)
                ? "Forkert adgangskode."
                : (err && err.message) || "Ukendt fejl — prøv igen.";
            error.textContent = msg;
            error.hidden = false;
            alert("Fejl ved forespørgsel: " + msg);
          });
      } catch (syncErr) {
        alert("Uventet script-fejl i onSubmit: " + (syncErr && syncErr.message ? syncErr.message : syncErr));
      }
    }
    function onKeydown(e) {
      if (e.key === "Enter") onSubmit();
      if (e.key === "Escape") onCancel();
    }
    submitBtn.addEventListener("click", onSubmit);
    cancelBtn.addEventListener("click", onCancel);
    input.addEventListener("keydown", onKeydown);
  }

  function updateEditToggle() {
    var btn = document.getElementById("edit-toggle");
    if (!btn) return;
    var unlocked = isEditMode();
    btn.textContent = unlocked ? "🔓 Redigering slået til" : "🔒 Rediger planen";
    btn.setAttribute("aria-pressed", unlocked ? "true" : "false");
    btn.classList.toggle("is-unlocked", unlocked);
  }

  function showAddForm(dayId) {
    var actions = document.querySelector('.day-body-actions[data-day="' + cssEscape(dayId) + '"]');
    if (!actions || actions.querySelector(".add-step-form")) return;

    var form = document.createElement("div");
    form.className = "add-step-form";
    form.innerHTML =
      '<div class="field"><label>Tidspunkt</label><input type="text" class="f-time" placeholder="f.eks. 12:00–13:00"></div>' +
      '<div class="field"><label>Ikon</label><select class="f-icon">' +
      ICON_KEYS.map(function (k) {
        return '<option value="' + k + '">' + k + "</option>";
      }).join("") +
      "</select></div>" +
      '<div class="field"><label>Beskrivelse</label><input type="text" class="f-text" placeholder="Hvad sker der?"></div>' +
      '<div class="field"><label>Farvetone (valgfri)</label><select class="f-tone"><option value="">Standard</option><option value="sea">Hav (blå)</option><option value="olive">Oliven (grøn)</option></select></div>' +
      '<div class="field"><label>Highlight-badge (valgfri)</label><input type="text" class="f-highlight" placeholder="f.eks. Pool-dag"></div>' +
      '<div class="add-step-form-actions">' +
      '<button type="button" class="btn-secondary f-cancel">Annuller</button>' +
      '<button type="button" class="btn-primary f-save">Tilføj</button>' +
      "</div>";
    actions.insertBefore(form, actions.firstChild);
    form.querySelector(".f-time").focus();

    form.querySelector(".f-cancel").addEventListener("click", function () {
      form.remove();
    });
    form.querySelector(".f-save").addEventListener("click", function () {
      var time = form.querySelector(".f-time").value.trim();
      var icon = form.querySelector(".f-icon").value;
      var text = form.querySelector(".f-text").value.trim();
      var tone = form.querySelector(".f-tone").value;
      var highlight = form.querySelector(".f-highlight").value.trim();
      if (!time || !text) {
        showToast("Udfyld mindst tidspunkt og beskrivelse.");
        return;
      }
      var activity = { time: time, icon: icon, text: text };
      if (tone) activity.tone = tone;
      if (highlight) activity.highlight = highlight;
      form.remove();
      withEdit(function (data) {
        var day = data.days.filter(function (d) {
          return d.id === dayId;
        })[0];
        if (day) {
          day.activities = day.activities || [];
          day.activities.push(activity);
        }
        return data;
      }, "Tilføj punkt til " + dayId + " (via siden)");
    });
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, "\\$&");
  }

  function initEditing() {
    updateEditToggle();

    var toggle = document.getElementById("edit-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        if (isEditMode()) {
          if (confirm("Lås redigering af planen igen på denne enhed?")) {
            clearStoredToken();
            updateEditToggle();
            renderTimeline(APP_DATA.days);
            markToday(APP_DATA.days);
          }
        } else {
          openAuthModal(function (ok) {
            updateEditToggle();
            if (ok) {
              renderTimeline(APP_DATA.days);
              markToday(APP_DATA.days);
              showToast("Redigering slået til på denne enhed.");
            }
          });
        }
      });
    }

    var timeline = document.getElementById("timeline");
    if (!timeline) return;

    timeline.addEventListener("click", function (e) {
      var delBtn = e.target.closest(".activity-delete");
      if (delBtn) {
        var dayId = delBtn.getAttribute("data-day");
        var index = parseInt(delBtn.getAttribute("data-index"), 10);
        if (!confirm("Slet dette punkt?")) return;
        withEdit(function (data) {
          var day = data.days.filter(function (d) {
            return d.id === dayId;
          })[0];
          if (day && day.activities) day.activities.splice(index, 1);
          return data;
        }, "Slet punkt fra " + dayId + " (via siden)");
        return;
      }

      var addBtn = e.target.closest(".add-step-btn");
      if (addBtn) {
        showAddForm(addBtn.getAttribute("data-day"));
      }
    });
  }
})();
