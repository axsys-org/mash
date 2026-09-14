import { describe, expect, it } from "vitest";
import {
  CommunityModel,
  draftKey,
  restoreCommunity,
  seedCommunity,
} from "../../../../apps/catalog/src/stories/community-state.js";

describe("community records", () => {
  it("retains channel and thread drafts and sends only to the captured destination", () => {
    const model = new CommunityModel(seedCommunity());
    model.draft("commons").text = "A room draft";
    model.draft("workshop").text = "A workshop draft";
    const parent = model.messages("commons").find((m) => m.authorId === "jo")!;
    model.draft("commons", parent.id).text = "A threaded reply";
    model.state.activeChannelId = "dm-maya";
    const sent = model.send("commons", parent.id)!;
    expect(sent.channelId).toBe("commons");
    expect(sent.parentId).toBe(parent.id);
    expect(model.draft("commons").text).toBe("A room draft");
    expect(model.draft("workshop").text).toBe("A workshop draft");
    expect(model.draft("commons", parent.id).text).toBe("");
    expect(model.messages("dm-maya").some((m) => m.id === sent.id)).toBe(false);
  });
  it("edits owned messages, toggles per-person reactions, forwards content and deletes owned threads", () => {
    const model = new CommunityModel(seedCommunity());
    const theirs = model.messages("commons").find((m) => m.authorId === "maya")!;
    expect(model.edit(theirs.id, "Changed")).toBe(false);
    expect(model.deleteMessage(theirs.id)).toBe(false);
    model.draft("commons").text = "Original";
    const own = model.send("commons")!;
    expect(model.edit(own.id, "Revised")).toBe(true);
    model.react(own.id, "♡");
    expect(own.reactions["♡"]).toEqual(["you"]);
    model.react(own.id, "♡");
    expect(own.reactions["♡"]).toBeUndefined();
    model.draft("commons", own.id).text = "Reply";
    const reply = model.send("commons", own.id)!;
    const copy = model.forward(own.id, "workshop")!;
    expect(copy.text).toBe("Revised");
    expect(copy.forwardedFrom).toBe(own.id);
    expect(copy.parentId).toBeUndefined();
    model.deleteMessage(own.id);
    expect(model.state.messages.some((m) => m.id === reply.id)).toBe(false);
    expect(model.state.messages.some((m) => m.id === copy.id)).toBe(true);
  });
  it("keeps archived drafts, reuses DMs, and searches the original message IDs", () => {
    const model = new CommunityModel(seedCommunity());
    const channel = model.createChannel("Research", "notebook", "Make")!;
    model.draft(channel.id).text = "Keep this thought";
    channel.archived = true;
    expect(model.send(channel.id)).toBeUndefined();
    expect(model.draft(channel.id).text).toBe("Keep this thought");
    channel.archived = false;
    const message = model.send(channel.id)!;
    expect(model.search("thought")[0]?.id).toBe(message.id);
    expect(model.directMessage("maya")?.id).toBe("dm-maya");
    const dm = model.directMessage("nia")!;
    expect(model.directMessage("nia")?.id).toBe(dm.id);
    model.markRead("commons");
    expect(model.unread(model.channel("commons"))).toBe(0);
  });
  it("restores serializable edits and rejects invalid snapshots", () => {
    const model = new CommunityModel(seedCommunity());
    model.draft("commons").text = "Persist me";
    const restored = restoreCommunity(JSON.stringify(model.state));
    expect(restored.drafts[draftKey("commons")]?.text).toBe("Persist me");
    expect(restoreCommunity('{"version":1}').channels).toHaveLength(7);
    expect(restoreCommunity("broken").selfId).toBe("you");
  });
});
