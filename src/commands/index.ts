import * as friday from "./fridayChecker";
import * as ipChecker from "./ipChecker";
import * as launchServer from "./launchServer";
import * as stopServer from "./stopServer";
import * as grandExchange from "./grandExchange";
import * as weather from "./weather";
import * as randomDuck from "./randomDuck";
import * as randomCat from "./randomCat";
import * as playAudio from "./playAudio";
import * as stopAudio from "./stopAudio";
import * as playYoutube from "./playYoutube";

// Export commands by their .data.name property
export const commands = [
  friday,
  ipChecker,
  launchServer,
  stopServer,
  grandExchange,
  weather,
  randomDuck,
  randomCat,
  playAudio,
  stopAudio,
  playYoutube
];
