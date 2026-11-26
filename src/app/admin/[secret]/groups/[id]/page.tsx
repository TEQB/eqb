"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { Trash2, Send, UserMinus, ShieldCheck, LogOut } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_active: boolean;
  course: { code: string; title: string } | null;
}

interface Member {
  id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  profile: { full_name: string | null; matric_number: string | null; avatar_url: string | null } | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  reply_to_id: string | null;
  deleted_at: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null } | null;
}

function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [path]);

  if (!url) return <div className="w-56 h-40 bg-gray-200 rounded-xl animate-pulse" />;
  return <img src={url} alt="chat" className="max-w-[16rem] rounded-xl object-cover" />;
}

export default function AdminGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const secret = params.secret as string;
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [gRes, mRes] = await Promise.all([
      fetch(`/api/admin/study-groups/${groupId}`),
      fetch(`/api/admin/study-groups/${groupId}/messages`),
    ]);
    const gData = await gRes.json();
    const mData = await mRes.json();
    if (gData.error) {
      toast.error(gData.error);
      router.push(`/admin/${secret}/groups`);
      return;
    }
    setGroup(gData.group);
    setMembers(gData.members ?? []);
    setMessages(mData.messages ?? []);
    setLoading(false);
  }, [groupId, router, secret]);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const service = await fetch("/api/admin/study-groups");
      void service;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .single();
      setMyProfileId((profile as any)?.id ?? null);
    });
  }, [load, supabase]);

  // Realtime: new messages, edits/deletes, member changes
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`admin-group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "study_group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_members", filter: `group_id=eq.${groupId}` },
        () => {
          fetch(`/api/admin/study-groups/${groupId}`)
            .then((r) => r.json())
            .then((d) => setMembers(d.members ?? []))
            .catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/study-groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "text" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setMessages((prev) => [...prev, data.message]);
      setInput("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msg: Message) => {
    if (!confirm("Delete this message for everyone?")) return;
    try {
      const res = await fetch(`/api/admin/study-groups/${groupId}/messages/${msg.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted_at: new Date().toISOString(), content: null, media_url: null } : m)));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete message");
    }
  };

  const removeMember = async (member: Member) => {
    const name = member.profile?.full_name || member.profile?.matric_number || "this member";
    if (!confirm(`Remove ${name} from this group?`)) return;
    try {
      const res = await fetch(`/api/admin/study-groups/${groupId}/members/${member.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${name} removed`);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    }
  };

  const setMemberRole = async (member: Member, role: "admin" | "member") => {
    try {
      const res = await fetch(`/api/admin/study-groups/${groupId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  };

  const disbandGroup = async () => {
    if (!confirm(`Disband "${group?.name}"? The group will be deactivated for all members.`)) return;
    try {
      const res = await fetch(`/api/admin/study-groups/${groupId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disband");
      toast.success("Group disbanded");
      router.push(`/admin/${secret}/groups`);
    } catch (e: any) {
      toast.error(e.message || "Failed to disband group");
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading group...</div>;
  }
  if (!group) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={`/admin/${secret}/groups`} className="text-sm text-gray-500 hover:text-[#7A1030]">
            ← All groups
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{group.name}</h1>
          <p className="text-sm text-gray-500">
            {group.course ? `${group.course.code} — ${group.course.title}` : ""}
            {group.is_active ? "" : " · DISBANDED"}
          </p>
        </div>
        {group.is_active && (
          <button
            onClick={disbandGroup}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <LogOut size={16} /> Disband Group
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: "70vh" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>
            )}
            {messages.map((msg) => {
              const mine = msg.sender_id === myProfileId;
              const senderName = msg.sender?.full_name || "Unknown";
              return (
                <div key={msg.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${mine ? "order-2" : ""}`}>
                    {!mine && (
                      <p className="text-xs text-gray-500 mb-0.5 px-1">
                        {senderName}
                        {members.find((m) => m.profile_id === msg.sender_id)?.role === "e-admin" && (
                          <span className="ml-1 text-purple-600 font-semibold">· E-Admin</span>
                        )}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? "bg-[#7A1030] text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      {msg.deleted_at ? (
                        <span className="italic text-gray-400">This message was deleted</span>
                      ) : msg.type === "image" && msg.media_url ? (
                        <ChatImage path={msg.media_url} />
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!msg.deleted_at && (
                        <button
                          onClick={() => deleteMessage(msg)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {group.is_active && (
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Message as E-Admin..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1030]/30"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="p-2.5 rounded-full bg-[#7A1030] text-white hover:bg-[#5e0c24] disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: "70vh" }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Members ({members.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.profile?.full_name || m.profile?.matric_number || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400">{m.profile?.matric_number}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.role === "e-admin" ? (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">E-ADMIN</span>
                  ) : m.role === "admin" ? (
                    <span className="text-[10px] font-bold text-[#7A1030] bg-red-50 px-1.5 py-0.5 rounded">ADMIN</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">MEMBER</span>
                  )}
                  {m.role !== "e-admin" && group.is_active && (
                    <>
                      {m.role === "member" ? (
                        <button
                          onClick={() => setMemberRole(m, "admin")}
                          className="p-1 text-gray-400 hover:text-[#7A1030]"
                          title="Make group admin"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setMemberRole(m, "member")}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Demote to member"
                        >
                          <ShieldCheck size={14} className="opacity-40" />
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(m)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove from group"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
