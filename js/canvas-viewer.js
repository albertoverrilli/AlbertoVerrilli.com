/*
 * canvas-viewer.js — renders an Obsidian .canvas (JSON Canvas) file in the browser.
 *
 * Usage: <div id="canvas-root" data-src="path/to/file.canvas.json"></div>
 *        <script src="js/canvas-viewer.js"></script>
 *
 * Interactions (mirroring Obsidian's canvas):
 *   drag background ........ pan
 *   wheel / pinch .......... zoom (around the cursor)
 *   drag a card ............ move it (dragging a group moves everything inside it)
 *   click a card ........... highlight it and its connections
 *   double-click a card .... zoom to it
 *   double-click background  zoom to fit
 *   keys: + / - zoom, 0 fit, Esc clear selection
 */
(function () {
  "use strict";

  var root = document.getElementById("canvas-root");
  if (!root) return;

  var SVGNS = "http://www.w3.org/2000/svg";
  var MIN_Z = 0.03, MAX_Z = 2.5;

  var data, original;
  var nodeById = {}, elById = {};
  var edgesByNode = {};
  var view = { x: 0, y: 0, z: 1 };
  var selected = null;

  // ---------- DOM scaffolding ----------
  root.classList.add("cv-viewport");
  var world = el("div", "cv-world");
  var svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "cv-edges");
  svg.innerHTML =
    '<defs>' +
    '<marker id="cv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12"' +
    ' markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker>' +
    '</defs>';
  var edgeLayer = document.createElementNS(SVGNS, "g");
  svg.appendChild(edgeLayer);
  var groupLayer = el("div", "cv-layer");
  var nodeLayer = el("div", "cv-layer");
  world.appendChild(groupLayer);
  world.appendChild(svg);
  world.appendChild(nodeLayer);
  root.appendChild(world);

  var bar = el("div", "cv-toolbar");
  bar.appendChild(button("+", "Zoom in", function () { zoomBy(1.25); }));
  bar.appendChild(button("−", "Zoom out", function () { zoomBy(0.8); }));
  bar.appendChild(button("Fit", "Zoom to fit", fit));
  bar.appendChild(button("Reset", "Put every card back where it was", resetLayout));
  root.appendChild(bar);

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function button(txt, title, fn) {
    var b = el("button", "cv-btn"); b.type = "button"; b.textContent = txt; b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", function (ev) { ev.stopPropagation(); fn(); });
    b.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    return b;
  }

  // ---------- tiny markdown ----------
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }
  function markdown(text) {
    var out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } }
    function flushList() { if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } }
    text.split("\n").forEach(function (line) {
      var m = line.match(/^\s*[-*]\s+(.*)$/);
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (m) { flushPara(); (list = list || []).push("<li>" + inline(m[1]) + "</li>"); }
      else if (h) { flushPara(); flushList(); out.push("<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">"); }
      else if (!line.trim()) { flushPara(); flushList(); }
      else { flushList(); para.push(inline(line)); }
    });
    flushPara(); flushList();
    return out.join("");
  }

  // ---------- build ----------
  function build() {
    groupLayer.innerHTML = ""; nodeLayer.innerHTML = "";
    while (edgeLayer.firstChild) edgeLayer.removeChild(edgeLayer.firstChild);
    nodeById = {}; elById = {}; edgesByNode = {};

    data.nodes.forEach(function (n) {
      nodeById[n.id] = n;
      var e;
      if (n.type === "group") {
        e = el("div", "cv-group");
        if (n.label) { var l = el("div", "cv-group-label"); l.textContent = n.label; e.appendChild(l); }
        groupLayer.appendChild(e);
      } else {
        e = el("div", "cv-node");
        var body = el("div", "cv-node-body");
        if (n.type === "text") body.innerHTML = markdown(n.text || "");
        else if (n.type === "link") body.innerHTML = '<a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.url) + "</a>";
        else body.textContent = n.file || "";
        e.appendChild(body);
        e.tabIndex = 0;
        nodeLayer.appendChild(e);
      }
      e.dataset.id = n.id;
      elById[n.id] = e;
      place(n);
      attachDrag(e, n);
    });

    data.edges.forEach(function (ed) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("class", "cv-edge");
      if ((ed.toEnd || "arrow") === "arrow") p.setAttribute("marker-end", "url(#cv-arrow)");
      if (ed.fromEnd === "arrow") p.setAttribute("marker-start", "url(#cv-arrow)");
      ed._path = p;
      edgeLayer.appendChild(p);
      (edgesByNode[ed.fromNode] = edgesByNode[ed.fromNode] || []).push(ed);
      (edgesByNode[ed.toNode] = edgesByNode[ed.toNode] || []).push(ed);
    });
    data.edges.forEach(drawEdge);
    sizeSvg();
  }

  function place(n) {
    var e = elById[n.id];
    e.style.left = n.x + "px"; e.style.top = n.y + "px";
    e.style.width = n.width + "px"; e.style.height = n.height + "px";
  }

  function sizeSvg() {
    var b = bounds(), pad = 400;
    svg.setAttribute("viewBox", (b.x - pad) + " " + (b.y - pad) + " " + (b.w + 2 * pad) + " " + (b.h + 2 * pad));
    svg.style.left = (b.x - pad) + "px"; svg.style.top = (b.y - pad) + "px";
    svg.style.width = (b.w + 2 * pad) + "px"; svg.style.height = (b.h + 2 * pad) + "px";
  }

  function anchor(n, side) {
    switch (side) {
      case "top": return [n.x + n.width / 2, n.y, 0, -1];
      case "bottom": return [n.x + n.width / 2, n.y + n.height, 0, 1];
      case "left": return [n.x, n.y + n.height / 2, -1, 0];
      default: return [n.x + n.width, n.y + n.height / 2, 1, 0];
    }
  }
  function autoSides(a, b) {
    var ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
    if (Math.abs(bx - ax) * 0.6 > Math.abs(by - ay)) return bx > ax ? ["right", "left"] : ["left", "right"];
    return by > ay ? ["bottom", "top"] : ["top", "bottom"];
  }
  function drawEdge(ed) {
    var a = nodeById[ed.fromNode], b = nodeById[ed.toNode];
    if (!a || !b) return;
    var sides = ed._auto ? autoSides(a, b) : [ed.fromSide || autoSides(a, b)[0], ed.toSide || autoSides(a, b)[1]];
    var s = anchor(a, sides[0]), t = anchor(b, sides[1]);
    var d = Math.hypot(t[0] - s[0], t[1] - s[1]);
    var k = Math.max(40, Math.min(200, d / 2.2));
    var tEnd = ((ed.toEnd || "arrow") === "arrow") ? 4 : 0; // leave room for the arrow tip
    var tx = t[0] + t[2] * tEnd, ty = t[1] + t[3] * tEnd;
    ed._path.setAttribute("d",
      "M" + s[0] + "," + s[1] +
      " C" + (s[0] + s[2] * k) + "," + (s[1] + s[3] * k) +
      " " + (tx + t[2] * k) + "," + (ty + t[3] * k) +
      " " + tx + "," + ty);
  }

  // ---------- view ----------
  function apply() {
    world.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.z + ")";
    var g = 24 * view.z;
    while (g < 14) g *= 4; // keep the dot grid from turning into noise when zoomed far out
    root.style.backgroundSize = g + "px " + g + "px";
    root.style.backgroundPosition = view.x + "px " + view.y + "px";
    root.classList.toggle("cv-far", view.z < 0.35);
  }
  function bounds() {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    data.nodes.forEach(function (n) {
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x + n.width); y1 = Math.max(y1, n.y + n.height);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function zoomTo(rect, maxZ, animate) {
    var vw = root.clientWidth, vh = root.clientHeight;
    var z = Math.min(maxZ || MAX_Z, Math.max(MIN_Z, Math.min(vw / rect.w, vh / rect.h) * 0.9));
    var target = { z: z, x: vw / 2 - (rect.x + rect.w / 2) * z, y: vh / 2 - (rect.y + rect.h / 2) * z };
    if (animate === false) { view = target; apply(); return; }
    animateTo(target);
  }
  function fit() { zoomTo(bounds(), 1); }
  function zoomBy(f, cx, cy) {
    if (cx === undefined) { cx = root.clientWidth / 2; cy = root.clientHeight / 2; }
    var z = Math.max(MIN_Z, Math.min(MAX_Z, view.z * f));
    view.x = cx - (cx - view.x) * (z / view.z);
    view.y = cy - (cy - view.y) * (z / view.z);
    view.z = z; apply();
  }
  var anim = null;
  function animateTo(t) {
    cancelAnimationFrame(anim);
    var s = { x: view.x, y: view.y, z: view.z }, t0 = performance.now(), dur = 380;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      view.x = s.x + (t.x - s.x) * e; view.y = s.y + (t.y - s.y) * e; view.z = s.z + (t.z - s.z) * e;
      apply();
      if (p < 1) anim = requestAnimationFrame(step);
    })(t0);
  }

  // ---------- selection ----------
  function select(id) {
    selected = id;
    root.classList.toggle("cv-has-selection", !!id);
    Object.keys(elById).forEach(function (k) { elById[k].classList.remove("cv-selected", "cv-linked"); });
    data.edges.forEach(function (ed) { ed._path.classList.remove("cv-edge-on"); });
    if (!id) return;
    elById[id].classList.add("cv-selected");
    (edgesByNode[id] || []).forEach(function (ed) {
      ed._path.classList.add("cv-edge-on");
      var other = ed.fromNode === id ? ed.toNode : ed.fromNode;
      elById[other].classList.add("cv-linked");
    });
  }

  // ---------- pointer handling ----------
  var pointers = {}, pinch = null, pan = null;

  function attachDrag(e, n) {
    e.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0 || ev.target.closest("a")) return;
      if (Object.keys(pointers).length) return; // second finger: let the viewport pinch
      ev.stopPropagation();
      var start = { x: ev.clientX, y: ev.clientY }, moved = false;
      // a group drags the cards that sit inside it
      var carry = [n];
      if (n.type === "group") {
        data.nodes.forEach(function (m) {
          if (m !== n && m.x >= n.x && m.y >= n.y && m.x + m.width <= n.x + n.width && m.y + m.height <= n.y + n.height) carry.push(m);
        });
      }
      var origin = carry.map(function (m) { return [m.x, m.y]; });
      e.setPointerCapture(ev.pointerId);
      function move(mv) {
        var dx = (mv.clientX - start.x) / view.z, dy = (mv.clientY - start.y) / view.z;
        if (!moved && Math.hypot(dx * view.z, dy * view.z) < 4) return;
        if (!moved) { moved = true; root.classList.add("cv-dragging"); }
        carry.forEach(function (m, i) { m.x = Math.round(origin[i][0] + dx); m.y = Math.round(origin[i][1] + dy); place(m); });
        var touched = {};
        carry.forEach(function (m) { (edgesByNode[m.id] || []).forEach(function (ed) { touched[ed.id] = ed; }); });
        Object.keys(touched).forEach(function (k) { touched[k]._auto = true; drawEdge(touched[k]); });
      }
      function up() {
        e.removeEventListener("pointermove", move);
        e.removeEventListener("pointerup", up);
        e.removeEventListener("pointercancel", up);
        root.classList.remove("cv-dragging");
        if (moved) sizeSvg();
        else if (n.type !== "group") select(selected === n.id ? null : n.id);
        else select(null);
      }
      e.addEventListener("pointermove", move);
      e.addEventListener("pointerup", up);
      e.addEventListener("pointercancel", up);
    });
    e.addEventListener("dblclick", function (ev) {
      ev.stopPropagation();
      zoomTo({ x: n.x - 40, y: n.y - 40, w: n.width + 80, h: n.height + 80 }, n.type === "group" ? 1 : 1.4);
    });
  }

  root.addEventListener("pointerdown", function (ev) {
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    root.setPointerCapture(ev.pointerId);
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      pan = null;
    } else if (ids.length === 1) {
      pan = { x: ev.clientX, y: ev.clientY, moved: false };
      root.classList.add("cv-panning");
    }
  });
  root.addEventListener("pointermove", function (ev) {
    if (!pointers[ev.pointerId]) return;
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(pointers);
    if (pinch && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]], r = root.getBoundingClientRect();
      var d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      view.x += cx - pinch.cx; view.y += cy - pinch.cy;
      zoomBy(d / pinch.d, cx - r.left, cy - r.top);
      pinch = { d: d, cx: cx, cy: cy };
    } else if (pan) {
      var dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) pan.moved = true;
      view.x += dx; view.y += dy; pan.x = ev.clientX; pan.y = ev.clientY; apply();
    }
  });
  function release(ev) {
    delete pointers[ev.pointerId];
    if (Object.keys(pointers).length < 2) pinch = null;
    if (!Object.keys(pointers).length) {
      if (pan && !pan.moved && ev.type === "pointerup") select(null);
      pan = null; root.classList.remove("cv-panning");
    }
  }
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);
  root.addEventListener("dblclick", function () { fit(); });

  root.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var r = root.getBoundingClientRect();
    if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) >= 50 || ev.deltaMode !== 0) {
      // mouse wheel or trackpad pinch → zoom
      var dy = ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY;
      zoomBy(Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0015)), ev.clientX - r.left, ev.clientY - r.top);
    } else {
      // two-finger trackpad scroll → pan
      view.x -= ev.deltaX; view.y -= ev.deltaY; apply();
    }
  }, { passive: false });

  window.addEventListener("keydown", function (ev) {
    if (ev.target.closest && ev.target.closest("input,textarea")) return;
    if (ev.key === "+" || ev.key === "=") zoomBy(1.25);
    else if (ev.key === "-" || ev.key === "_") zoomBy(0.8);
    else if (ev.key === "0") fit();
    else if (ev.key === "Escape") select(null);
    else if (ev.key === "Enter" && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id) {
      select(document.activeElement.dataset.id);
    }
  });
  window.addEventListener("resize", function () { if (data) apply(); });

  function resetLayout() {
    data = JSON.parse(JSON.stringify(original));
    build(); select(null); fit();
  }

  // ---------- load ----------
  fetch(root.dataset.src)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (json) {
      original = json;
      data = JSON.parse(JSON.stringify(json));
      build();
      zoomTo(bounds(), 1, false);
    })
    .catch(function (err) {
      root.innerHTML = '<p class="cv-error">Could not load the canvas (' + esc(String(err.message || err)) + ").</p>";
    });
})();
