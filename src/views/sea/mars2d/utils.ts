export function offsetPathMeters(
  map: any,
  latlngs: Array<{ lat: number; lng: number }>,
  offsetMeters: number
): Array<{ lat: number; lng: number }> {
  if (!latlngs || latlngs.length < 2 || offsetMeters === 0) return latlngs;

  // 用当前 zoom 来做投影（像素坐标系）
  const z = map.getZoom?.() ?? 10;

  // 估算：1 像素对应多少米（用第一个点附近估算即可）
  const p0 = map.project(latlngs[0], z);
  const p1 = map.project(
    { lat: latlngs[0].lat + 0.001, lng: latlngs[0].lng },
    z
  );
  const metersPerPixel =
    (111_000 * 0.001) / Math.max(1e-6, Math.abs(p1.y - p0.y)); // 粗略但够用
  const offsetPx = offsetMeters / metersPerPixel;

  const out: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < latlngs.length; i++) {
    const a = latlngs[Math.max(0, i - 1)];
    const b = latlngs[Math.min(latlngs.length - 1, i + 1)];

    const pa = map.project(a, z);
    const pb = map.project(b, z);

    // 切向量
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;

    // 法向量（左侧偏移），右侧用 -offsetPx
    const nx = -dy / len;
    const ny = dx / len;

    const p = map.project(latlngs[i], z);
    const shifted = { x: p.x + nx * offsetPx, y: p.y + ny * offsetPx };

    const ll = map.unproject(shifted, z);
    out.push({ lat: ll.lat, lng: ll.lng });
  }

  return out;
}
