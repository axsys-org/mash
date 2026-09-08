export type BlockPlacement = "document" | "inline" | "overlay" | "service" | "structural";

export type BlockCapability =
  "atomic" | "container" | "editable" | "interactive" | "media" | "streamable";

export type BlockScalar = boolean | null | number | string;
export type BlockValue =
  BlockScalar | readonly BlockValue[] | { readonly [key: string]: BlockValue };
export type BlockProperties = Readonly<Record<string, BlockValue>>;

export interface BlockNode<TProperties extends BlockProperties = BlockProperties> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly props: TProperties;
  readonly children?: readonly BlockNode[];
}

export interface BlockDefinition {
  readonly type: string;
  readonly version: number;
  readonly label: string;
  readonly description: string;
  readonly group: string;
  readonly keywords?: readonly string[];
  readonly icon?: string;
  readonly placement: BlockPlacement;
  readonly capabilities?: readonly BlockCapability[];
  /** Custom elements used by a Web renderer for this block realization. */
  readonly components?: readonly string[];
  readonly normalize?: (props: BlockProperties) => BlockProperties;
  readonly validate?: (props: BlockProperties) => readonly string[];
}

export interface BlockCatalogueRegistration {
  destroy(): void;
}

export interface BlockCatalogueListOptions {
  capability?: BlockCapability;
  placement?: BlockPlacement;
}

export type BlockValidationCode =
  | "children-not-allowed"
  | "duplicate-id"
  | "invalid-id"
  | "invalid-properties"
  | "invalid-version"
  | "properties-rejected"
  | "unknown-type";

export interface BlockValidationIssue {
  readonly code: BlockValidationCode;
  readonly id?: string;
  readonly message: string;
  readonly path: readonly number[];
}

export class BlockValidationError extends Error {
  readonly issues: readonly BlockValidationIssue[];

  constructor(issues: readonly BlockValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("\n"));
    this.name = "BlockValidationError";
    this.issues = issues;
  }
}

const blockTypePattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const blockIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const customElementPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBlockValue(value: unknown, seen = new Set<unknown>()): value is BlockValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((entry) => isBlockValue(entry, seen))
    : Object.getPrototypeOf(value) === Object.prototype &&
      Object.values(value).every((entry) => isBlockValue(entry, seen));
  seen.delete(value);
  return valid;
}

function cloneValue<T extends BlockValue>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneValue(entry))) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)])),
    ) as T;
  }
  return value;
}

function cloneProperties<T extends BlockProperties>(props: T): T {
  if (!isBlockValue(props)) {
    throw new TypeError("Block properties must contain only finite JSON values.");
  }
  return cloneValue(props) as T;
}

function cloneNode<TProperties extends BlockProperties>(
  node: BlockNode<TProperties>,
): BlockNode<TProperties> {
  const children = node.children?.map((child) => cloneNode(child));
  return Object.freeze({
    id: node.id,
    type: node.type,
    version: node.version,
    props: cloneProperties(node.props),
    ...(children?.length ? { children: Object.freeze(children) } : {}),
  });
}

function normalizedWords(value: string): string[] {
  return value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
}

function assertDefinition(definition: BlockDefinition): void {
  if (!blockTypePattern.test(definition.type)) {
    throw new TypeError(`Invalid block type "${definition.type}".`);
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    throw new TypeError(`Block definition "${definition.type}" needs a positive integer version.`);
  }
  for (const [name, value] of [
    ["label", definition.label],
    ["description", definition.description],
    ["group", definition.group],
  ] as const) {
    if (!value.trim())
      throw new TypeError(`Block definition "${definition.type}" needs a ${name}.`);
  }
  const capabilities = definition.capabilities ?? [];
  if (new Set(capabilities).size !== capabilities.length) {
    throw new TypeError(`Block definition "${definition.type}" repeats a capability.`);
  }
  const components = definition.components ?? [];
  if (new Set(components).size !== components.length) {
    throw new TypeError(`Block definition "${definition.type}" repeats a component tag.`);
  }
  for (const tag of components) {
    if (!customElementPattern.test(tag)) {
      throw new TypeError(
        `Block definition "${definition.type}" has invalid component tag "${tag}".`,
      );
    }
  }
}

