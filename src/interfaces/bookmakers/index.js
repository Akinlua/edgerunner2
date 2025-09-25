import BetKingBookmaker from './betking/index.js';

const interfaces = {
  betking: (config, browser, store) => new BetKingBookmaker(config, browser, store),
};

export function getBookmakerInterface(name, config, browser, store) {
  const bookmakerFactory = interfaces[name.toLowerCase()];
  if (!bookmakerFactory) {
    throw new Error(`No bookmaker found for name: ${name}`);
  }
  return bookmakerFactory(config, browser, store);
}
