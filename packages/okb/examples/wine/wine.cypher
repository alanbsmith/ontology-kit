// Wine and Food: exported by okb (meta-KB 2.4.3)
// Every node carries okbId. To re-import, first run: MATCH (n) WHERE n.okbId IS NOT NULL DETACH DELETE n;
// 2 class-level relationship value(s) point at classes (e.g. RedWine GOES_WELL_WITH RedMeat), not instances, so they're only exported with --with-schema.
// Inverse relationships are stored once: produces = MAKER followed backwards.

CREATE (:WineRegion {okbId: "i.beaujolais-region-jz521c", name: "Beaujolais region"});
CREATE (:WineGrape {okbId: "i.chardonnay-grape-jwb195", name: "Chardonnay grape"});
CREATE (:Beaujolais:RedWine:Wine {okbId: "i.chateau-morgon-beaujolais-ygb1b8", name: "Chateau Morgon Beaujolais", tanninLevel: "low", body: "light", color: "red", flavor: "delicate", sugar: "dry"});
CREATE (:Winery {okbId: "i.chateau-morgon-ypqfhf", name: "Chateau Morgon", location: "Beaujolais, France"});
CREATE (:WineGrape {okbId: "i.gamay-kfjm22", name: "Gamay"});
CREATE (:WineGrape {okbId: "i.merlot-grape-egah0e", name: "Merlot grape"});
CREATE (:WineGrape {okbId: "i.riesling-grape-139wgt", name: "Riesling grape"});
CREATE (:Winery {okbId: "i.sterling-vineyards-agkt52", name: "Sterling Vineyards", location: "Napa Valley, California"});
CREATE (:Merlot:RedWine:Wine {okbId: "i.sterling-vineyards-merlot-8nm0jf", name: "Sterling Vineyards Merlot", tanninLevel: "moderate", body: "medium", color: "red", flavor: "moderate", sugar: "dry"});

MATCH (a {okbId: "i.sterling-vineyards-merlot-8nm0jf"}), (b {okbId: "i.merlot-grape-egah0e"}) CREATE (a)-[:GRAPE {inheritedFrom: "Merlot"}]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais-ygb1b8"}), (b {okbId: "i.gamay-kfjm22"}) CREATE (a)-[:GRAPE]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais-ygb1b8"}), (b {okbId: "i.chateau-morgon-ypqfhf"}) CREATE (a)-[:MAKER]->(b);
MATCH (a {okbId: "i.chateau-morgon-beaujolais-ygb1b8"}), (b {okbId: "i.beaujolais-region-jz521c"}) CREATE (a)-[:REGION]->(b);
MATCH (a {okbId: "i.sterling-vineyards-merlot-8nm0jf"}), (b {okbId: "i.sterling-vineyards-agkt52"}) CREATE (a)-[:MAKER]->(b);