/**
 * Renderer-neutral metadata and validation for versioned document blocks.
 *
 * A catalogue describes what a block means and which capabilities it needs; it
 * deliberately does not create DOM. Web, native, server, and streaming adapters
 * can project the same records through their own renderers.
 */
export class BlockCatalogue {
  readonly #definitions = new Map<string, BlockDefinition>();

  constructor(definitions: Iterable<BlockDefinition> = []) {
    for (const definition of definitions) this.register(definition);
  }

  register(definition: BlockDefinition): BlockCatalogueRegistration {
    assertDefinition(definition);
    if (this.#definitions.has(definition.type)) {
      throw new Error(`Block type "${definition.type}" is already registered.`);
    }
    const frozen = Object.freeze({
      ...definition,
      keywords: Object.freeze([...(definition.keywords ?? [])]),
      capabilities: Object.freeze([...(definition.capabilities ?? [])]),
      components: Object.freeze([...(definition.components ?? [])]),
    }) as BlockDefinition;
    this.#definitions.set(definition.type, frozen);
    let active = true;
    return {
      destroy: () => {
        if (!active) return;
        active = false;
        if (this.#definitions.get(definition.type) === frozen) {
          this.#definitions.delete(definition.type);
        }
      },
    };
  }

  get(type: string): BlockDefinition | undefined {
    return this.#definitions.get(type);
  }

