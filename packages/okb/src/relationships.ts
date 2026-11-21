/**
 * How relationship values are stored. This is the one module that knows it.
 *
 * A slot with valueType "Instance" is a relationship. Its values are edges whose type
 * is the slot's relType, the slot name in UPPER_SNAKE case: (wine)-[:MAKER]->(winery).
 * An edge from a class is a fixed class-level value its members inherit.
 *
 * Inverse slots are one relationship read from both ends, stored once. The slot on the
 * `from` side of INVERSE_OF is the primary (stored) direction; its inverse reads the
 * same edges backwards, so `produces` = incoming MAKER edges. Edge-property
 * declarations live on the primary slot.
 *
 * Everything that creates, retypes, moves or deletes those edges goes through here,
 * so a change to the storage scheme is a change to this file.
 */
import { OkbError } from "./errors.ts";
import { MetaKB } from "./metakb.ts";
import type { Ontology } from "./model.ts";
import * as naming from "./naming.ts";
import type { EdgePropertyDecl, GraphEdge, RelationshipSlot, SlotNode } from "./types.ts";

/** How one slot's values are stored: the edge type, and whether this slot reads it backwards. */
export interface LinkSpec {
  type: string;
  reverse: boolean;
}

/** An edge's own properties (everything except from/type/to). */
export function edgeProps(e: GraphEdge): Record<string, unknown> {
  const { from: _f, type: _t, to: _to, ...rest } = e;
  return rest;
}

export class Relationships {
  private readonly ont: Ontology;

  constructor(ont: Ontology) {
    this.ont = ont;
  }

  /** The slot that stores a relationship's edges: the slot itself, or the one it's the inverse of. */
  primary(slotId: string): string {
    return this.ont.sources(slotId, "INVERSE_OF")[0] ?? slotId;
  }

  isPrimary(slotId: string): boolean {
    return this.primary(slotId) === slotId;
  }

  spec(slotId: string): LinkSpec | null {
    const s = this.ont.get(slotId);
    if (s?.type !== "Slot" || s.valueType !== "Instance") return null;
    const primary = this.primary(slotId);
    const p = this.ont.get(primary);
    if (p?.type !== "Slot" || !p.relType) return null;
    return { type: p.relType, reverse: primary !== slotId };
  }

  /** Edge types that hold relationship values, mapped to the slot that stores each. */
  edgeTypes(): Map<string, string> {
    const m = new Map<string, string>();
    for (const s of this.ont.ofType("Slot")) if (isRelationship(s) && this.isPrimary(s.id)) m.set(s.relType, s.id);
    return m;
  }

  /** The nodes `id` is linked to through a relationship slot (either direction). */
  values(id: string, slotId: string): string[] {
    const spec = this.spec(slotId);
    if (!spec) return [];
    return spec.reverse ? this.ont.sources(id, spec.type) : this.ont.targets(id, spec.type);
  }

  /** The stored edge behind one relationship value, whichever end it's read from. */
  edge(id: string, slotId: string, target: string): GraphEdge | undefined {
    const spec = this.spec(slotId);
    if (!spec) return undefined;
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    return this.ont.outEdges(from, spec.type).find((e) => e.to === to);
  }

  /** Relationship slots `id` has any values for (either direction). */
  slotsWithValues(id: string): string[] {
    return this.ont.ofType("Slot").filter((s) => this.values(id, s.id).length > 0).map((s) => s.id);
  }

  /** The edge properties a relationship's edges can carry (declared on its primary slot). */
  edgeProperties(slotId: string): EdgePropertyDecl[] {
    const p = this.ont.get(this.primary(slotId));
    return (p?.type === "Slot" && p.edgeProperties) || [];
  }

  /**
   * Link `id` to `target` through a relationship slot. There's at most one edge per
   * (from, relationship, to); `props` (edge properties, or `rule`) are merged into it.
   * Returns whether a new edge was created.
   */
  link(id: string, slotId: string, target: string, props: Record<string, unknown> = {}): boolean {
    const existing = this.edge(id, slotId, target);
    if (existing) {
      Object.assign(existing, props);
      return false;
    }
    const spec = this.spec(slotId);
    if (!spec) throw new OkbError(`${this.ont.label(slotId)} isn't a relationship.`);
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    this.ont.addEdge(from, spec.type, to, props);
    return true;
  }

  unlink(id: string, slotId: string, target: string): void {
    const spec = this.spec(slotId);
    if (!spec) return;
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    this.ont.removeEdges((e) => e.type === spec.type && e.from === from && e.to === to);
  }

