import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { queryLogs, getLogStats } from "@/lib/db-logger";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: rawProfile } = await service
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  const profile = rawProfile as unknown as { role: string } | null;
  if (profile?.role !== "super_admin") return null;
  return { user, service, supabase };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const session = await assertAdmin();
    if (!session) {
      logger.warn({ event: "admin.unauthorized", message: "Unauthorized admin GET", ip, path: req.nextUrl.pathname });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { service } = session;
    const action = req.nextUrl.searchParams.get("action");

    switch (action) {
      case "stats": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [{ count: total }, { count: published }, { count: suspended }, { count: students }, { count: pending }, { count: todayUploads }, { count: totalFlags }, { count: totalSolutions }] = await Promise.all([
          service.from("past_questions").select("*", { count: "exact", head: true }),
          service.from("past_questions").select("*", { count: "exact", head: true }).eq("status", "published"),
          service.from("past_questions").select("*", { count: "exact", head: true }).eq("status", "suspended"),
          service.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
          service.from("past_questions").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
          service.from("past_questions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
          service.from("flags").select("*", { count: "exact", head: true }),
          service.from("solutions").select("*", { count: "exact", head: true }),
        ]);
        const flagRate = total && total > 0 ? ((totalFlags ?? 0) / total) * 100 : 0;

        const { data: rawCourses } = await service
          .from("past_questions")
          .select("course_id, courses!inner(code)")
          .eq("status", "published");
        const courseCounts: Record<string, { code: string; count: number }> = {};
        if (rawCourses) {
          for (const row of rawCourses as unknown as Array<{ course_id: string; courses: { code: string } }>) {
            const code = row.courses?.code || row.course_id.slice(0, 8);
            if (!courseCounts[code]) courseCounts[code] = { code, count: 0 };
            courseCounts[code].count++;
          }
        }
        const topCourses = Object.values(courseCounts).sort((a, b) => b.count - a.count).slice(0, 5);

        const { data: rawUploads } = await service
          .from("past_questions")
          .select("uploaded_by, profiles!inner(full_name)")
          .eq("status", "published");
        const studentCounts: Record<string, { name: string; count: number }> = {};
        if (rawUploads) {
          for (const row of rawUploads as unknown as Array<{ uploaded_by: string; profiles: { full_name: string } }>) {
            const name = row.profiles?.full_name || "Unknown";
            if (!studentCounts[name]) studentCounts[name] = { name, count: 0 };
            studentCounts[name].count++;
          }
        }
        const topStudents = Object.values(studentCounts).sort((a, b) => b.count - a.count).slice(0, 5);

        const { data: rawFlagCourses } = await service
          .from("past_questions")
          .select("id, flag_count, courses!inner(code)")
          .eq("status", "published");
        const flagRates: Record<string, { code: string; total: number; flags: number }> = {};
        if (rawFlagCourses) {
          for (const row of rawFlagCourses as unknown as Array<{ id: string; flag_count: number; courses: { code: string } }>) {
            const code = row.courses?.code || "?";
            if (!flagRates[code]) flagRates[code] = { code, total: 0, flags: 0 };
            flagRates[code].total++;
            flagRates[code].flags += row.flag_count;
          }
        }
        const flaggedCourses = Object.values(flagRates).map((c) => ({ code: c.code, rate: c.total > 0 ? (c.flags / c.total) * 100 : 0 })).sort((a, b) => b.rate - a.rate).slice(0, 5);

        const weeks: { week: string; count: number }[] = [];
        for (let i = 7; i >= 0; i--) {
          const ws = new Date();
          ws.setDate(ws.getDate() - ws.getDay() - i * 7);
          ws.setHours(0, 0, 0, 0);
          const we = new Date(ws);
          we.setDate(we.getDate() + 7);
          const { count } = await service.from("past_questions").select("*", { count: "exact", head: true }).gte("created_at", ws.toISOString()).lt("created_at", we.toISOString());
          weeks.push({ week: `${ws.getMonth() + 1}/${ws.getDate()}`, count: count ?? 0 });
        }

        return NextResponse.json({
          stats: { totalQuestions: total ?? 0, publishedQuestions: published ?? 0, suspendedQuestions: suspended ?? 0, totalStudents: students ?? 0, pendingReview: pending ?? 0, uploadsToday: todayUploads ?? 0, totalSolutions: totalSolutions ?? 0, flagRate },
          topCourses,
          topStudents,
          flaggedCourses,
          weeklyTrend: weeks,
        });
      }

      case "courses": {
        const { data: list } = await service.from("courses").select("id, code, title, level").order("code");
        return NextResponse.json({ courses: list ?? [] });
      }

      case "queue": {
        const { data: raw } = await service
          .from("past_questions")
          .select("id, course_id, year, semester, exam_type, file_type, courses(code), status, created_at")
          .in("status", ["pending_review", "suspended"])
          .order("created_at", { ascending: false });
        return NextResponse.json({ questions: raw ?? [] });
      }

      case "list-all-questions": {
        const status = req.nextUrl.searchParams.get("status");
        const programmeId = req.nextUrl.searchParams.get("programme_id");
        const level = req.nextUrl.searchParams.get("level");
        const search = req.nextUrl.searchParams.get("search");
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const pageSize = 20;
        const offset = (page - 1) * pageSize;

        let query = service
          .from("past_questions")
          .select(`
            id, course_id, year, semester, exam_type, file_url, file_type, status, flag_count, created_at,
            courses!inner(code, title, level, department_id),
            profiles!inner(full_name, auth_user_id)
          `, { count: "exact" });

        if (status && status !== "all") {
          query = query.eq("status", status);
        }
        if (programmeId) {
          query = query.eq("courses.department_id", programmeId);
        }
        if (level) {
          query = query.eq("courses.level", parseInt(level));
        }
        if (search) {
          query = query.or(`courses.code.ilike.%${search}%,courses.title.ilike.%${search}%`);
        }

        const { data: rawQuestions, count, error } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) {
          logger.error({ event: "admin.list_all_questions_error", message: "Failed to list questions", error: error.message });
          return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const questionsWithUrls = (rawQuestions ?? []).map((q: Record<string, unknown>) => ({
          ...q,
          file_url: q.file_url ? `${supabaseUrl}/storage/v1/object/public/approved/${q.file_url}` : null,
        }));

        const authUserIds = Array.from(
          new Set(
            (questionsWithUrls as Array<{ profiles?: { auth_user_id: string } }>)
              .map((q) => q.profiles?.auth_user_id)
              .filter(Boolean),
          ),
        ) as string[];
        const emailMap = new Map<string, string>();
        if (authUserIds.length > 0) {
          const result = await service.auth.admin.listUsers({ perPage: 1000 });
          if (result.data?.users) {
            for (const u of result.data.users) {
              if (u.id && u.email) emailMap.set(u.id, u.email);
            }
          }
        }

        const questionsWithEmail = (questionsWithUrls as Array<Record<string, unknown>>).map((q) => {
          const profile = q.profiles as Record<string, unknown> | undefined;
          const authUid = profile?.auth_user_id as string | undefined;
          return {
            ...q,
            uploader_email: authUid ? emailMap.get(authUid) || null : null,
          };
        });

        const deptIds = Array.from(
          new Set(
            (questionsWithEmail as Array<{ courses?: { department_id: string } }>)
              .map((q) => q.courses?.department_id)
              .filter(Boolean),
          ),
        ) as string[];
        const { data: deptRows } = await service
          .from("departments")
          .select("id, name")
          .in("id", deptIds.length > 0 ? deptIds : ["none"]);
        const deptMap = new Map((deptRows ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

        const questionsWithProgramme = (questionsWithEmail as never as Array<Record<string, unknown>>).map((q) => {
          const course = q.courses as Record<string, unknown> | undefined;
          return {
            ...q,
            courses: course ? { ...course, departments: { name: course.department_id ? deptMap.get(course.department_id as string) || "" : "" } } : null,
          };
        });

        return NextResponse.json({
          questions: questionsWithProgramme,
          total: count ?? 0,
          page,
          pageSize,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        });
      }

      case "students": {
        const { data: raw } = await service
          .from("profiles")
          .select("id, full_name, matric_number, is_locked, current_level, created_at")
          .eq("role", "student")
          .order("created_at", { ascending: false });
        return NextResponse.json({ students: raw ?? [] });
      }

      case "faculties": {
        const { data: list } = await service.from("faculties").select("id, name, slug").order("name");
        return NextResponse.json({ faculties: list ?? [] });
      }

      case "programmes": {
        const { data: list } = await service
          .from("departments")
          .select("id, name, faculty_id, faculties!inner(name)")
          .order("name") as never;
        const programmes = (list as unknown as { id: string; name: string; faculty_id: string; faculties: { name: string } }[] | null) ?? [];
        return NextResponse.json({
          programmes: programmes.map((d) => ({ id: d.id, name: d.name, faculty_id: d.faculty_id, faculty_name: d.faculties?.name || "" })),
        });
      }

      case "list-programmes": {
        const { data: programmeList } = await service
          .from("departments")
          .select("id, name")
          .order("name");
        return NextResponse.json({ programmes: programmeList ?? [] });
      }

      case "list-admins": {
        const { data: adminProfiles } = await service
          .from("profiles")
          .select("id, auth_user_id, full_name, created_at")
          .eq("role", "super_admin")
          .order("created_at");
        const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 });
        const emailMap = new Map<string, string>();
        if (authUsers?.users) {
          for (const u of authUsers.users) {
            if (u.email) emailMap.set(u.id, u.email);
          }
        }
        const admins = (adminProfiles ?? []).map((p) => {
          const profile = p as unknown as { id: string; auth_user_id: string; full_name: string; created_at: string };
          return { id: profile.id, full_name: profile.full_name, email: emailMap.get(profile.auth_user_id) || "Unknown", created_at: profile.created_at };
        });
        return NextResponse.json({ admins });
      }

      case "question-solutions": {
        const questionId = req.nextUrl.searchParams.get("question_id");
        if (!questionId) {
          return NextResponse.json({ error: "question_id required" }, { status: 400 });
        }
        const { data: rawSolutions } = await service
          .from("solutions")
          .select(`
            id, body, file_url, created_at, upvotes, downvotes,
            rating_sum, rating_count,
            submitted_by,
            profiles!inner(full_name, auth_user_id)
          `)
          .eq("question_id", questionId)
          .order("created_at", { ascending: false });

        const solutions = (rawSolutions ?? []) as unknown as Array<{
          id: string; body: string | null; file_url: string | null; created_at: string;
          upvotes: number; downvotes: number; rating_sum: number; rating_count: number;
          submitted_by: string;
          profiles: { full_name: string; auth_user_id: string };
        }>;

        const authUserIds = Array.from(new Set(solutions.map((s) => s.profiles?.auth_user_id).filter(Boolean))) as string[];
        const authorEmailMap = new Map<string, string>();
        if (authUserIds.length > 0) {
          const result = await service.auth.admin.listUsers({ perPage: 1000 });
          if (result.data?.users) {
            for (const u of result.data.users) {
              if (u.id && u.email) authorEmailMap.set(u.id, u.email);
            }
          }
        }

        return NextResponse.json({
          solutions: solutions.map((s) => ({
            id: s.id,
            body: s.body,
            file_url: s.file_url,
            created_at: s.created_at,
            upvotes: s.upvotes,
            downvotes: s.downvotes,
            rating_sum: s.rating_sum,
            rating_count: s.rating_count,
            submitted_by: s.submitted_by,
            author_name: s.profiles?.full_name || "Unknown",
            author_email: authorEmailMap.get(s.profiles?.auth_user_id) || null,
          })),
        });
      }

      case "list-logs": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);
        const level = req.nextUrl.searchParams.get("level") || undefined;
        const event = req.nextUrl.searchParams.get("event") || undefined;
        const userId = req.nextUrl.searchParams.get("userId") || undefined;
        const ip = req.nextUrl.searchParams.get("ip") || undefined;
        const dateFrom = req.nextUrl.searchParams.get("dateFrom") || undefined;
        const dateTo = req.nextUrl.searchParams.get("dateTo") || undefined;
        const search = req.nextUrl.searchParams.get("search") || undefined;

        const { logs, total } = await queryLogs({ page, limit, level, event, userId, ip, dateFrom, dateTo, search });
        return NextResponse.json({ logs, total, page, limit });
      }

      case "log-stats": {
        const stats = await getLogStats();
        const [{ data: dailyQuestions }, { data: dailySolutions }, { data: dailySignups }] = await Promise.all([
          service.from("past_questions").select("created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          service.from("solutions").select("created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          service.from("profiles").select("created_at").eq("role", "student").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

        const makeDayMap = () => {
          const m: Record<string, number> = {};
          for (let i = 29; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            m[d.toISOString().slice(0, 10)] = 0;
          }
          return m;
        };

        const questionsByDay = makeDayMap();
        const solutionsByDay = makeDayMap();
        const signupsByDay = makeDayMap();

        for (const q of (dailyQuestions ?? []) as { created_at: string }[]) {
          const key = q.created_at?.slice(0, 10);
          if (key && key in questionsByDay) questionsByDay[key]++;
        }
        for (const s of (dailySolutions ?? []) as { created_at: string }[]) {
          const key = s.created_at?.slice(0, 10);
          if (key && key in solutionsByDay) solutionsByDay[key]++;
        }
        for (const p of (dailySignups ?? []) as { created_at: string }[]) {
          const key = p.created_at?.slice(0, 10);
          if (key && key in signupsByDay) signupsByDay[key]++;
        }

        return NextResponse.json({
          stats,
          dailyQuestions: Object.entries(questionsByDay).map(([date, count]) => ({ date, count })),
          dailySolutions: Object.entries(solutionsByDay).map(([date, count]) => ({ date, count })),
          dailySignups: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
        });
      }

      default:
        logger.warn({ event: "admin.unknown_action", message: "Unknown admin GET action", ip, metadata: { action } });
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "admin.get_error", message: "Admin GET API error", error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const session = await assertAdmin();
    if (!session) {
      logger.warn({ event: "admin.unauthorized", message: "Unauthorized admin API call", ip, path: req.nextUrl.pathname });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, service } = session;

    let action = req.nextUrl.searchParams.get("action");
    let jsonBody: Record<string, unknown> | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      jsonBody = await req.json();
      if (!action && jsonBody?.action) {
        action = jsonBody.action as string;
      }
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      formData = new FormData();
    }

    switch (action) {
      case "seed-faculty": {
        const name = formData.get("name") as string;
        if (!name) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        const { error } = await service.from("faculties").insert({ name, slug } as never);
        if (error) throw error;
        logger.info({ event: "admin.seed_faculty", message: "Faculty seeded", userId: user.id, metadata: { name } });
        return NextResponse.json({ success: true });
      }

      case "seed-programme": {
        const name = formData.get("name") as string;
        const faculty_id = formData.get("faculty_id") as string;
        if (!name || !faculty_id) {
          return NextResponse.json(
            { error: "Name and faculty_id required" },
            { status: 400 },
          );
        }
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        const { error } = await service
          .from("departments")
          .insert({ name, slug, faculty_id } as never);
        if (error) throw error;
        logger.info({ event: "admin.seed_programme", message: "Programme seeded", userId: user.id, metadata: { name, faculty_id } });
        return NextResponse.json({ success: true });
      }

      case "seed-course": {
        const code = formData.get("code") as string;
        const title = formData.get("title") as string;
        const department_id = formData.get("department_id") as string;
        const level = parseInt(formData.get("level") as string);
        const scope = (formData.get("scope") as string) || "departmental";
        const link_dept_ids = formData.getAll("link_dept_ids") as string[];
        if (!code || !title || !level) {
          return NextResponse.json(
            { error: "All course fields required" },
            { status: 400 },
          );
        }
        const insertData: Record<string, unknown> = { code, title, level, scope };
        if (department_id) insertData.department_id = department_id;
        const { data: newCourse, error } = await service
          .from("courses")
          .insert(insertData as never)
          .select("id")
          .single();
        if (error) throw error;
        const courseId = (newCourse as unknown as { id: string } | null)?.id;
        if (scope === "shared" && link_dept_ids.length > 0 && courseId) {
          const links = link_dept_ids.map((did: string) => ({
            department_id: did,
            course_id: courseId,
          }));
          await service.from("department_courses").insert(links as never);
        }
        logger.info({ event: "admin.seed_course", message: "Course seeded", userId: user.id, metadata: { code, title } });
        return NextResponse.json({ success: true });
      }

      case "restore-question": {
        const id = formData.get("id") as string;
        if (!id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { error } = await service
          .from("past_questions")
          .update({ status: "published" } as never)
          .eq("id", id);
        if (error) throw error;
        logger.info({ event: "admin.restore_question", message: "Question restored", userId: user.id, metadata: { questionId: id } });
        return NextResponse.json({ success: true });
      }

      case "suspend-question": {
        const id = formData.get("id") as string;
        if (!id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { error } = await service
          .from("past_questions")
          .update({ status: "suspended" } as never)
          .eq("id", id);
        if (error) throw error;
        logger.info({ event: "admin.suspend_question", message: "Question suspended", userId: user.id, metadata: { questionId: id } });
        return NextResponse.json({ success: true });
      }

      case "delete-question": {
        const id = formData.get("id") as string;
        if (!id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { data: rawQuestionForDelete } = await service
          .from("past_questions")
          .select("file_url")
          .eq("id", id)
          .single();
        const questionForDelete = rawQuestionForDelete as unknown as { file_url: string } | null;
        if (questionForDelete?.file_url) {
          await service.storage.from("approved").remove([questionForDelete.file_url]);
        }
        const { error } = await service
          .from("past_questions")
          .delete()
          .eq("id", id);
        if (error) throw error;
        logger.info({ event: "admin.delete_question", message: "Question deleted", userId: user.id, metadata: { questionId: id } });
        return NextResponse.json({ success: true });
      }

      case "lock-student": {
        const id = formData.get("id") as string;
        if (!id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { error } = await service
          .from("profiles")
          .update({ is_locked: true } as never)
          .eq("id", id);
        if (error) throw error;
        logger.info({ event: "admin.lock_student", message: "Student locked", userId: user.id, metadata: { studentId: id } });
        return NextResponse.json({ success: true });
      }

      case "unlock-student": {
        const id = formData.get("id") as string;
        if (!id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { error } = await service
          .from("profiles")
          .update({ is_locked: false } as never)
          .eq("id", id);
        if (error) throw error;
        logger.info({ event: "admin.unlock_student", message: "Student unlocked", userId: user.id, metadata: { studentId: id } });
        return NextResponse.json({ success: true });
      }

      case "update-settings": {
        const upload_obligation_days = parseInt(
          formData.get("upload_obligation_days") as string,
        );
        const lockout_enabled = formData.get("lockout_enabled") === "on";
        if (!upload_obligation_days) {
          return NextResponse.json(
            { error: "Invalid settings" },
            { status: 400 },
          );
        }
        const { data: settingsRow } = await service
          .from("platform_settings")
          .select("id")
          .single();
        const settingsId = ((settingsRow as unknown as { id: string } | null)?.id) ?? "";
        const { error } = await service
          .from("platform_settings")
          .update({ upload_obligation_days, lockout_enabled } as never)
          .eq("id", settingsId);
        if (error) throw error;
        logger.info({ event: "admin.update_settings", message: "Settings updated", userId: user.id, metadata: { upload_obligation_days, lockout_enabled } });
        return NextResponse.json({ success: true });
      }

      case "list-programmes": {
        const { data: programmeList } = await service
          .from("departments")
          .select("id, name")
          .order("name");
        return NextResponse.json({ programmes: programmeList ?? [] });
      }

      case "invite-admin": {
        const inviteEmail = formData.get("email") as string;
        const inviteName = formData.get("fullName") as string;
        if (!inviteEmail || !inviteName) {
          return NextResponse.json({ error: "Email and full name required" }, { status: 400 });
        }

        const tempPassword = crypto.randomUUID() + "Aa1!";
        const { data: createdUser, error: createErr } = await service.auth.admin.createUser({
          email: inviteEmail,
          password: tempPassword,
          email_confirm: true,
        });

        if (createErr || !createdUser?.user) {
          logger.error({ event: "admin.invite.create_failed", message: "Failed to create user", userId: user.id, metadata: { email: inviteEmail, error: createErr?.message } });
          return NextResponse.json({ error: createErr?.message || "Failed to create account" }, { status: 500 });
        }

        const { data: programmeRow } = await service.from("departments").select("id").limit(1).maybeSingle();
        const programmeId = programmeRow ? (programmeRow as unknown as { id: string }).id : null;

        await service.from("profiles").insert({
          auth_user_id: createdUser.user.id,
          full_name: inviteName,
          matric_number: `ADMIN${String(Math.floor(Math.random() * 9000) + 1000)}`,
          department_id: programmeId || "",
          current_level: 100,
          role: "super_admin",
        } as never);

        const { data: linkData } = await service.auth.admin.generateLink({
          type: "recovery",
          email: inviteEmail,
          options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.VERCEL_URL || req.nextUrl.origin}/admin/${req.nextUrl.pathname.split("/")[2]}/login` },
        });

        const recoveryLink = linkData?.properties?.action_link || null;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EQB <noreply@devalyze.space>",
            to: inviteEmail,
            subject: "You've been invited as an admin on EQB",
            html: `<h2>Admin Invitation</h2>
<p>You've been invited as an administrator on <strong>EQB</strong>.</p>
${recoveryLink ? `<p>Click the link below to set up your password:</p>
<p style="text-align:center;padding:16px"><a href="${recoveryLink}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Set up your password</a></p>
<p style="color:#666;font-size:13px">This link expires in 24 hours.</p>` : `<p>Your temporary password is: <code style="font-size:16px;background:#f3f4f6;padding:4px 8px;border-radius:4px">${tempPassword}</code></p>
<p>After logging in, please change your password immediately.</p>`}
<p style="color:#666;font-size:13px">Once you've set your password, log in at the admin portal to get started.</p>`,
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          logger.error({ event: "admin.invite.email_failed", message: "Failed to send invitation email", userId: user.id, metadata: { email: inviteEmail, error: errBody } });
        }

        logger.info({ event: "admin.invite.sent", message: "Admin invitation sent", userId: user.id, metadata: { email: inviteEmail, name: inviteName } });
        return NextResponse.json({ success: true });
      }

      case "create-course": {
        let body: { code?: string; title?: string; programme_id?: string; level?: number };
        try {
          body = await req.json();
        } catch {
          return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { code, title, programme_id, level } = body;
        if (!code || !title || !programme_id || !level) {
          return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }
        const { data: existing } = await service
          .from("courses")
          .select("id")
          .ilike("code", code)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({ error: "Course code already exists" }, { status: 409 });
        }
        const { data: newCourse, error } = await service
          .from("courses")
          .insert({
            code: code.toUpperCase(),
            title,
            level,
            department_id: programme_id,
            scope: "departmental",
          } as never)
          .select("id, code, title, level")
          .single();
        if (error) throw error;
        logger.info({ event: "admin.create_course", message: "Course created", userId: user.id, metadata: { code, title } });
        return NextResponse.json({ course: newCourse });
      }

      case "admin-upload": {
        const course_id = formData.get("course_id") as string;
        const year = parseInt(formData.get("year") as string);
        const semester = formData.get("semester") as string;
        const exam_type = formData.get("exam_type") as string;
        const level = parseInt(formData.get("level") as string);
        const file_url = formData.get("file_url") as string;
        const file_type = formData.get("file_type") as string;
        if (!course_id || !year || !semester || !file_url || !file_type) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const { data: rawProfile } = await service
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
        const profileId = (rawProfile as unknown as { id: string } | null)?.id;
        if (!profileId) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        const { error: insertErr } = await service.from("past_questions").insert({
          course_id,
          uploaded_by: profileId,
          level,
          file_url,
          file_type,
          year,
          semester,
          exam_type: exam_type || "examination",
          status: "published",
        } as never);
        if (insertErr) {
          logger.error({ event: "admin.upload_insert_failed", message: "Failed to insert question", userId: user.id, metadata: { error: insertErr.message } });
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
        logger.info({ event: "admin.upload", message: "Admin uploaded question", userId: user.id, metadata: { course_id, file_url } });
        return NextResponse.json({ success: true });
      }

      case "bulk-import-faculties": {
        const faculties = (jsonBody?.faculties as string[]) || [];
        const results = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
        for (let i = 0; i < faculties.length; i++) {
          const name = faculties[i]?.trim();
          if (!name) {
            results.errors.push({ row: i + 1, message: "Empty faculty name" });
            continue;
          }
          const { data: existing } = await service
            .from("faculties")
            .select("id")
            .ilike("name", name)
            .maybeSingle();
          if (existing) {
            results.skipped++;
            continue;
          }
          const slug = name.toLowerCase().replace(/\s+/g, "-");
          const { error: insertErr } = await service.from("faculties").insert({ name, slug } as never);
          if (insertErr) {
            results.errors.push({ row: i + 1, message: insertErr.message });
          } else {
            results.created++;
          }
        }
        logger.info({ event: "admin.bulk_import_faculties", message: "Bulk import faculties completed", userId: user.id, metadata: results });
        return NextResponse.json({ success: true, results });
      }

      case "bulk-import-programmes": {
        const programmes = (jsonBody?.programmes as Array<{ faculty: string; programme: string }>) || [];
        const results2 = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
        for (let i = 0; i < programmes.length; i++) {
          const row = programmes[i];
          const facultyName = row?.faculty?.trim();
          const programmeName = row?.programme?.trim();
          if (!facultyName || !programmeName) {
            results2.errors.push({ row: i + 1, message: "Missing faculty or programme name" });
            continue;
          }
          const { data: facultyRow } = await service
            .from("faculties")
            .select("id")
            .ilike("name", facultyName)
            .maybeSingle();
          if (!facultyRow) {
            results2.errors.push({ row: i + 1, message: `Faculty "${facultyName}" not found` });
            continue;
          }
          const facultyId = (facultyRow as unknown as { id: string }).id;
          const { data: existingProgramme } = await service
            .from("departments")
            .select("id")
            .ilike("name", programmeName)
            .eq("faculty_id", facultyId)
            .maybeSingle();
          if (existingProgramme) {
            results2.skipped++;
            continue;
          }
          const slug = programmeName.toLowerCase().replace(/\s+/g, "-");
          const { error: insertErr } = await service
            .from("departments")
            .insert({ name: programmeName, slug, faculty_id: facultyId } as never);
          if (insertErr) {
            results2.errors.push({ row: i + 1, message: insertErr.message });
          } else {
            results2.created++;
          }
        }
        logger.info({ event: "admin.bulk_import_programmes", message: "Bulk import programmes completed", userId: user.id, metadata: results2 });
        return NextResponse.json({ success: true, results: results2 });
      }

      case "update-faculty": {
        const faculty_id = formData.get("id") as string;
        const name = formData.get("name") as string;
        if (!faculty_id || !name) {
          return NextResponse.json({ error: "ID and name required" }, { status: 400 });
        }
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        const { error } = await service.from("faculties").update({ name, slug } as never).eq("id", faculty_id);
        if (error) throw error;
        logger.info({ event: "admin.update_faculty", message: "Faculty updated", userId: user.id, metadata: { faculty_id, name } });
        return NextResponse.json({ success: true });
      }

      case "update-programme": {
        const programme_id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const faculty_id = formData.get("faculty_id") as string;
        if (!programme_id || !name) {
          return NextResponse.json({ error: "ID and name required" }, { status: 400 });
        }
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        const updateData: Record<string, string> = { name, slug };
        if (faculty_id) updateData.faculty_id = faculty_id;
        const { error } = await service.from("departments").update(updateData as never).eq("id", programme_id);
        if (error) throw error;
        logger.info({ event: "admin.update_programme", message: "Programme updated", userId: user.id, metadata: { programme_id, name } });
        return NextResponse.json({ success: true });
      }

      case "update-course": {
        const course_id = formData.get("id") as string;
        const code = formData.get("code") as string;
        const title = formData.get("title") as string;
        const level = parseInt(formData.get("level") as string);
        if (!course_id || !code || !title || !level) {
          return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }
        const { error } = await service.from("courses").update({
          code: code.toUpperCase(),
          title,
          level,
        } as never).eq("id", course_id);
        if (error) throw error;
        logger.info({ event: "admin.update_course", message: "Course updated", userId: user.id, metadata: { course_id, code, title } });
        return NextResponse.json({ success: true });
      }

      case "delete-faculty": {
        const faculty_id = formData.get("id") as string;
        if (!faculty_id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        await service.from("departments").delete().eq("faculty_id", faculty_id);
        const { error } = await service.from("faculties").delete().eq("id", faculty_id);
        if (error) throw error;
        logger.info({ event: "admin.delete_faculty", message: "Faculty deleted", userId: user.id, metadata: { faculty_id } });
        return NextResponse.json({ success: true });
      }

      case "delete-programme": {
        const programme_id = formData.get("id") as string;
        if (!programme_id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const { data: rawAdminProfile } = await service
          .from("profiles")
          .select("department_id, role")
          .eq("auth_user_id", user.id)
          .single();
        const adminProfile = rawAdminProfile as unknown as { department_id: string; role: string } | null;
        if (adminProfile?.department_id === programme_id) {
          return NextResponse.json(
            { error: "Cannot delete the programme your account is attached to" },
            { status: 409 },
          );
        }

        const { error } = await service.from("departments").delete().eq("id", programme_id);
        if (error) throw error;
        logger.info({ event: "admin.delete_programme", message: "Programme deleted", userId: user.id, metadata: { programme_id } });
        return NextResponse.json({ success: true });
      }

      case "delete-course": {
        const course_id = formData.get("id") as string;
        if (!course_id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { error } = await service.from("courses").delete().eq("id", course_id);
        if (error) throw error;
        logger.info({ event: "admin.delete_course", message: "Course deleted", userId: user.id, metadata: { course_id } });
        return NextResponse.json({ success: true });
      }

      case "delete-solution": {
        const solution_id = formData.get("id") as string;
        if (!solution_id) {
          return NextResponse.json({ error: "ID required" }, { status: 400 });
        }
        const { data: rawSolution } = await service
          .from("solutions")
          .select("file_url")
          .eq("id", solution_id)
          .single();
        const solution = rawSolution as unknown as { file_url: string | null } | null;
        if (solution?.file_url) {
          await service.storage.from("solutions").remove([solution.file_url]);
        }
        const { error } = await service.from("solutions").delete().eq("id", solution_id);
        if (error) throw error;
        logger.info({ event: "admin.delete_solution", message: "Solution deleted", userId: user.id, metadata: { solution_id } });
        return NextResponse.json({ success: true });
      }

      default:
        logger.warn({ event: "admin.unknown_action", message: "Unknown admin action", userId: user.id, metadata: { action } });
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "admin.error", message: "Admin API error", error: msg, durationMs: Date.now() - start });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
