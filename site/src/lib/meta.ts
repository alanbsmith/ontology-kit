// The meta-KB's compiled nodes, read at build time. The sidebar lists its steps and decision
// guides from here, so new ones (from the meta-KB YAML) appear without a site change.
import nodes from '../../../meta-kb/data/nodes.json';
import type { MetaNode } from '../nav.ts';

export const metaNodes: readonly MetaNode[] = nodes as MetaNode[];
