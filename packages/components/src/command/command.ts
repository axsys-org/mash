import type { MashCommandDetail } from "../gesture/gesture.js";

/** Stable placement lanes understood by command-driven toolbars and menus. */
export type CommandPlacement = "start" | "normal" | "end" | "overflow";
export type CommandExecutionPolicy = "ignore" | "parallel" | "replace";

export type CommandCondition<Context> = boolean | ((context: Context) => boolean);

export interface CommandRunInput<Data = unknown> {
  data: Data | undefined;
  detail?: MashCommandDetail<Data>;
  originalEvent?: Event;
  signal: AbortSignal;
}

export interface CommandExecutionInput<Data = unknown> {
  data: Data | undefined;
  detail?: MashCommandDetail<Data>;
  originalEvent?: Event;
  signal?: AbortSignal;
}

/** A renderer-neutral command together with the state a command surface needs. */
export interface CommandDefinition<Context, Data = unknown, Metadata = unknown> {
  id: string;
  label?: string;
  description?: string;
  group?: string;
  /** Alternate terms used by slash menus, palettes, and other discovery surfaces. */
  keywords?: readonly string[];
  order?: number;
  placement?: CommandPlacement;
  shortcut?: string;
  execution?: CommandExecutionPolicy;
  metadata?: Metadata;
  when?: CommandCondition<Context>;
  active?: CommandCondition<Context>;
  disabled?: CommandCondition<Context>;
  run?: (
    context: Context,
    input: CommandRunInput<Data>,
  ) => boolean | void | Promise<boolean | void>;
}

/** A replaceable group of commands contributed to one exact or wildcard scope. */
export interface CommandModule<Context, Data = unknown, Metadata = unknown> {
  id: string;
  scope: string;
  priority?: number;
  when?: CommandCondition<Context>;
  commands: readonly CommandDefinition<Context, Data, Metadata>[];
}

export interface ResolvedCommand<Context, Data = unknown, Metadata = unknown> extends Omit<
  CommandDefinition<Context, Data, Metadata>,
  "active" | "disabled" | "when"
> {
  active: boolean;
  disabled: boolean;
  executing: boolean;
}

export interface CommandRegistration {
  destroy(): void;
}

export interface CommandHostOptions<Context> {
  context: () => Context;
  scopes: () => readonly string[];
  onError?: (error: unknown, command: string) => void;
}

export interface CommandSearchOptions {
  /** Includes unavailable commands in discovery results. Defaults to false. */
  includeDisabled?: boolean;
  /** Restricts discovery to named command groups. */
  groups?: readonly string[];
  /** Caps the number of returned commands after ranking. */
  limit?: number;
}

interface RegisteredModule<Context, Data, Metadata> {
  module: CommandModule<Context, Data, Metadata>;
  sequence: number;
}

interface MergedCommand<Context, Data, Metadata> {
  definition: CommandDefinition<Context, Data, Metadata>;
  sequence: number;
}

const placementOrder: Record<CommandPlacement, number> = {
  start: 0,
  normal: 1,
  end: 2,
  overflow: 3,
};

function evaluate<Context>(
  condition: CommandCondition<Context> | undefined,
  context: Context,
  fallback: boolean,
): boolean {
  if (typeof condition === "function") return condition(context);
  return condition ?? fallback;
}

function scopeSpecificity(pattern: string, scopes: readonly string[]): number {
  if (pattern === "*") return 0;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return scopes.some((scope) => scope.startsWith(prefix)) ? 1_000 + prefix.length : -1;
  }
  const index = scopes.indexOf(pattern);
  return index < 0 ? -1 : 10_000 + index;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function fuzzySubsequenceScore(candidate: string, query: string): number {
  let queryIndex = 0;
  let firstMatch = -1;
  let previousMatch = -1;
  let gaps = 0;

  for (let index = 0; index < candidate.length && queryIndex < query.length; index += 1) {
    if (candidate[index] !== query[queryIndex]) continue;
    if (firstMatch < 0) firstMatch = index;
    if (previousMatch >= 0) gaps += index - previousMatch - 1;
    previousMatch = index;
    queryIndex += 1;
  }

  if (queryIndex !== query.length) return -1;
  return Math.max(1, 160 - Math.max(0, firstMatch) * 4 - gaps * 3);
}

