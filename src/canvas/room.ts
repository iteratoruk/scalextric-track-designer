const NS = "http://www.w3.org/2000/svg";

export function renderRoom(w: number, h: number): SVGElement[] {
  const room = document.createElementNS(NS, "rect");
  room.setAttribute("x", "0");
  room.setAttribute("y", "0");
  room.setAttribute("width", String(w));
  room.setAttribute("height", String(h));
  room.setAttribute("class", "room");

  const grid = document.createElementNS(NS, "g");
  grid.setAttribute("class", "grid");

  const minor = 100;
  const major = 500;
  for (let x = 0; x <= w; x += minor) {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", String(x));
    l.setAttribute("x2", String(x));
    l.setAttribute("y1", "0");
    l.setAttribute("y2", String(h));
    if (x % major === 0) l.setAttribute("class", "major");
    grid.appendChild(l);
  }
  for (let y = 0; y <= h; y += minor) {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", "0");
    l.setAttribute("x2", String(w));
    l.setAttribute("y1", String(y));
    l.setAttribute("y2", String(y));
    if (y % major === 0) l.setAttribute("class", "major");
    grid.appendChild(l);
  }

  return [room, grid];
}