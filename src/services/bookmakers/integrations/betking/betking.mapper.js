export const sportIdMapper = {
    '1': 'F', // Football
    '3': 'B', // Basketball
};

export const lineTypeMapper = {
    "money_line": {
        name: "1x2",
        outcome: { "home": "1", "draw": "x", "away": "2" }
    },
    "total": {
        name: "Total Goals",
        outcome: { "over": "Over", "under": "Under" }
    },
    "spread": {
        name: "Handicap",
        outcome: { "home": "Home", "away": "Away" }
    }
};
