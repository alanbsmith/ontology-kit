// Wine and Food: exported by okb (meta-KB 2.3.0)
// Every node carries okbId. To re-import, first run: MATCH (n) WHERE n.okbId IS NOT NULL DETACH DELETE n;
// 2 class-level relationship value(s) point at classes (e.g. RedWine GOES_WELL_WITH RedMeat), not instances, so they're only exported with --with-schema.
// Inverse relationships are stored once: produces = MAKER followed backwards.

CREATE (:Winery {okbId: "i.chateau-morgon", name: "Chateau Morgon", location: "Beaujolais, France"});
CREATE (:Winery {okbId: "i.sterling-vineyards", name: "Sterling Vineyards", location: "Napa Valley, California"});
CREATE (:WineGrape {okbId: "i.gamay", name: "Gamay"});
CREATE (:WineGrape {okbId: "i.merlot-grape", name: "Merlot grape"});
CREATE (:WineGrape {okbId: "i.chardonnay-grape", name: "Chardonnay grape"});
CREATE (:WineGrape {okbId: "i.riesling-grape", name: "Riesling grape"});
CREATE (:WineRegion {okbId: "i.beaujolais-region", name: "Beaujolais region"});
CREATE (:Beaujolais:RedWine:Wine {okbId: "i.chateau-morgon-beaujolais", name: "Chateau Morgon Beaujolais", tanninLevel: "low", color: "red", body: "light", flavor: "delicate", sugar: "dry"});
CREATE (:Merlot:RedWine:Wine {okbId: "i.sterling-vineyards-merlot", name: "Sterling Vineyards Merlot", tanninLevel: "moderate", color: "red", body: "medium", flavor: "moderate", sugar: "dry"});

MATCH (a {okbId: "i.sterling-vineyards-merlot"}), (b {okbId: "i.merlot-grape"}) CREATE (a)-[:GRAPE {inheritedFrom: "Merlot"}]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais"}), (b {okbId: "i.gamay"}) CREATE (a)-[:GRAPE]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais"}), (b {okbId: "i.chateau-morgon"}) CREATE (a)-[:MAKER]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais"}), (b {okbId: "i.beaujolais-region"}) CREATE (a)-[:REGION]->(b);
MATCH (a {okbId: "i.sterling-vineyards-merlot"}), (b {okbId: "i.sterling-vineyards"}) CREATE (a)-[:MAKER]->(b);
