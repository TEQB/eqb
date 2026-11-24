"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QRCode from "qrcode";
import {
  ChevronLeft, Send, QrCode, LogOut, Shield, X, UserX, User, Image as ImageIcon, Reply,
  Users, Smile,
} from "lucide-react";
import { ImageViewer } from "@/components/ImageViewer";

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  reply_to_id: string | null;
  created_at: string;
}

interface GroupMember {
  membership_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  is_me: boolean;
  matric_number: string | null;
  full_name: string | null;
  programme_name: string | null;
  current_level: number | null;
  share_name: boolean;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  course_id: string;
  course?: { id: string; code: string; title: string; level: number };
}

function ChatImage({ path, onClick }: { path: string; onClick?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [path, supabase]);

  if (!url) {
    return <div className="w-56 h-40 bg-gray-200 rounded-xl animate-pulse" />;
  }
  return (
    <button onClick={onClick} className="block">
      <img src={url} alt="chat" className="max-w-[16rem] rounded-xl object-cover" />
    </button>
  );
}

function StudyGroupChatPageInner() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"chat" | "members">("chat");
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ profile_id: string; full_name: string | null; matric_number: string | null }>>([]);
  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const myMembership = members.find((m) => m.is_me);
  const myProfileId = myMembership?.profile_id ?? null;
  const isAdmin = myMembership?.role === "admin";
  const memberMap = useMemo(() => new Map(members.map((m) => [m.profile_id, m])), [members]);
  const messageMap = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const senderLabel = useCallback(
    (senderId: string) => {
      const m = memberMap.get(senderId);
      if (!m) return "Unknown";
      const name = m.full_name ? `${m.full_name} · ` : "";
      return `${name}${m.matric_number ?? "Student"}`;
    },
    [memberMap],
  );

  const messagePreview = useCallback((msg: Message) => {
    if (msg.type === "image") return "Photo";
    return msg.content ?? "";
  }, []);

  // Extract @mentions from message content
  const extractMentions = useCallback((content: string | null) => {
    if (!content) return [];
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map((m) => m.slice(1)); // Remove @
  }, []);

  // Check if a message mentions current user
  const isMentioned = useCallback((content: string | null) => {
    if (!content || !myProfileId) return false;
    const mentions = extractMentions(content);
    return mentions.some((mention) => {
      const member = members.find((m) =>
        m.matric_number?.toLowerCase() === mention.toLowerCase() ||
        m.full_name?.toLowerCase().includes(mention.toLowerCase())
      );
      return member?.profile_id === myProfileId;
    });
  }, [members, myProfileId, extractMentions]);

  // Get delivery status for message
  const getDeliveryStatus = useCallback((msg: any) => {
    if (msg.sender_id !== myProfileId) return null;
    const readBy = (msg.read_by || []) as Array<{ profile_id: string; read_at: string }>;
    const totalMembers = members.length;
    const readCount = readBy.length;
    
    if (readCount >= totalMembers - 1) return "read";
    if (readCount > 0) return "delivered";
    return "sent";
  }, [myProfileId, members]);

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) =>
      m.content?.toLowerCase().includes(q) ||
      senderLabel(m.sender_id).toLowerCase().includes(q)
    );
  }, [messages, searchQuery, senderLabel]);

  const loadDetail = async () => {
    const res = await fetch(`/api/study-groups/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setGroup(data.group);
    setMembers(data.members ?? []);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await loadDetail();
        const res = await fetch(`/api/study-groups/${id}/messages`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load messages");
        if (!cancelled && data.messages) setMessages(data.messages as Message[]);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`group-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          upsertMessage(msg);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_members", filter: `group_id=eq.${id}` },
        () => {
          loadDetail();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_typing", filter: `group_id=eq.${id}` },
        () => {
          // Refresh typing indicators
          fetch(`/api/study-groups/${id}/typing`)
            .then((res) => res.json())
            .then((data) => setTypingUsers(data.typing_users || []))
            .catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_message_reactions", filter: `group_id=eq.${id}` },
        () => {
          // Reload messages to get updated reactions
          fetch(`/api/study-groups/${id}/messages`)
            .then((res) => res.json())
            .then((data) => setMessages(data.messages || []))
            .catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase, upsertMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, tab]);

  // Typing indicator
  const handleTyping = () => {
    if (!myProfileId) return;
    fetch(`/api/study-groups/${id}/typing`, { method: "POST" }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/study-groups/${id}/typing`, { method: "DELETE" }).catch(() => {});
    }, 3000);
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    if (!myProfileId) return;
    fetch(`/api/study-groups/${id}/messages/${messageId}/read`, { method: "POST" }).catch(() => {});
  };

  // Add/remove reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!myProfileId) return;
    try {
      const res = await fetch(`/api/study-groups/${id}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        // Reload messages to get updated reactions
        const msgRes = await fetch(`/api/study-groups/${id}/messages`);
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !myProfileId || sending) return;
    setSending(true);
    setInput("");
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    fetch(`/api/study-groups/${id}/typing`, { method: "DELETE" }).catch(() => {});
    try {
      const res = await fetch(`/api/study-groups/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "text", reply_to_id: replyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      if (data.message) upsertMessage(data.message as Message);
    } catch (e: any) {
      alert(e.message || "Failed to send");
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myProfileId) return;
    e.target.value = "";
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const res = await fetch(`/api/study-groups/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", media_url: path, reply_to_id: replyTo?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send image");
      if (data.message) upsertMessage(data.message as Message);
      setReplyTo(null);
    } catch (e: any) {
      alert(e.message || "Failed to send image");
    } finally {
      setUploading(false);
    }
  };

  const openImageViewer = async (path: string) => {
    const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
    if (data?.signedUrl) setViewerUrl(data.signedUrl);
  };

  const handleLeave = async () => {
    if (!confirm("Leave this study group?")) return;
    const res = await fetch(`/api/study-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave" }),
    });
    if (res.ok) router.push("/study-groups");
  };

  const handleRemoveMember = async (memberProfileId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    await fetch(`/api/study-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-member", member_id: memberProfileId }),
    });
    loadDetail();
  };

  const updatePrivacy = async (key: "share_name", value: boolean) => {
    if (!myMembership) return;
    const next = {
      share_name: value,
    };
    await fetch(`/api/study-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-privacy", ...next }),
    });
    loadDetail();
  };

  const openQr = async () => {
    if (!group?.invite_code) return;
    const url = await QRCode.toDataURL(group.invite_code, { width: 240, margin: 1 });
    setQrDataUrl(url);
    setQrOpen(true);
  };

  const renderReplyQuote = (msg: Message, mine: boolean) => {
    const replied = msg.reply_to_id ? messageMap.get(msg.reply_to_id) : null;
    if (!replied) {
      return <p className={`text-[11px] italic mb-1 ${mine ? "text-white/60" : "text-gray-500"}`}>Original message</p>;
    }
    // Check if this is a nested reply (reply to a reply)
    const nestedReply = replied.reply_to_id ? messageMap.get(replied.reply_to_id) : null;
    return (
      <div className={`rounded-lg px-2 py-1 mb-1 text-[11px] ${mine ? "bg-white/20" : "bg-black/5"} ${nestedReply ? "border-l-2 border-gray-300" : ""}`}>
        <p className={`font-semibold ${mine ? "text-white" : "text-[#7A1030]"}`}>{senderLabel(replied.sender_id)}</p>
        <p className={`truncate ${mine ? "text-white/80" : "text-gray-600"}`}>{messagePreview(replied)}</p>
        {nestedReply && (
          <p className={`text-[10px] ${mine ? "text-white/50" : "text-gray-400"}`}>
            Reply to {senderLabel(nestedReply.sender_id)}
          </p>
        )}
      </div>
    );
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!group) return <p className="text-gray-500">Group not found.</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{group.name}</h1>
            {group.course && (
              <p className="text-xs text-gray-500">
                {group.course.code} — {group.course.title}
              </p>
            )}
          </div>
          <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-[#7A1030] hover:bg-[#7A1030]/10 rounded-lg">
            <Users size={20} />
          </button>
          <button onClick={openQr} className="p-2 text-[#7A1030] hover:bg-[#7A1030]/10 rounded-lg">
            <QrCode size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
          {(["chat", "members"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {t === "chat" ? "Chat" : `Members (${members.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: "calc(100dvh - 300px)", minHeight: 420 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Search bar */}
            {searchOpen && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7A1030]"
                />
              </div>
            )}

            {typingUsers.length > 0 && (
              <div className="text-xs text-gray-500 mb-2">
                {typingUsers.map((u, i) => (
                  <span key={u.profile_id}>
                    {i > 0 && ", "}
                    {u.full_name || u.matric_number || "Someone"} is typing...
                  </span>
                ))}
              </div>
            )}
            {filteredMessages.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No messages yet. Start the conversation!</p>
            ) : (
              filteredMessages.map((msg) => {
                const mine = msg.sender_id === myProfileId;
                const readBy = (msg as any).read_by || [];
                const reactions = (msg as any).reactions || [];
                const reactionCounts = reactions.reduce((acc: Record<string, number>, r: any) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {});
                const mentioned = isMentioned(msg.content);
                const deliveryStatus = getDeliveryStatus(msg);
                return (
                  <div
                    key={msg.id}
                    className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}
                    onContextMenu={(e) => { e.preventDefault(); setReplyTo(msg); }}
                  >
                    {!mine && (
                      <span className="text-xs text-gray-500 mb-0.5 ml-1 self-start">{senderLabel(msg.sender_id)}</span>
                    )}
                    {mentioned && (
                      <span className="text-xs text-[#7A1030] font-semibold mb-0.5 ml-1 self-start">@mentioned</span>
                    )}
                    <div className="relative">
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine ? "bg-[#7A1030] text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                        }`}
                      >
                        {msg.reply_to_id && renderReplyQuote(msg, mine)}
                        {msg.type === "image" && msg.media_url ? (
                          <ChatImage path={msg.media_url} onClick={() => openImageViewer(msg.media_url!)} />
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {msg.content?.split(/(@\w+)/g).map((part, i) =>
                              part.startsWith("@") ? (
                                <span key={i} className={`font-semibold ${mine ? "text-white" : "text-[#7A1030]"}`}>
                                  {part}
                                </span>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        )}
                        {msg.type === "image" && msg.content && (
                          <p className={`text-xs mt-1 ${mine ? "text-white/80" : "text-gray-500"}`}>{msg.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => setReplyTo(msg)}
                          className={`opacity-0 group-hover:opacity-100 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-[#7A1030] shadow-sm transition-opacity`}
                          title="Reply"
                        >
                          <Reply size={12} />
                        </button>
                        <button
                          onClick={() => setReactionPickerOpen(reactionPickerOpen === msg.id ? null : msg.id)}
                          className={`opacity-0 group-hover:opacity-100 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-[#7A1030] shadow-sm transition-opacity`}
                          title="React"
                        >
                          <Smile size={12} />
                        </button>
                        {Object.keys(reactionCounts).length > 0 && (
                          <div className="flex gap-1">
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="bg-gray-100 rounded-full px-2 py-0.5 text-xs hover:bg-gray-200"
                              >
                                {emoji} {count}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {reactionPickerOpen === msg.id && (
                        <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2 z-10">
                          {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                toggleReaction(msg.id, emoji);
                                setReactionPickerOpen(null);
                              }}
                              className="text-2xl hover:bg-gray-100 rounded p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {mine && deliveryStatus === "sent" && " · Sent"}
                      {mine && deliveryStatus === "delivered" && " · Delivered"}
                      {mine && deliveryStatus === "read" && " · Read"}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex-1 border-l-4 border-[#7A1030] bg-white rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-[#7A1030]">Replying to {senderLabel(replyTo.sender_id)}</p>
                <p className="text-xs text-gray-600 truncate">{messagePreview(replyTo)}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 border-t border-gray-100">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !myProfileId}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-gray-200"
              title="Send image"
            >
              {uploading ? <span className="text-xs">...</span> : <ImageIcon size={18} className="text-[#7A1030]" />}
            </button>
            <input
              className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm outline-none border border-gray-200 focus:border-[#7A1030]"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              maxLength={2000}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="w-10 h-10 bg-[#7A1030] rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Privacy */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-[#7A1030]" />
              <h2 className="font-semibold text-gray-900">Your privacy in this group</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              You are always identified by your matric number. Choose what else to share:
            </p>
            {([
              ["share_name", "Share my name"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  checked={myMembership?.[key] ?? false}
                  onChange={(e) => updatePrivacy(key, e.target.checked)}
                  className="w-4 h-4 accent-[#7A1030]"
                />
              </label>
            ))}
          </div>

          {/* Members */}
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.membership_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7A1030]/10 rounded-full flex items-center justify-center">
                  <User size={18} className="text-[#7A1030]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{m.matric_number ?? "Student"}</span>
                    {m.role === "admin" && (
                      <span className="bg-[#7A1030]/10 text-[#7A1030] text-[10px] font-semibold rounded-full px-2 py-0.5">Admin</span>
                    )}
                    {m.is_me && (
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-semibold rounded-full px-2 py-0.5">You</span>
                    )}
                  </div>
                  {m.full_name && <p className="text-sm text-gray-600">{m.full_name}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.programme_name ?? ""}{m.current_level ? ` · Level ${m.current_level}` : ""}
                  </p>
                </div>
                {isAdmin && !m.is_me && (
                  <button onClick={() => handleRemoveMember(m.profile_id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <UserX size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleLeave}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-red-600 font-semibold hover:bg-red-50"
          >
            <LogOut size={18} /> Leave group
          </button>
        </div>
      )}

      {/* QR modal */}
      {qrOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setQrOpen(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Invite to group</h2>
              <button onClick={() => setQrOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 text-center mb-4">
              {group.name} — ask classmates to scan this code or enter the invite code.
            </p>
            {qrDataUrl && (
              <div className="flex justify-center bg-white p-4 rounded-2xl border border-gray-200">
                <img src={qrDataUrl} alt="QR code" width={200} height={200} />
              </div>
            )}
            <div className="mt-4 bg-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Invite code</p>
              <p className="text-xl font-bold tracking-widest text-gray-900">{group.invite_code}</p>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Only students enrolled in {group.course?.code} can join.
            </p>
          </div>
        </div>
      )}

      {/* Image viewer modal */}
      <ImageViewer visible={!!viewerUrl} url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </div>
  );
}

export default function StudyGroupChatPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-4">Loading...</div>;
  }

  return <StudyGroupChatPageInner />;
}