  /** The edge type a relationship called `name` would be stored as; refuses structural and taken types. */
  typeFor(name: string, slotId: string): string {
    const t = naming.relType(name);
    const { edgeTypes } = MetaKB.get().formatRegistry();
    if (edgeTypes.has(t)) throw new OkbError(`A relationship called '${name}' would be stored as ${t}, which okb uses for its own structure. Pick another name.`);
    const other = this.ont.ofType("Slot").find((x) => x.id !== slotId && x.relType === t);
    if (other) throw new OkbError(`'${name}' would be stored as ${t}, which ${other.name} already uses. Pick another name.`);
    return t;
  }

  /** A slot's value type became Instance: give it an edge type, unless it already has one. */
  becomeRelationship(slot: SlotNode): void {
    if (!slot.relType) slot.relType = this.typeFor(slot.name, slot.id);
  }

  /**
   * A relationship's value type changed to a literal type: its stored links and its
   * inverse pairing go. Returns the edge type and how many edges of it there were.
   */
  becomeProperty(slot: SlotNode): { type?: string; links: number } {
    const type = slot.relType;
    const links = type ? this.ont.edgesOf(type).length : 0;
    if (type && this.isPrimary(slot.id)) this.ont.removeEdges((e) => e.type === type);
    this.ont.removeEdges((e) => e.type === "INVERSE_OF" && (e.from === slot.id || e.to === slot.id));
    delete slot.relType;
    return { type, links };
  }

  /**
   * Make `b` the inverse of `a`: `a` stays the stored direction, so any edges stored
   * under b's own type move onto a's type, reversed (merging properties where the
   * same link already exists). Returns how many edges moved.
   */
  declareInverse(a: RelationshipSlot, b: RelationshipSlot): number {
    const moved = this.ont.edgesOf(b.relType);
    this.ont.removeEdges((e) => e.type === b.relType);
    for (const e of moved) {
      const existing = this.ont.outEdges(e.to, a.relType).find((x) => x.to === e.from);
      if (existing) Object.assign(existing, edgeProps(e));
      else this.ont.addEdge(e.to, a.relType, e.from, edgeProps(e));
    }
    const declared = a.edgeProperties ?? [];
    if (b.edgeProperties?.length) a.edgeProperties = [...declared, ...b.edgeProperties.filter((p) => !declared.some((q) => q.name === p.name))];
    this.ont.addEdge(a.id, "INVERSE_OF", b.id);
    return moved.length;
  }

  /**
   * A relationship is being renamed: claim the new edge type and, if this slot stores
   * the edges, retype them. Returns the change when stored edges were retyped.
   */
  rename(slot: SlotNode, name: string): { from?: string; to: string } | null {
    const t = this.typeFor(name, slot.id);
    if (t === slot.relType) return null;
    const from = slot.relType;
    slot.relType = t;
    if (!this.isPrimary(slot.id)) return null;
    if (from) this.ont.retypeEdges(from, t);
    return { from, to: t };
  }

  /**
   * A relationship slot is about to be removed. If it stores the edges and has an
   * inverse, the inverse becomes the stored direction and keeps every link;
   * otherwise its stored edges are deleted. Returns what was kept, if anything.
   */
  drop(slot: SlotNode): { links: number; type: string; name: string } | null {
    const type = slot.relType;
    if (!type || !this.isPrimary(slot.id)) return null;
    const inv = isRelationship(slot) ? this.ont.targets(slot.id, "INVERSE_OF")[0] : undefined;
    if (!inv) {
      this.ont.removeEdges((e) => e.type === type);
      return null;
    }
    const invNode = this.ont.require(inv, "Slot");
    if (!isRelationship(invNode)) throw new OkbError(`${slot.name}'s inverse ${invNode.name} isn't a relationship. Fix it (okb slot set ${invNode.name} --type Instance) or remove the inverse first.`);
    const moved = this.ont.edgesOf(type);
    this.ont.removeEdges((e) => e.type === type || (e.type === "INVERSE_OF" && e.from === slot.id));
    for (const e of moved) this.ont.addEdge(e.to, invNode.relType, e.from, edgeProps(e));
    if (slot.edgeProperties?.length && !invNode.edgeProperties?.length) invNode.edgeProperties = slot.edgeProperties;
    return { links: moved.length, type: invNode.relType, name: invNode.name };
  }
}

export function isRelationship(s: { type: string } | undefined): s is RelationshipSlot {
  const slot = s as SlotNode | undefined;
  return slot?.type === "Slot" && slot.valueType === "Instance" && Boolean(slot.relType);
}
