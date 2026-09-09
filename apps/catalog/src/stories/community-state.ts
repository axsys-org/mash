/** Local application records. Files remain in the mounted application's memory. */
export type ChannelKind = "chat" | "gallery" | "notebook" | "dm";
export interface Member {
  id: string;
  name: string;
  initials: string;
  role: string;
  bio: string;
}
export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  section: string;
  description: string;
  members: string[];
  pinned: boolean;
  archived: boolean;
  notifications: "all" | "mentions" | "off";
}
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Authored starter documents can survive reload without a file service. */
  content?: string;
}
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  text: string;
  createdAt: number;
  parentId?: string;
  quoteId?: string;
  forwardedFrom?: string;
  editedAt?: number;
  attachmentIds: string[];
  reactions: Record<string, string[]>;
  saved: boolean;
  pinned: boolean;
}
export interface Draft {
  text: string;
  attachmentIds: string[];
  expanded: boolean;
  quoteId?: string;
}
export interface CommunityState {
  version: 1;
  selfId: string;
  workspace: string;
  activeChannelId: string;
  members: Member[];
  channels: Channel[];
  messages: Message[];
  attachments: Attachment[];
  drafts: Record<string, Draft>;
  readAt: Record<string, number>;
  settings: {
    compact: boolean;
    enterSends: boolean;
    showAvatars: boolean;
    sidebar: boolean;
    inspector: boolean;
  };
}
export const draftKey = (channelId: string, parentId?: string) =>
  `${channelId}/${parentId ?? "main"}`;
