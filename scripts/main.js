/**
 * Fahrzeug-Reise & Tag/Nacht-Uhr
 * Portiert aus Phase 11 (DnD-Programm-Webapp).
 */
const { Application } = foundry.appv1.api;

const MOD = "vehicle-travel";
const SOCKET = `module.${MOD}`;

Hooks.once("init", () => {
  game.settings.register(MOD, "activeRoute", {
    scope: "world",
    config: false,
    type: Object,
    default: null
  });
});

function isDay(hour) {
  return hour >= 6 && hour < 20;
}

class VehicleTravelApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vehicle-travel-app",
      title: "Reise",
      width: 460,
      height: "auto",
      resizable: true
    });
  }

  async _renderInner() {
    const route = game.settings.get(MOD, "activeRoute");
    const sceneOptions = game.scenes.contents.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    const el = document.createElement("div");
    if (!route) {
      el.innerHTML = `
        <div class="vehicle-travel-app">
          <h3>Neue Route</h3>
          <div class="form-group"><label>Startstunde</label><input type="number" name="startHour" value="8" min="0" max="23"/></div>
          <div class="form-group"><label>Fahrzeug-Szene (optional)</label><select name="sceneId"><option value="">(keine)</option>${sceneOptions}</select></div>
          <div data-waypoints></div>
          <button type="button" data-action="add-waypoint">+ Wegpunkt</button>
          <hr/>
          <button type="button" data-action="start-route">Route starten</button>
        </div>
      `;
      const html = $(el.firstElementChild);
      const addRow = () => {
        html.find("[data-waypoints]").append(`
          <div class="waypoint-row">
            <input type="text" class="wp-name" placeholder="Name"/>
            <input type="number" class="wp-hours" placeholder="Std." min="0" style="width:60px"/>
            <label><input type="checkbox" class="wp-rest"/> Rast</label>
          </div>
        `);
      };
      addRow();
      html.find("[data-action=add-waypoint]").on("click", addRow);
      html.find("[data-action=start-route]").on("click", () => {
        const waypoints = html.find(".waypoint-row").toArray().map(row => ({
          name: $(row).find(".wp-name").val() || "Wegpunkt",
          hours: Number($(row).find(".wp-hours").val()) || 0,
          rest: $(row).find(".wp-rest").is(":checked")
        }));
        VehicleTravel.startRoute({
          waypoints,
          currentIndex: 0,
          startHour: Number(html.find("[name=startHour]").val()) || 8,
          dayCount: 1,
          hour: Number(html.find("[name=startHour]").val()) || 8,
          sceneId: html.find("[name=sceneId]").val() || null
        });
        this.render(true);
      });
      return html;
    }

    const current = route.waypoints[route.currentIndex];
    const next = route.waypoints[route.currentIndex + 1];
    el.innerHTML = `
      <div class="vehicle-travel-app">
        <div class="clock">${isDay(route.hour) ? "☀" : "🌙"} Tag ${route.dayCount}, ${String(route.hour).padStart(2, "0")}:00 Uhr</div>
        <p>Aktueller Wegpunkt: <strong>${current?.name ?? "Start"}</strong></p>
        ${next ? `<p>Naechster: <strong>${next.name}</strong> (${next.hours}h${next.rest ? ", Rast" : ""})</p>` : "<p><em>Route abgeschlossen.</em></p>"}
        ${next ? `<button type="button" data-action="advance">Naechster Wegpunkt</button>` : ""}
        ${route.sceneId ? `<button type="button" data-action="activate-scene">Fahrzeug-Szene aktivieren</button>` : ""}
        <button type="button" data-action="end-route">Route beenden</button>
      </div>
    `;
    const html = $(el.firstElementChild);
    html.find("[data-action=advance]").on("click", () => {
      VehicleTravel.advance();
      this.render(true);
    });
    html.find("[data-action=activate-scene]").on("click", () => game.scenes.get(route.sceneId)?.activate());
    html.find("[data-action=end-route]").on("click", async () => {
      await VehicleTravel.setRoute(null);
      this.render(true);
    });
    return html;
  }
}

class VehicleTravel {
  static async setRoute(route) {
    await game.settings.set(MOD, "activeRoute", route);
    game.socket.emit(SOCKET, { type: "sync" });
    VehicleTravelHud.refresh();
  }

  static async startRoute(route) {
    await VehicleTravel.setRoute(route);
  }

  static async advance() {
    const route = game.settings.get(MOD, "activeRoute");
    if (!route) return;
    const wp = route.waypoints[route.currentIndex + 1];
    if (!wp) return;
    route.currentIndex += 1;
    route.hour += wp.hours;
    while (route.hour >= 24) {
      route.hour -= 24;
      route.dayCount += 1;
    }
    await game.settings.set(MOD, "activeRoute", route);
    game.socket.emit(SOCKET, { type: "sync" });
    ChatMessage.create({
      content: `Die Gruppe erreicht "${wp.name}" (Tag ${route.dayCount}, ${String(route.hour).padStart(2, "0")}:00 Uhr).${wp.rest ? " Die Gruppe legt eine Rast ein." : ""}`
    });
    VehicleTravelHud.refresh();
  }
}

class VehicleTravelHud extends Application {
  static instance = null;

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vehicle-travel-hud",
      popOut: false
    });
  }

  static refresh() {
    if (!VehicleTravelHud.instance) VehicleTravelHud.instance = new VehicleTravelHud();
    VehicleTravelHud.instance.render(true);
  }

  async _render(force, options) {
    let el = document.getElementById("vehicle-travel-hud");
    if (!el) {
      el = document.createElement("div");
      el.id = "vehicle-travel-hud";
      document.body.appendChild(el);
    }
    const route = game.settings.get(MOD, "activeRoute");
    el.innerHTML = route ? `<div class="vt-hud">${isDay(route.hour) ? "☀" : "🌙"} Tag ${route.dayCount}, ${String(route.hour).padStart(2, "0")}:00</div>` : "";
  }
}

Hooks.on("ready", () => {
  game.socket.on(SOCKET, () => VehicleTravelHud.refresh());
  VehicleTravelHud.refresh();
});

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools["vehicle-travel"] = {
    name: "vehicle-travel",
    title: "Reise",
    icon: "fa-solid fa-route",
    button: true,
    visible: game.user.isGM,
    order: Object.keys(controls.tokens.tools).length,
    onChange: () => new VehicleTravelApp().render(true)
  };
});
