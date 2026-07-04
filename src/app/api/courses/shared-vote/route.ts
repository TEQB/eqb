import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const voteSchema = z.object({
  requestId: z.string().uuid(),
  vote: z.enum(["approve", "reject"]),
});

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { requestId, vote } = parsed.data;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id, programme_id, role, current_level, full_name")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as {
      id: string;
      programme_id: string;
      role: string;
      current_level: number;
      full_name: string;
    } | null;

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.role !== "student") {
      return NextResponse.json({ error: "Only students can vote" }, { status: 403 });
    }

    const service = createServiceClient();

    const { data: rawRequest } = await (service as any)
      .from("shared_course_requests")
      .select("*, course:course_id!inner(id, code, title, level, programme_id)")
      .eq("id", requestId)
      .single();

    const sharedRequest = rawRequest as unknown as {
      id: string;
      course_id: string;
      programme_id: string;
      requester_id: string;
      action_type: string;
      status: string;
      course: { id: string; code: string; title: string; level: number; programme_id: string };
    } | null;

    if (!sharedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (sharedRequest.status !== "pending") {
      return NextResponse.json({ error: "This request has already been resolved" }, { status: 400 });
    }

    if (sharedRequest.programme_id !== profile.programme_id) {
      return NextResponse.json({ error: "You are not in the relevant programme" }, { status: 403 });
    }

    if (sharedRequest.course.level !== profile.current_level) {
      return NextResponse.json({ error: "Only students at the same level can vote" }, { status: 403 });
    }

    if (sharedRequest.requester_id === profile.id) {
      return NextResponse.json({ error: "You cannot vote on your own request" }, { status: 403 });
    }

    const { data: existingVote } = await (service as any)
      .from("shared_course_votes")
      .select("id, vote")
      .eq("request_id", requestId)
      .eq("voter_id", profile.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted on this request", yourVote: existingVote.vote }, { status: 400 });
    }

    const { error: voteInsertError } = await (service as any)
      .from("shared_course_votes")
      .insert({
        request_id: requestId,
        voter_id: profile.id,
        vote,
      });

    if (voteInsertError) {
      logger.error({
        event: "courses.vote_failed",
        message: "Failed to record vote",
        userId: user.id,
        metadata: { requestId, error: voteInsertError.message },
      });
      return NextResponse.json({ error: voteInsertError.message }, { status: 500 });
    }

    const { data: voteCountsRaw } = await (service as any)
      .from("shared_course_votes")
      .select("vote")
      .eq("request_id", requestId);

    const allVotes = (voteCountsRaw ?? []) as Array<{ vote: string }>;
    const approveCount = allVotes.filter((v) => v.vote === "approve").length;
    const rejectCount = allVotes.filter((v) => v.vote === "reject").length;

    let resolved = false;
    let newStatus = "pending";
    let outcomeMessage = "";

    if (approveCount >= 2) {
      resolved = true;
      newStatus = "approved";

      if (sharedRequest.action_type === "join") {
        const { error: linkError } = await (service as any)
          .from("programme_courses")
          .insert({
            programme_id: sharedRequest.programme_id,
            course_id: sharedRequest.course_id,
          });
        if (linkError) {
          logger.error({
            event: "courses.vote_resolve_link_failed",
            message: "Failed to link course after approval",
            userId: user.id,
            metadata: { requestId, error: linkError.message },
          });
        }
        outcomeMessage = `${sharedRequest.programme_id} now takes ${sharedRequest.course.code}`;
      } else {
        const { error: unlinkError } = await (service as any)
          .from("programme_courses")
          .delete()
          .eq("course_id", sharedRequest.course_id)
          .eq("programme_id", sharedRequest.programme_id);
        if (unlinkError) {
          logger.error({
            event: "courses.vote_resolve_unlink_failed",
            message: "Failed to unlink course after approval",
            userId: user.id,
            metadata: { requestId, error: unlinkError.message },
          });
        }
        outcomeMessage = `${sharedRequest.programme_id} no longer takes ${sharedRequest.course.code}`;
      }
    } else if (rejectCount >= 2) {
      resolved = true;
      newStatus = "rejected";
      outcomeMessage = `Request to ${sharedRequest.action_type} ${sharedRequest.course.code} was rejected`;
    }

    if (resolved) {
      await (service as any)
        .from("shared_course_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", requestId);

      const { data: eligibleRaw } = await service
        .from("profiles")
        .select("id")
        .eq("programme_id", sharedRequest.programme_id)
        .eq("current_level", sharedRequest.course.level)
        .eq("role", "student");

      const eligibleStudents = (eligibleRaw ?? []) as Array<{ id: string }>;

      const outcomeTitle = newStatus === "approved"
        ? `${sharedRequest.course.code} has been ${sharedRequest.action_type === "join" ? "added" : "removed"}`
        : `Request to ${sharedRequest.action_type} ${sharedRequest.course.code} was rejected`;

      for (const student of eligibleStudents) {
        await createNotification({
          user_id: student.id,
          type: "shared_course_vote_outcome",
          title: outcomeTitle,
          body: outcomeMessage,
          link: "/browse",
          metadata: {
            requestId,
            actionType: sharedRequest.action_type,
            courseId: sharedRequest.course_id,
            courseCode: sharedRequest.course.code,
            status: newStatus,
          },
        });
      }

      logger.info({
        event: "courses.vote_resolved",
        message: outcomeMessage,
        userId: user.id,
        metadata: { requestId, status: newStatus, approveCount, rejectCount },
      });
    }

    return NextResponse.json({
      success: true,
      resolved,
      status: newStatus,
      voteCounts: { approve: approveCount, reject: rejectCount },
      message: resolved ? outcomeMessage : "Your vote has been recorded",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.vote_exception", message: "Exception voting on shared course request", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to vote" }, { status: 500 });
  }
}