export const newId = () => crypto.randomUUID();
export function seedCommunity(): CommunityState {
  const members: Member[] = [
    {
      id: "you",
      name: "Alex Morgan",
      initials: "AM",
      role: "Host",
      bio: "Making a little room for good work. Design, systems and things built together.",
    },
    {
      id: "maya",
      name: "Maya Chen",
      initials: "MC",
      role: "Member",
      bio: "Designer. Collecting useful details, quiet places and interesting questions.",
    },
    {
      id: "sam",
      name: "Sam Rivera",
      initials: "SR",
      role: "Member",
      bio: "Building tools for people who care about their craft.",
    },
    {
      id: "jo",
      name: "Jo Park",
      initials: "JP",
      role: "Member",
      bio: "Words, spaces and the things between them.",
    },
    {
      id: "ellis",
      name: "Ellis Reed",
      initials: "ER",
      role: "Member",
      bio: "Independent maker. Currently studying everyday interfaces.",
    },
    {
      id: "nia",
      name: "Nia Brooks",
      initials: "NB",
      role: "Member",
      bio: "Research, photography and long walks.",
    },
  ];
  const makeChannel = (
    id: string,
    name: string,
    kind: ChannelKind,
    section: string,
    description: string,
  ): Channel => ({
    id,
    name,
    kind,
    section,
    description,
    members: members.map((m) => m.id),
    pinned: id === "commons",
    archived: false,
    notifications: "all",
  });
  const channels = [
    makeChannel(
      "commons",
      "The commons",
      "chat",
      "Gather",
      "A place to share what you’re working on, ask a question, or just say hello.",
    ),
    makeChannel(
      "introductions",
      "Introductions",
      "chat",
      "Gather",
      "A few words about yourself and what brought you here.",
    ),
    makeChannel(
      "workshop",
      "Workshop",
      "chat",
      "Make",
      "Works in progress. Share early, leave useful feedback.",
    ),
    makeChannel(
      "fieldnotes",
      "Field notes",
      "notebook",
      "Make",
      "Longer thoughts, shared notes and ideas worth keeping.",
    ),
    makeChannel(
      "gallery",
      "Reference shelf",
      "gallery",
      "Make",
      "A shared collection of images, files and little discoveries.",
    ),
    {
      ...makeChannel(
        "dm-maya",
        "Maya Chen",
        "dm",
        "Messages",
        "A conversation between you and Maya.",
      ),
      members: ["you", "maya"],
    },
    {
      ...makeChannel(
        "dm-sam",
        "Sam Rivera",
        "dm",
        "Messages",
        "A conversation between you and Sam.",
      ),
      members: ["you", "sam"],
    },
  ];
  const base = new Date("2026-09-08T09:00:00Z").valueOf();
  const messages: Message[] = [];
  const add = (channelId: string, authorId: string, text: string, extra: Partial<Message> = {}) => {
    const message: Message = {
      id: `seed-${messages.length + 1}`,
      channelId,
      authorId,
      text,
      createdAt: base + messages.length * 240000,
      attachmentIds: [],
      reactions: {},
      saved: false,
      pinned: false,
      ...extra,
    };
    messages.push(message);
    return message;
  };
  add(
    "commons",
    "maya",
    "Morning, everyone. I’ve been thinking about making this space a little more useful: fewer places to look, more room for the conversations themselves.",
    { reactions: { "♡": ["sam", "you"], "✦": ["jo"] } },
  );
  add(
    "commons",
    "sam",
    "Yes to that. I put a first sketch on the reference shelf. It’s deliberately rough — I’d love to know what feels clear and what doesn’t.",
  );
  add(
    "commons",
    "you",
    "The navigation is feeling good. Especially keeping notes and conversations close together.",
  );
  const parent = add(
    "commons",
    "jo",
    "What’s one small detail from a tool you use every day that makes it feel thoughtful?",
    { pinned: true, reactions: { "✦": ["maya", "ellis"] } },
  );
  add(
    "commons",
    "maya",
    "Remembering exactly where I left a conversation. It seems small until a tool forgets.",
    { parentId: parent.id },
  );
  add(
    "commons",
    "you",
    "And keeping the draft when I switch to another channel to check something.",
    { parentId: parent.id },
  );
  add("commons", "ellis", "A keyboard shortcut that opens the thing I was already looking for.", {
    parentId: parent.id,
  });
  add(
    "commons",
    "nia",
    "I added a few shapes and color studies to the shelf. The warm paper one is my favorite.",
  );
  add(
    "commons",
    "maya",
    "The thread above is becoming a nice checklist. We should turn it into a field note.",
  );
  add(
    "commons",
    "sam",
    "A good starting point for today: make one interaction complete, then make it feel effortless.",
    { reactions: { "♡": ["maya", "jo", "ellis"] } },
  );
  add(
    "introductions",
    "nia",
    "Hi, I’m Nia. I work across research and photography, and I’m interested in the ways a shared space can make collaboration feel natural.",
  );
  add(
    "introductions",
    "ellis",
    "Ellis here. I make small tools and collect the details that give them a sense of care. Happy to be here.",
  );
  add(
    "workshop",
    "sam",
    "The first navigation pass is ready for a look. Try the narrow view as well — the panes should collapse without losing your place.",
  );
  add("workshop", "you", "I’ll check the keyboard paths and leave notes in the thread.");
  add(
    "fieldnotes",
    "jo",
    "A place to begin\n\nThe best shared spaces make it easy to arrive, find your bearings, and contribute something small.\n\nKeep the navigation quiet. Let conversations carry the rhythm. A useful action should leave behind a visible result.",
  );
  add(
    "fieldnotes",
    "maya",
    "Details worth keeping\n\n• Drafts belong to a conversation.\n• Search should take you back to the original moment.\n• A thread needs enough context to stand on its own.\n• Files should remain easy to open and save.",
    { saved: true },
  );
  add(
    "dm-maya",
    "maya",
    "Could you take a look at the navigation later? I’m wondering whether the member panel feels too wide.",
  );
  add(
    "dm-maya",
    "you",
    "Absolutely. I’ll try it with a longer conversation and a few attachments.",
  );
  add(
    "dm-sam",
    "sam",
    "I left a short implementation note in the workshop. No rush — just wanted to keep you in the loop.",
  );
  const attachments: Attachment[] = [
    {
      id: "paper-study",
      name: "paper-study.svg",
      type: "image/svg+xml",
      size: 362,
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" fill="#e9e3d6"/><circle cx="230" cy="210" r="108" fill="#cf886a"/><rect x="290" y="112" width="142" height="196" rx="71" fill="#53746b"/><path d="M0 360H600" stroke="#b8af9d"/><text x="36" y="394" font-family="sans-serif" font-size="14" fill="#544d43">FORM STUDY / 01</text></svg>',
    },
    {
      id: "blue-study",
      name: "blue-hour.svg",
      type: "image/svg+xml",
      size: 320,
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" fill="#d8e0e7"/><rect x="66" y="72" width="240" height="280" rx="120" fill="#4e687f"/><circle cx="374" cy="210" r="112" fill="#aebac6"/><path d="M66 210H486" stroke="#edf1f4" stroke-width="2"/></svg>',
    },
    {
      id: "readme",
      name: "working-notes.md",
      type: "text/markdown",
      size: 130,
      content:
        "# Working notes\n\nKeep the draft. Respect the reading position. Make search useful.\n\nEvery action should leave a clear result.\n",
    },
  ];
  for (const item of attachments)
    if (item.content) item.size = new TextEncoder().encode(item.content).length;
  add("gallery", "nia", "A warm palette and a few simple forms.", {
    attachmentIds: ["paper-study"],
  });
  add("gallery", "sam", "A cooler direction for comparison.", { attachmentIds: ["blue-study"] });
  add("gallery", "jo", "A few working notes to keep close.", { attachmentIds: ["readme"] });
  return {
    version: 1,
    selfId: "you",
    workspace: "Fieldwork",
    activeChannelId: "commons",
    members,
    channels,
    messages,
    attachments,
    drafts: {},
    readAt: { commons: base + 5 * 240000, workshop: 0, "dm-maya": base + 15 * 240000 },
    settings: {
      compact: false,
      enterSends: true,
      showAvatars: true,
      sidebar: true,
      inspector: true,
    },
  };
}