function searchFieldScore(candidate: string, query: string, weight: number): number {
  if (!candidate) return -1;
  if (candidate === query) return weight + 500;
  if (candidate.startsWith(query)) return weight + 360;
  if (candidate.split(/\s+/).some((word) => word.startsWith(query))) return weight + 280;
  if (candidate.includes(query)) return weight + 220;
  const fuzzy = fuzzySubsequenceScore(candidate, query);
  return fuzzy < 0 ? -1 : weight + fuzzy;
}

function commandSearchScore<Context, Data, Metadata>(
  command: ResolvedCommand<Context, Data, Metadata>,
  query: string,
): number {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const fields = [
    { value: normalizeSearchText(command.label ?? ""), weight: 600 },
    ...(command.keywords?.map((keyword) => ({
      value: normalizeSearchText(keyword),
      weight: 450,
    })) ?? []),
    { value: normalizeSearchText(command.group ?? ""), weight: 240 },
    { value: normalizeSearchText(command.description ?? ""), weight: 180 },
    { value: normalizeSearchText(command.id.replaceAll(".", " ")), weight: 120 },
  ];
  let score = 0;

  for (const term of terms) {
    const best = Math.max(
      ...fields.map((field) => searchFieldScore(field.value, term, field.weight)),
    );
    if (best < 0) return -1;
    score += best;
  }

  return score;
}

/**
 * Scoped command and action registry for contextual UI.
 *
 * Modules are ordinary data. Broad scopes resolve first, then more specific
 * scopes and higher priorities replace fields on commands with the same ID.
 * The registry owns neither rendering nor application state, so a toolbar,
 * menu, keyboard binding, and command palette can consume the same result.
 */
export class CommandRegistry<Context, Data = unknown, Metadata = unknown> {
  readonly #modules = new Map<string, RegisteredModule<Context, Data, Metadata>>();
  readonly #listeners = new Set<() => void>();
  readonly #executions = new Map<string, Set<AbortController>>();
  #sequence = 0;

  get size(): number {
    return this.#modules.size;
  }

  register(module: CommandModule<Context, Data, Metadata>): CommandRegistration {
    if (!module.id.trim()) throw new Error("Command modules require a non-empty id.");
    if (!module.scope.trim()) throw new Error("Command modules require a non-empty scope.");
    if (module.commands.some((command) => !command.id.trim())) {
      throw new Error(`Command module "${module.id}" contains an empty command id.`);
    }

    const sequence = ++this.#sequence;
    this.#modules.set(module.id, { module, sequence });
    this.#notify();

    let destroyed = false;
    return {
      destroy: () => {
        if (destroyed) return;
        const current = this.#modules.get(module.id);
        if (current?.sequence === sequence) {
          this.#modules.delete(module.id);
          this.#notify();
        }
        destroyed = true;
      },
    };
  }

  subscribe(listener: () => void): CommandRegistration {
    this.#listeners.add(listener);
    listener();
    return {
      destroy: () => {
        this.#listeners.delete(listener);
      },
    };
  }

