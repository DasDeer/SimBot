import * as friday from "./fridayChecker";
import * as ipChecker from "./ipChecker";
import * as launchServer from "./launchServer";
import * as stopServer from "./stopServer";
import * as grandExchange from "./grandExchange";
import * as weather from "./weather";

// Export commands by their .data.name property
export const commands = [
  friday,
  ipChecker,
  launchServer,
  stopServer,
  grandExchange,
  weather
];