  list(options: BlockCatalogueListOptions = {}): readonly BlockDefinition[] {
    return [...this.#definitions.values()]
      .filter(
        (definition) =>
          (!options.placement || definition.placement === options.placement) &&
          (!options.capability || definition.capabilities?.includes(options.capability)),
      )
      .sort(
        (left, right) =>
          left.group.localeCompare(right.group) || left.label.localeCompare(right.label),
      );
  }

  search(query: string, options: BlockCatalogueListOptions = {}): readonly BlockDefinition[] {
    const words = normalizedWords(query);
    if (words.length === 0) return this.list(options);
    return this.list(options)
      .map((definition) => {
        const label = definition.label.toLocaleLowerCase();
        const type = definition.type.toLocaleLowerCase();
        const keywords = (definition.keywords ?? []).map((keyword) => keyword.toLocaleLowerCase());
        let score = 0;
        for (const word of words) {
          if (label === word || type === word) score += 12;
          else if (label.startsWith(word) || type.startsWith(word)) score += 8;
          else if (label.includes(word) || type.includes(word)) score += 5;
          else if (keywords.some((keyword) => keyword.startsWith(word))) score += 3;
          else if (keywords.some((keyword) => keyword.includes(word))) score += 1;
          else return { definition, score: -1 };
        }
        return { definition, score };
      })
      .filter((entry) => entry.score >= 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.definition.label.localeCompare(right.definition.label),
      )
      .map((entry) => entry.definition);
  }

  create<TProperties extends BlockProperties>(
    type: string,
    id: string,
    props: BlockProperties = {},
    children: readonly BlockNode[] = [],
  ): BlockNode<TProperties> {
    const definition = this.#definitions.get(type);
    if (!definition) throw new Error(`Unknown block type "${type}".`);
    const normalized = definition.normalize
      ? (definition.normalize(cloneProperties(props)) as TProperties)
      : (cloneProperties(props) as TProperties);
    const node = cloneNode({
      id,
      type,
      version: definition.version,
      props: normalized,
      ...(children.length ? { children } : {}),
    });
    this.assert([node]);
    return node;
  }

  validate(nodes: readonly BlockNode[]): readonly BlockValidationIssue[] {
    const issues: BlockValidationIssue[] = [];
    const ids = new Set<string>();
    const visit = (node: BlockNode, path: readonly number[]): void => {
      if (!blockIdPattern.test(node.id)) {
        issues.push({
          code: "invalid-id",
          id: node.id,
          path,
          message: `Block at ${path.join(".") || "root"} has invalid id "${node.id}".`,
        });
      } else if (ids.has(node.id)) {
        issues.push({
          code: "duplicate-id",
          id: node.id,
          path,
          message: `Block id "${node.id}" is duplicated.`,
        });
      }
      ids.add(node.id);

      const definition = this.#definitions.get(node.type);
      if (!definition) {
        issues.push({
          code: "unknown-type",
          id: node.id,
          path,
          message: `Block "${node.id}" uses unknown type "${node.type}".`,
        });
      } else {
        if (node.version !== definition.version) {
          issues.push({
            code: "invalid-version",
            id: node.id,
            path,
            message: `Block "${node.id}" is version ${node.version}; "${node.type}" expects ${definition.version}.`,
          });
        }
        if (node.children?.length && !definition.capabilities?.includes("container")) {
          issues.push({
            code: "children-not-allowed",
            id: node.id,
            path,
            message: `Block "${node.id}" cannot contain child blocks.`,
          });
        }
        if (isRecord(node.props) && isBlockValue(node.props)) {
          for (const message of definition.validate?.(node.props) ?? []) {
            issues.push({ code: "properties-rejected", id: node.id, path, message });
          }
        }
      }
      if (!isRecord(node.props) || !isBlockValue(node.props)) {
        issues.push({
          code: "invalid-properties",
          id: node.id,
          path,
          message: `Block "${node.id}" properties must contain only finite JSON values.`,
        });
      }
      node.children?.forEach((child, index) => visit(child, [...path, index]));
    };
    nodes.forEach((node, index) => visit(node, [index]));
    return issues;
  }

  assert(nodes: readonly BlockNode[]): void {
    const issues = this.validate(nodes);
    if (issues.length) throw new BlockValidationError(issues);
  }
}

export interface BlockDocument {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly revision: number;
  readonly blocks: readonly BlockNode[];
}

interface BlockOperationBase {
  readonly id: string;
}

export type BlockOperation =
  | {
      readonly op: "insert";
      readonly parentId: string | null;
      readonly index: number;
      readonly block: BlockNode;
    }
  | (BlockOperationBase & {
      readonly op: "update";
      readonly props: BlockProperties;
      readonly mode?: "merge" | "replace";
    })
  | (BlockOperationBase & { readonly op: "replace"; readonly block: BlockNode })
  | (BlockOperationBase & { readonly op: "remove" })
  | (BlockOperationBase & {
      readonly op: "move";
      readonly parentId: string | null;
      readonly index: number;
    });

export interface BlockStreamFrame {
  readonly documentId: string;
  readonly sequence: number;
  readonly operation: BlockOperation;
}

function containsBlock(nodes: readonly BlockNode[], id: string): boolean {
  return nodes.some((node) => node.id === id || containsBlock(node.children ?? [], id));
}

function updateBlock(
  nodes: readonly BlockNode[],
  id: string,
  transform: (node: BlockNode) => BlockNode,
): { blocks: readonly BlockNode[]; found: boolean } {
  let found = false;
  const blocks = nodes.map((node) => {
    if (node.id === id) {
      found = true;
      return transform(node);
    }
    const nested = updateBlock(node.children ?? [], id, transform);
    if (!nested.found) return node;
    found = true;
    return cloneNode({ ...node, children: nested.blocks });
  });
  return { blocks: Object.freeze(blocks), found };
}

function detachBlock(
  nodes: readonly BlockNode[],
  id: string,
): { blocks: readonly BlockNode[]; block: BlockNode | null } {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    return {
      blocks: Object.freeze([...nodes.slice(0, index), ...nodes.slice(index + 1)]),
      block: nodes[index]!,
    };
  }
  for (const [nodeIndex, node] of nodes.entries()) {
    const nested = detachBlock(node.children ?? [], id);
    if (!nested.block) continue;
    const next = [...nodes];
    next[nodeIndex] = cloneNode({ ...node, children: nested.blocks });
    return { blocks: Object.freeze(next), block: nested.block };
  }
  return { blocks: nodes, block: null };
}

