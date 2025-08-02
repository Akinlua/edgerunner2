import * as betKingIntegration from './integrations/betking/index.js';

const integrations = {
    betking: betKingIntegration,
};

export function getBookmakerIntegration(name) {
    const integration = integrations[name.toLowerCase()];
    if (!integration) {
        throw new Error(`No provider found for bookmaker: ${name}`);
    }
    return integration;
}