/** One owner keeps all views on the same records; DOM is never the database. */
export class CommunityModel {
  constructor(readonly state: CommunityState) {}
  channel(id = this.state.activeChannelId): Channel {
    return this.state.channels.find((c) => c.id === id) ?? this.state.channels[0]!;
  }
  messages(channelId: string, parentId?: string): Message[] {
    return this.state.messages.filter((m) => m.channelId === channelId && m.parentId === parentId);
  }
  draft(channelId: string, parentId?: string): Draft {
    return (this.state.drafts[draftKey(channelId, parentId)] ??= {
      text: "",
      attachmentIds: [],
      expanded: false,
    });
  }
  unread(channel: Channel): number {
    return this.state.messages.filter(
      (m) =>
        m.channelId === channel.id &&
        m.authorId !== this.state.selfId &&
        m.createdAt > (this.state.readAt[channel.id] ?? 0),
    ).length;
  }
  markRead(channelId: string): void {
    this.state.readAt[channelId] = Math.max(
      0,
      ...this.state.messages.filter((m) => m.channelId === channelId).map((m) => m.createdAt),
    );
  }
  send(channelId: string, parentId?: string): Message | undefined {
    const channel = this.state.channels.find((c) => c.id === channelId);
    const draft = this.draft(channelId, parentId);
    if (!channel || channel.archived || (!draft.text.trim() && !draft.attachmentIds.length)) return;
    if (
      parentId &&
      !this.state.messages.some((m) => m.id === parentId && m.channelId === channelId)
    )
      return;
    const message: Message = {
      id: newId(),
      channelId,
      parentId,
      authorId: this.state.selfId,
      text: draft.text.trim(),
      createdAt: Date.now(),
      attachmentIds: [...draft.attachmentIds],
      quoteId: draft.quoteId,
      reactions: {},
      saved: false,
      pinned: false,
    };
    this.state.messages.push(message);
    this.state.drafts[draftKey(channelId, parentId)] = {
      text: "",
      attachmentIds: [],
      expanded: draft.expanded,
    };
    this.markRead(channelId);
    return message;
  }
  deleteMessage(id: string): boolean {
    const message = this.state.messages.find((m) => m.id === id);
    if (!message || message.authorId !== this.state.selfId) return false;
    this.state.messages = this.state.messages.filter((m) => m.id !== id && m.parentId !== id);
    delete this.state.drafts[draftKey(message.channelId, id)];
    return true;
  }
  edit(id: string, text: string): boolean {
    const message = this.state.messages.find((m) => m.id === id);
    if (
      !message ||
      message.authorId !== this.state.selfId ||
      (!text.trim() && !message.attachmentIds.length)
    )
      return false;
    message.text = text.trim();
    message.editedAt = Date.now();
    return true;
  }
  react(id: string, emoji: string): void {
    const message = this.state.messages.find((m) => m.id === id);
    if (!message) return;
    const people = message.reactions[emoji] ?? [];
    message.reactions[emoji] = people.includes(this.state.selfId)
      ? people.filter((personId) => personId !== this.state.selfId)
      : [...people, this.state.selfId];
    if (!message.reactions[emoji].length) delete message.reactions[emoji];
  }
  forward(id: string, channelId: string): Message | undefined {
    const source = this.state.messages.find((m) => m.id === id),
      target = this.state.channels.find((c) => c.id === channelId);
    if (!source || !target || target.archived) return;
    const copy: Message = {
      ...source,
      id: newId(),
      channelId,
      parentId: undefined,
      quoteId: undefined,
      forwardedFrom: source.id,
      authorId: this.state.selfId,
      createdAt: Date.now(),
      attachmentIds: [...source.attachmentIds],
      reactions: {},
      saved: false,
      pinned: false,
      editedAt: undefined,
    };
    this.state.messages.push(copy);
    return copy;
  }
  createChannel(
    name: string,
    kind: ChannelKind,
    section: string,
    members = this.state.members.map((m) => m.id),
  ): Channel | undefined {
    const trimmed = name.trim();
    if (!trimmed) return;
    const channel: Channel = {
      id: newId(),
      name: trimmed,
      kind,
      section: section.trim() || "Rooms",
      description: "",
      members,
      pinned: false,
      archived: false,
      notifications: "all",
    };
    this.state.channels.push(channel);
    return channel;
  }
  directMessage(memberId: string): Channel | undefined {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member || memberId === this.state.selfId) return;
    return (
      this.state.channels.find(
        (c) =>
          c.kind === "dm" && c.members.length === 2 && c.members.includes(memberId) && !c.archived,
      ) ?? this.createChannel(member.name, "dm", "Messages", [this.state.selfId, memberId])
    );
  }
  search(query: string, channelId = ""): Message[] {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return this.state.messages
      .filter(
        (m) =>
          (!channelId || m.channelId === channelId) &&
          terms.every((term) =>
            `${m.text} ${this.state.members.find((p) => p.id === m.authorId)?.name ?? ""} ${this.channel(m.channelId).name}`
              .toLocaleLowerCase()
              .includes(term),
          ),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

/** Reject incompatible/corrupt snapshots rather than mounting half a state. */
export function restoreCommunity(value: string | null): CommunityState {
  if (!value) return seedCommunity();
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object") return seedCommunity();
    const state = data as CommunityState;
    if (
      state.version !== 1 ||
      !Array.isArray(state.channels) ||
      !state.channels.length ||
      !Array.isArray(state.members) ||
      !Array.isArray(state.messages) ||
      !Array.isArray(state.attachments) ||
      !state.drafts ||
      !state.readAt ||
      !state.settings
    )
      return seedCommunity();
    if (
      !state.members.some((m) => m.id === state.selfId) ||
      !state.channels.every(
        (c) => typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.members),
      ) ||
      !state.messages.every(
        (m) =>
          typeof m.id === "string" &&
          typeof m.text === "string" &&
          Number.isFinite(m.createdAt) &&
          Array.isArray(m.attachmentIds) &&
          m.reactions &&
          typeof m.reactions === "object",
      )
    )
      return seedCommunity();
    if (!state.channels.some((c) => c.id === state.activeChannelId))
      state.activeChannelId = state.channels[0]!.id;
    for (const draft of Object.values(state.drafts))
      if (typeof draft.text !== "string" || !Array.isArray(draft.attachmentIds))
        return seedCommunity();
    return state;
  } catch {
    return seedCommunity();
  }
}
