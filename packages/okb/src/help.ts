/** The text of `okb help`. Its own module so the docs generator can read it without running the CLI. */
export const HELP = `okb: build an ontology step by step (Ontology 101 method)

Getting started
  okb init <folder> --name "Wine and Food"     create a new ontology
  okb status                                  where you are and what to do next
  okb step [n|next|prev]                      move between steps and show the guide
  okb explain [topic]                         learn a concept, rule, step (e.g. okb explain 5) or decision guide
  okb validate [--all] [--why] [--json]       check your ontology against the rules

Step 1: scope          okb scope --domain "..." --purpose "..." --users a,b --maintainers x --out-of-scope "..."
                       okb cq add "Which wines go with fish?"   ·   okb cq list
Step 2: reuse          okb reuse add --name "..." --url ... --decision reuse|adapt|reference|rejected
                       okb reuse none --why "..."
Step 3: terms          okb term add wine grape winery color ...   ·   okb term list
Step 4: classes        okb convention [--class-case PascalCase] [--slot-case camelCase] [--number singular]
                       okb class add RedWine --parent Wine [--desc "..."] [--synonym ...] [--abstract]
                       okb class set RedWine [--desc] [--add-parent X] [--remove-parent X] [--synonym S]
                       okb class disjoint RedWine WhiteWine RoseWine
                       okb term set wine --as class|slot|instance|value|synonym|out-of-scope [--node Name]
                       okb tree [--instances]
Step 5: slots          Two kinds (Ontology 101 calls both "slots"):
                       okb property add body --on Wine --type Enumerated --values light,medium,full --card single
                       okb relationship add maker --from Wine --to Winery --card single     (stored as edges :MAKER)
                       okb slot set body [--on X] [--off X] [--desc] ...   ·   okb show Wine
Step 6: facets         okb slot set maker --card single --min 1   ·   okb slot set producer --range Winery
                       okb relationship inverse maker produces        (one edge, readable from both ends)
                       okb relationship property preferredOver condition --type String [--required] [--values a,b]
                       okb link Radio preferredOver SegmentedControl condition="2 to 7 options" [--rule <rule id>]
                       okb unlink Radio preferredOver SegmentedControl
                       okb class fix DessertWine sugar=sweet        (a value every member has)
                       okb class default Wine body=full              (a starting value, overridable)
                       okb class restrict SingleVarietal grape --max 1
Step 7: instances      okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light maker="Chateau Morgon"
                       okb instance set "Chateau Morgon Beaujolais" grape+=Gamay    (+= adds, -= removes, slot= clears)
                       okb instance set "Chateau Morgon Beaujolais" --of Beaujolais  (move to another class)
Step 8: review         okb cq link 1 Wine Food goesWellWith   ·   okb validate --all   ·   okb review
                       okb decision add --title "..." --decision "..." --why "..." [--about X] [--waives rule-id]
                       okb diagram [--out diagram.md]
Export                 okb export [--format json|cypher] [--with-schema] [--no-inherited] [--no-rules] [--include-unverified] [--out file]
                       (instances as nodes labeled with their classes, ready for Neo4j / Neptune / Memgraph)

Documents              okb source add docs/button.md [--repo-url https://github.com/.../button.md] [--url https://site/button]
(extraction)           okb source outline <source> [--quotable] [--json]     every block, with heading path and lines
                       okb quote add <source> "verbatim text" [--cites Node] [--line N]   located automatically
                       okb rule add --statement "..." --modality SHOULD --governs Button --cites <quote id> [--authored] [--value slot=value] [--refines <rule> --adds "..."]
                       okb rule refines <rule> <broader rule> [--adds "..."]     okb fulfills <instance> <rule>
                       okb cite <node> <quote id>                                attach an existing quote to a node
                       okb verify <node> --status SUPPORTED|OVERREACH|UNSUPPORTED [--corrected "..."] · okb verify <node> --approve
                       okb source refresh <source> | --all [--dry-run] [--record] [--strict] [--json]   after the document changes (--all: worklist)

Skills                 okb skills install [--copy] [--dir <folder>] [--force]    link (or copy) the packaged skills into ~/.claude/skills
                       okb skills status [--dir <folder>]                         which are installed, where, and whether they match this okb

Also: okb show <name> · okb rename <old> <new> · okb remove <name> · okb drift <folder>...
       okb check [--json]                is this KB safe to merge? (validation, quotes, verification; non-zero exit if not)
       okb pin                           record this okb version in okb.json (CI installs it; okb check warns on older)
       okb diff <old> [<new>] [--json]   what changed in the knowledge between two folders or git refs (okb diff main)
       okb release <version> · okb release verify   cut a pinned release with a manifest and change log; check files against it
Names: when a class and a slot share a name, say which: class:Genre / slot:genre
Global options: -C <folder> (default: current folder) · --json (machine-readable output where supported)`;
