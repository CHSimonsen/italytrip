(function () {
  "use strict";

  function dbg(msg) {
    console.log("[rejseplan] " + msg);
  }
  window.addEventListener("error", function (e) {
    console.error("[rejseplan] Script-fejl:", e.message, e.filename, e.lineno);
  });
  window.addEventListener("unhandledrejection", function (e) {
    console.error("[rejseplan] Uventet fejl (promise):", e.reason);
  });

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
    var actionsHtml = "";
    if (isEditMode()) {
      actionsHtml =
        '<span class="activity-actions">' +
        '<button type="button" class="activity-edit" data-day="' +
        esc(dayId) +
        '" data-index="' +
        index +
        '" aria-label="Rediger dette punkt"><svg class="icon"><use href="#icon-pencil"></use></svg></button>' +
        '<button type="button" class="activity-delete" data-day="' +
        esc(dayId) +
        '" data-index="' +
        index +
        '" aria-label="Slet dette punkt"><svg class="icon"><use href="#icon-trash"></use></svg></button>' +
        "</span>";
    }
    return (
      '<div class="activity" data-index="' +
      index +
      '">' +
      '<span class="activity-body">' +
      '<span class="activity-time">' +
      esc(act.time) +
      "</span>" +
      '<p class="activity-text">' +
      esc(act.text) +
      "</p>" +
      "</span>" +
      actionsHtml +
      "</div>"
    );
  }

  function renderAddStepButton(dayId) {
    if (!isEditMode()) return "";
    return '<button type="button" class="add-step-btn" data-day="' + esc(dayId) + '">+ Tilføj punkt</button>';
  }

  function renderDay(day, isFirst) {
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

  /* ---------- Auth modal ----------
     Uses ONE delegated listener registered at module load (below),
     not per-open listeners on the buttons — a direct listener attached
     to #auth-submit each time the modal opened was mysteriously not
     firing on at least one real device even though the click clearly
     reached the button (confirmed via the delegated debug logger), so
     this reuses the delegation pattern that's proven to work instead
     of chasing that further. */
  var authCallback = null;

  function openAuthModal(onDone) {
    var backdrop = document.getElementById("auth-modal");
    var input = document.getElementById("auth-input");
    var error = document.getElementById("auth-error");
    if (!backdrop || !input || !error) return;
    authCallback = onDone;
    error.hidden = true;
    input.value = "";
    backdrop.hidden = false;
    input.focus();
  }

  function closeAuthModal() {
    var backdrop = document.getElementById("auth-modal");
    if (backdrop) backdrop.hidden = true;
  }

  function handleAuthCancel() {
    closeAuthModal();
    var cb = authCallback;
    authCallback = null;
    if (cb) cb(false);
  }

  function handleAuthSubmit() {
    var input = document.getElementById("auth-input");
    var error = document.getElementById("auth-error");
    var submitBtn = document.getElementById("auth-submit");
    if (!input || !error || !submitBtn) return;
    try {
      var token = input.value.trim();
      dbg("handleAuthSubmit kørt. Token-længde: " + token.length);
      if (!token) return;
      submitBtn.disabled = true;
      submitBtn.textContent = "Tjekker …";
      error.hidden = true;
      githubGetFile(token)
        .then(function () {
          dbg("Login OK.");
          setStoredToken(token);
          submitBtn.disabled = false;
          submitBtn.textContent = "Lås op";
          closeAuthModal();
          var cb = authCallback;
          authCallback = null;
          if (cb) cb(true);
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
          dbg(
            "FEJL ved forespørgsel: " +
              msg +
              (err && err.status ? " (status " + err.status + ")" : "") +
              (err && err.network ? " [netværk/CORS]" : "")
          );
        });
    } catch (syncErr) {
      dbg("UVENTET SCRIPT-FEJL i handleAuthSubmit: " + (syncErr && syncErr.message ? syncErr.message : syncErr));
    }
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("#auth-submit")) {
        handleAuthSubmit();
        return;
      }
      if (e.target.closest("#auth-cancel")) {
        handleAuthCancel();
        return;
      }
    },
    true
  );

  document.addEventListener("keydown", function (e) {
    var backdrop = document.getElementById("auth-modal");
    if (!backdrop || backdrop.hidden) return;
    if (e.target && e.target.id === "auth-input") {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAuthSubmit();
      }
      if (e.key === "Escape") handleAuthCancel();
    }
  });

  function updateEditToggle() {
    var btn = document.getElementById("edit-toggle");
    if (!btn) return;
    var unlocked = isEditMode();
    btn.textContent = unlocked ? "🔓 Redigering slået til" : "🔒 Rediger planen";
    btn.setAttribute("aria-pressed", unlocked ? "true" : "false");
    btn.classList.toggle("is-unlocked", unlocked);
  }

  /* Time is a real <input type="time"> (start required, end optional),
     never free text — this both prevents inconsistent formats and
     gives every activity a reliable sort key, so days auto-sort by
     start time on every save instead of needing manual positioning. */
  function parseStartMinutes(timeStr) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(timeStr || "").trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function pad2Time(t) {
    var parts = t.split(":");
    return pad(parseInt(parts[0], 10)) + ":" + pad(parseInt(parts[1], 10));
  }

  function parseTimeRange(timeStr) {
    var s = String(timeStr || "").trim();
    var m = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(s);
    if (m) return { start: pad2Time(m[1]), end: pad2Time(m[2]) };
    var m2 = /^(\d{1,2}:\d{2})$/.exec(s);
    if (m2) return { start: pad2Time(m2[1]), end: "" };
    return { start: "", end: "" };
  }

  function formatTimeRange(start, end) {
    return end ? start + "–" + end : start;
  }

  function sortDayActivities(day) {
    if (!day || !day.activities) return;
    day.activities.sort(function (a, b) {
      var ta = parseStartMinutes(a.time);
      var tb = parseStartMinutes(b.time);
      if (ta == null) ta = Infinity;
      if (tb == null) tb = Infinity;
      return ta - tb;
    });
  }

  function stepFieldsHtml(prefix, vals) {
    var range = parseTimeRange(vals.time);
    return (
      '<div class="field-row">' +
      '<div class="field"><label>Fra</label><input type="time" class="f-time-start" value="' +
      esc(range.start) +
      '"></div>' +
      '<div class="field"><label>Til (valgfri)</label><input type="time" class="f-time-end" value="' +
      esc(range.end) +
      '"></div>' +
      "</div>" +
      '<div class="field"><label>Beskrivelse</label><input type="text" class="f-text" placeholder="Hvad sker der?" value="' +
      esc(vals.text) +
      '"></div>' +
      '<div class="add-step-form-actions">' +
      '<button type="button" class="btn-secondary f-cancel">Annuller</button>' +
      '<button type="button" class="btn-primary f-save">' +
      esc(prefix) +
      "</button>" +
      "</div>"
    );
  }

  function readStepForm(form) {
    var start = form.querySelector(".f-time-start").value;
    var end = form.querySelector(".f-time-end").value;
    var text = form.querySelector(".f-text").value.trim();
    if (!start || !text) {
      showToast("Angiv mindst starttidspunkt og beskrivelse.");
      return null;
    }
    return { time: formatTimeRange(start, end), text: text };
  }

  function showAddForm(dayId) {
    var actions = document.querySelector('.day-body-actions[data-day="' + cssEscape(dayId) + '"]');
    if (!actions || actions.querySelector(".add-step-form")) return;

    var form = document.createElement("div");
    form.className = "add-step-form";
    form.innerHTML = stepFieldsHtml("Tilføj", { time: "", text: "" });
    actions.insertBefore(form, actions.firstChild);
    form.querySelector(".f-time-start").focus();

    form.querySelector(".f-cancel").addEventListener("click", function () {
      form.remove();
    });
    form.querySelector(".f-save").addEventListener("click", function () {
      var activity = readStepForm(form);
      if (!activity) return;
      form.remove();
      withEdit(function (data) {
        var day = data.days.filter(function (d) {
          return d.id === dayId;
        })[0];
        if (day) {
          day.activities = day.activities || [];
          day.activities.push(activity);
          sortDayActivities(day);
        }
        return data;
      }, "Tilføj punkt til " + dayId + " (via siden)");
    });
  }

  function showEditForm(dayId, index) {
    var list = document.querySelector('.activity-list[data-day="' + cssEscape(dayId) + '"]');
    if (!list) return;
    var activityEl = list.querySelector('.activity[data-index="' + index + '"]');
    if (!activityEl) return;
    if (activityEl.nextElementSibling && activityEl.nextElementSibling.classList.contains("add-step-form")) return;

    var day = (APP_DATA.days || []).filter(function (d) {
      return d.id === dayId;
    })[0];
    var act = day && day.activities && day.activities[index];
    if (!act) return;

    activityEl.style.display = "none";

    var form = document.createElement("div");
    form.className = "add-step-form";
    form.innerHTML = stepFieldsHtml("Gem", act);
    activityEl.insertAdjacentElement("afterend", form);
    form.querySelector(".f-time-start").focus();

    form.querySelector(".f-cancel").addEventListener("click", function () {
      form.remove();
      activityEl.style.display = "";
    });
    form.querySelector(".f-save").addEventListener("click", function () {
      var edited = readStepForm(form);
      if (!edited) return;
      form.remove();
      withEdit(function (data) {
        var d = data.days.filter(function (dd) {
          return dd.id === dayId;
        })[0];
        if (d && d.activities && d.activities[index]) {
          d.activities[index] = edited;
          sortDayActivities(d);
        }
        return data;
      }, "Ret punkt i " + dayId + " (via siden)");
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
      var editBtn = e.target.closest(".activity-edit");
      if (editBtn) {
        showEditForm(editBtn.getAttribute("data-day"), parseInt(editBtn.getAttribute("data-index"), 10));
        return;
      }

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