function insertBlock(
  nodes: readonly BlockNode[],
  parentId: string | null,
  index: number,
  block: BlockNode,
): readonly BlockNode[] {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("Block insertion index must be a non-negative integer.");
  }
  if (parentId === null) {
    if (index > nodes.length)
      throw new RangeError("Block insertion index is outside the document.");
    return Object.freeze([...nodes.slice(0, index), block, ...nodes.slice(index)]);
  }
  const inserted = updateBlock(nodes, parentId, (parent) => {
    const children = parent.children ?? [];
    if (index > children.length) {
      throw new RangeError(`Block insertion index is outside parent "${parentId}".`);
    }
    return cloneNode({
      ...parent,
      children: [...children.slice(0, index), block, ...children.slice(index)],
    });
  });
  if (!inserted.found) throw new Error(`Block parent "${parentId}" was not found.`);
  return inserted.blocks;
}

export function createBlockDocument(
  id: string,
  blocks: readonly BlockNode[],
  catalogue: BlockCatalogue,
): BlockDocument {
  if (!blockIdPattern.test(id)) throw new TypeError("A block document needs a valid stable id.");
  const cloned = Object.freeze(blocks.map((block) => cloneNode(block)));
  catalogue.assert(cloned);
  return Object.freeze({ schemaVersion: 1, id, revision: 0, blocks: cloned });
}

export function applyBlockOperation(
  document: BlockDocument,
  operation: BlockOperation,
  catalogue: BlockCatalogue,
): BlockDocument {
  let blocks: readonly BlockNode[];
  if (operation.op === "insert") {
    if (containsBlock(document.blocks, operation.block.id)) {
      throw new Error(`Block id "${operation.block.id}" already exists.`);
    }
    blocks = insertBlock(
      document.blocks,
      operation.parentId,
      operation.index,
      cloneNode(operation.block),
    );
  } else if (operation.op === "remove") {
    const detached = detachBlock(document.blocks, operation.id);
    if (!detached.block) throw new Error(`Block "${operation.id}" was not found.`);
    blocks = detached.blocks;
  } else if (operation.op === "move") {
    const detached = detachBlock(document.blocks, operation.id);
    if (!detached.block) throw new Error(`Block "${operation.id}" was not found.`);
    if (
      operation.parentId === operation.id ||
      (operation.parentId && containsBlock(detached.block.children ?? [], operation.parentId))
    ) {
      throw new Error(`Block "${operation.id}" cannot move inside itself.`);
    }
    blocks = insertBlock(detached.blocks, operation.parentId, operation.index, detached.block);
  } else if (operation.op === "replace") {
    if (operation.block.id !== operation.id && containsBlock(document.blocks, operation.block.id)) {
      throw new Error(`Block id "${operation.block.id}" already exists.`);
    }
    const replaced = updateBlock(document.blocks, operation.id, () => cloneNode(operation.block));
    if (!replaced.found) throw new Error(`Block "${operation.id}" was not found.`);
    blocks = replaced.blocks;
  } else {
    const updated = updateBlock(document.blocks, operation.id, (node) =>
      cloneNode({
        ...node,
        props:
          operation.mode === "replace" ? operation.props : { ...node.props, ...operation.props },
      }),
    );
    if (!updated.found) throw new Error(`Block "${operation.id}" was not found.`);
    blocks = updated.blocks;
  }
  catalogue.assert(blocks);
  return Object.freeze({ ...document, revision: document.revision + 1, blocks });
}

export function applyBlockStreamFrame(
  document: BlockDocument,
  frame: BlockStreamFrame,
  catalogue: BlockCatalogue,
): BlockDocument {
  if (frame.documentId !== document.id) {
    throw new Error(`Stream frame targets "${frame.documentId}", not "${document.id}".`);
  }
  if (frame.sequence !== document.revision + 1) {
    throw new Error(
      `Stream frame ${frame.sequence} is out of order; expected ${document.revision + 1}.`,
    );
  }
  return applyBlockOperation(document, frame.operation, catalogue);
}
