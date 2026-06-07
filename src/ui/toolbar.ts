import { getState, clearTrack, setTrack } from "../state/store";
import { saveTrack, loadTrack, listTracks } from "../state/persistence";
import { exportPng } from "./export";

export function mountToolbar(el: HTMLElement) {
  el.replaceChildren();

  const title = document.createElement("h1");
  title.textContent = "Scalextric Track Designer";
  el.appendChild(title);

  el.appendChild(
    makeButton("New", () => {
      if (
        getState().track.pieces.length > 0 &&
        !confirm("Discard current track?")
      )
        return;
      clearTrack();
    }),
  );

  el.appendChild(
    makeButton("Save", () => {
      const current = getState().track;
      const name = prompt("Save as:", current.name || "untitled");
      if (!name) return;
      saveTrack({ ...current, name });
    }),
  );

  el.appendChild(
    makeButton("Load", () => {
      const names = listTracks();
      if (names.length === 0) {
        alert("No saved tracks.");
        return;
      }
      const name = prompt(`Load which?\n\n${names.join("\n")}`, names[0]);
      if (!name) return;
      const track = loadTrack(name);
      if (!track) {
        alert(`Not found: ${name}`);
        return;
      }
      setTrack(track);
    }),
  );

  el.appendChild(
    makeButton("Export PNG", () => {
      exportPng(`${getState().track.name || "track"}.png`);
    }),
  );

  const spacer = document.createElement("div");
  spacer.className = "spacer";
  el.appendChild(spacer);
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  // Prevent the button from grabbing focus on click so Space afterwards arms
  // pan rather than re-firing the button's action.
  b.addEventListener("mousedown", (ev) => ev.preventDefault());
  b.addEventListener("click", onClick);
  return b;
}