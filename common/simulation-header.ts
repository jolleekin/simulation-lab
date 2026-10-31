export function createSimulationHeader(
  title: string,
  subtitle: string,
  icon: string,
): HTMLElement {
  const header = document.createElement("header");
  header.className = "simulation-header";
  header.innerHTML = `
    <a class="simulations-link" href="../">All simulations</a>
    <div class="brand-mark" aria-hidden="true"></div>
    <div class="simulation-brand">
      <h1></h1>
      <p></p>
    </div>
    <div class="simulation-header-extra"></div>
  `;
  header.querySelector(".brand-mark")!.textContent = icon;
  header.querySelector("h1")!.textContent = title;
  header.querySelector("p")!.textContent = subtitle;
  return header;
}