  resolve(
    scopes: readonly string[],
    context: Context,
  ): readonly ResolvedCommand<Context, Data, Metadata>[] {
    const modules = [...this.#modules.values()]
      .map((registered) => ({
        ...registered,
        specificity: scopeSpecificity(registered.module.scope, scopes),
      }))
      .filter(({ module, specificity }) => specificity >= 0 && evaluate(module.when, context, true))
      .sort(
        (left, right) =>
          left.specificity - right.specificity ||
          (left.module.priority ?? 0) - (right.module.priority ?? 0) ||
          left.sequence - right.sequence,
      );

    const merged = new Map<string, MergedCommand<Context, Data, Metadata>>();
    let commandSequence = 0;
    for (const { module } of modules) {
      for (const command of module.commands) {
        const previous = merged.get(command.id);
        merged.set(command.id, {
          definition: previous ? { ...previous.definition, ...command } : { ...command },
          sequence: previous?.sequence ?? commandSequence++,
        });
      }
    }

    return [...merged.values()]
      .filter(({ definition }) => evaluate(definition.when, context, true))
      .map(({ definition, sequence }) => ({
        command: {
          ...definition,
          active: evaluate(definition.active, context, false),
          disabled: evaluate(definition.disabled, context, false),
          executing: Boolean(this.#executions.get(definition.id)?.size),
        },
        sequence,
      }))
      .sort(
        (left, right) =>
          placementOrder[left.command.placement ?? "normal"] -
            placementOrder[right.command.placement ?? "normal"] ||
          (left.command.order ?? 0) - (right.command.order ?? 0) ||
          left.sequence - right.sequence ||
          left.command.id.localeCompare(right.command.id),
      )
      .map(({ command }) => command);
  }

  find(
    id: string,
    scopes: readonly string[],
    context: Context,
  ): ResolvedCommand<Context, Data, Metadata> | undefined {
    return this.resolve(scopes, context).find((command) => command.id === id);
  }

  /**
   * Ranks the same resolved commands used by toolbars for discovery surfaces.
   * Empty queries preserve registry order; non-empty queries favor labels,
   * aliases, group names, descriptions, then stable command IDs.
   */
  search(
    query: string,
    scopes: readonly string[],
    context: Context,
    options: CommandSearchOptions = {},
  ): readonly ResolvedCommand<Context, Data, Metadata>[] {
    const groups = options.groups?.length ? new Set(options.groups) : null;
    const ranked = this.resolve(scopes, context)
      .map((command, index) => ({
        command,
        index,
        score: commandSearchScore(command, query),
      }))
      .filter(
        ({ command, score }) =>
          score >= 0 &&
          (options.includeDisabled || !command.disabled) &&
          (!groups || (command.group !== undefined && groups.has(command.group))),
      )
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map(({ command }) => command);
    const limit = options.limit;
    return typeof limit === "number" && Number.isFinite(limit)
      ? ranked.slice(0, Math.max(0, Math.floor(limit)))
      : ranked;
  }

  async execute(
    id: string,
    scopes: readonly string[],
    context: Context,
    input: CommandExecutionInput<Data> = { data: undefined },
  ): Promise<boolean> {
    const command = this.find(id, scopes, context);
    if (!command?.run || command.disabled) return false;
    const running = this.#executions.get(id);
    if (command.execution === "ignore" && running?.size) return false;
    if (command.execution === "replace") {
      for (const controller of running ?? []) controller.abort("replaced");
    }
    if (input.signal?.aborted) return false;

    const controller = new AbortController();
    const executions = running ?? new Set<AbortController>();
    executions.add(controller);
    this.#executions.set(id, executions);
    const onAbort = (): void => controller.abort(input.signal?.reason);
    input.signal?.addEventListener("abort", onAbort, { once: true });
    this.#notify();

    try {
      return (
        (await command.run(context, {
          data: input.data,
          detail: input.detail,
          originalEvent: input.originalEvent,
          signal: controller.signal,
        })) !== false
      );
    } catch (error) {
      if (
        controller.signal.aborted &&
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return false;
      }
      throw error;
    } finally {
      input.signal?.removeEventListener("abort", onAbort);
      executions.delete(controller);
      if (!executions.size) this.#executions.delete(id);
      this.#notify();
    }
  }

  /** Aborts in-flight commands while leaving their state and transactions to the host. */
  abort(id?: string): void {
    const entries = id
      ? [[id, this.#executions.get(id)] as const]
      : [...this.#executions.entries()];
    for (const [, executions] of entries) {
      for (const controller of executions ?? []) controller.abort("host");
    }
  }

  /** Routes completed `mash-command` events from one host into this registry. */
  connect(host: HTMLElement, options: CommandHostOptions<Context>): CommandRegistration {
    const onCommand = (event: Event): void => {
      const detail = (event as CustomEvent<MashCommandDetail<Data>>).detail;
      if (!detail || detail.phase !== "ended" || event.defaultPrevented) return;
      const context = options.context();
      const scopes = options.scopes();
      const command = this.find(detail.command, scopes, context);
      if (!command?.run || command.disabled) return;

      event.preventDefault();
      void this.execute(detail.command, scopes, context, {
        data: detail.data,
        detail,
        originalEvent: detail.originalEvent,
      }).catch((error: unknown) => {
        if (options.onError) options.onError(error, detail.command);
        else console.error(error);
      });
    };

    host.addEventListener("mash-command", onCommand);
    return {
      destroy: () => {
        host.removeEventListener("mash-command", onCommand);
      },
    };
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}
