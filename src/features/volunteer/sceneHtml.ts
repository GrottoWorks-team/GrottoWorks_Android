// Sinh HTML + JS vẽ MỘT LỚP thi công (phối cảnh trục đo) để nhúng vào WebView.
//
// Phạm vi: TNV chỉ cần xem LỚP được gắn với nhiệm vụ mình đã nhận — không cần
// xem toàn bộ công trình. Vì vậy scene truyền vào đây đã được lọc sẵn (chỉ layer
// + item của nhiệm vụ). Không có "tách lớp" vì chỉ còn 1 lớp.
//
// Vì sao canvas 2D thay vì three.js: app Expo chưa có `three`/`expo-gl`; canvas
// 2D + phép chiếu đủ để demo (xoay được) mà không thêm thư viện nặng, chạy
// offline và ổn định trên Expo Go. Khi BE có `design-scene` + model `.glb` thật
// sẽ thay bằng WebView + GLTFLoader hoặc renderer native.
import type { MockScene } from './mockScene'

export function buildSceneHtml(scene: MockScene): string {
  // Chỉ đưa dữ liệu cần vẽ sang WebView.
  const payload = {
    layers: scene.layers.map((l) => ({ id: l.id, order: l.order })),
    items: scene.items.map((i) => ({
      id: i.id,
      layerId: i.layerId,
      size: i.size,
      position: i.position,
      color: i.color,
    })),
  }

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; height: 100%; background: #F8F9FA; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style></head>
<body><canvas id="c"></canvas>
<script>
(function () {
  var SCENE = ${JSON.stringify(payload)};
  var PITCH = 0.62;
  var DEFAULT_YAW = 0.62;

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var W = 1, H = 1, yaw = DEFAULT_YAW, dragging = null;

  function shade(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    function c(n) { return Math.max(0, Math.min(255, Math.round(n * f))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }

  function project(x, y, z, scale, cx, baseY) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var rx = x * cy - z * sy;
    var rz = x * sy + z * cy;
    var vy = y * Math.cos(PITCH) - rz * Math.sin(PITCH);
    // Camera ở TRÊN nhìn xuống → y cao hơn là GẦN hơn (depth nhỏ hơn).
    var depth = -y * Math.sin(PITCH) + rz * Math.cos(PITCH);
    return [cx + rx * scale, baseY - vy * scale, depth];
  }

  function drawGround(scale, cx, baseY) {
    var g = 4.2;
    var pts = [[-g, 0, -g], [g, 0, -g], [g, 0, g], [-g, 0, g]].map(function (p) {
      return project(p[0], p[1], p[2], scale, cx, baseY);
    });
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#DEE7E1';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(43,45,66,0.08)';
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var scale = Math.min(W, H) / 6.2;
    var cx = W / 2;
    var baseY = H * 0.8;
    drawGround(scale, cx, baseY);

    var faces = [];
    SCENE.items.forEach(function (it) {
      var hx = it.size[0] / 2, hz = it.size[2] / 2;
      var x0 = it.position[0] - hx, x1 = it.position[0] + hx;
      var y0 = it.position[1], y1 = it.position[1] + it.size[1];
      var z0 = it.position[2] - hz, z1 = it.position[2] + hz;
      var v = [
        [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
        [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]
      ].map(function (p) { return project(p[0], p[1], p[2], scale, cx, baseY); });

      var defs = [
        { idx: [4, 5, 6, 7], f: 1.0 },
        { idx: [1, 2, 6, 5], f: 0.82 },
        { idx: [0, 1, 5, 4], f: 0.74 },
        { idx: [3, 0, 4, 7], f: 0.68 },
        { idx: [2, 3, 7, 6], f: 0.62 },
        { idx: [0, 3, 2, 1], f: 0.5 }
      ];
      defs.forEach(function (d) {
        var pts = d.idx.map(function (k) { return v[k]; });
        faces.push({
          pts: pts,
          fill: shade(it.color, d.f),
          stroke: 'rgba(43,45,66,0.22)',
          lw: 1,
          depth: (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4
        });
      });
    });

    faces.sort(function (a, b) { return b.depth - a.depth; });
    faces.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (var i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = f.fill;
      ctx.fill();
      ctx.lineWidth = f.lw;
      ctx.strokeStyle = f.stroke;
      ctx.stroke();
    });
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rect.width;
    H = rect.height;
    draw();
  }

  canvas.addEventListener('pointerdown', function (e) {
    dragging = { x: e.clientX, yaw: yaw };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    yaw = dragging.yaw + (e.clientX - dragging.x) * 0.01;
    draw();
  });
  function endDrag(e) {
    dragging = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.__resetView = function () { yaw = DEFAULT_YAW; draw(); };
  window.addEventListener('resize', resize);

  resize();
})();
</script>
</body></html>`
}
