```mermaid
classDiagram
  accTitle: Wine and Food classes
  accDescr: Class diagram of the Wine and Food ontology: 21 classes, arrows from each class to its parent, and 5 relationships between classes.
  class Beaujolais {
  }
  class Bordeaux {
  }
  class Chardonnay {
  }
  class DessertWine {
  }
  class Food {
    <<abstract>>
  }
  class Margaux {
  }
  class Medoc {
  }
  class Merlot {
  }
  class Pauillac {
  }
  class Port {
  }
  class RedMeat {
  }
  class RedWine {
    low|moderate|high tanninLevel
  }
  class Riesling {
  }
  class RoseWine {
  }
  class Sauternes {
  }
  class Seafood {
  }
  class WhiteWine {
  }
  class Wine {
    light|medium|full body
    red|white|rose color
    delicate|moderate|strong flavor
    dry|offDry|sweet sugar
  }
  class WineGrape {
  }
  class WineRegion {
  }
  class Winery {
    String location
  }
  RedWine <|-- Beaujolais
  RedWine <|-- Bordeaux
  WhiteWine <|-- Chardonnay
  Wine <|-- DessertWine
  Medoc <|-- Margaux
  Bordeaux <|-- Medoc
  RedWine <|-- Merlot
  Medoc <|-- Pauillac
  DessertWine <|-- Port
  RedWine <|-- Port
  Food <|-- RedMeat
  Wine <|-- RedWine
  WhiteWine <|-- Riesling
  Wine <|-- RoseWine
  DessertWine <|-- Sauternes
  WhiteWine <|-- Sauternes
  Food <|-- Seafood
  Wine <|-- WhiteWine
  Wine --> Food : goesWellWith
  Wine --> WineGrape : grape
  Wine --> Winery : maker
  Winery --> Wine : produces
  Wine --> WineRegion : region
```

Disjoint: Chardonnay ⟂ Riesling · RedWine ⟂ RoseWine · RedWine ⟂ WhiteWine · Seafood ⟂ RedMeat · WhiteWine ⟂ RoseWine
