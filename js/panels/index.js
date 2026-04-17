import { renderPanelIdentity } from "./panel1-identity.js";
import { renderPanelMap } from "./panel2-map.js";
import { renderPanelMarket } from "./panel3-market.js";
import { renderPanelSchools } from "./panel4-schools.js";
import { renderPanelTransport } from "./panel5-transport.js";
import { renderPanelUtilities } from "./panel6-utilities.js";
import { renderPanelRisk } from "./panel7-risk.js";

export function renderAllPanels(state) {
  renderPanelIdentity(state);
  renderPanelMap(state);
  renderPanelMarket(state);
  renderPanelSchools(state);
  renderPanelTransport(state);
  renderPanelUtilities(state);
  renderPanelRisk(state);
}

export {
  renderPanelIdentity,
  renderPanelMap,
  renderPanelMarket,
  renderPanelSchools,
  renderPanelTransport,
  renderPanelUtilities,
  renderPanelRisk,
};
