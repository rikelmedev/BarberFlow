// server/src/routers/appointments.ts
import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, profileProcedure } from "../trpc.js"; 
import { appointments, profiles, services, professionals } from "../db/schema.js"; 
import { format } from "date-fns";

// ============================================================
// SUBSCRIPTION LIMIT CHECK (Application-level guard)
// DB trigger is the primary guard; this provides early feedback
// ============================================================
async function assertAppointmentLimit(db: any, profileId: string) {
  const [profile] = await db
    .select({
      subscriptionTier: profiles.subscriptionTier,
      monthlyAppointmentsUsed: profiles.monthlyAppointmentsUsed,
      monthlyAppointmentsLimit: profiles.monthlyAppointmentsLimit,
      currentMonthYear: profiles.currentMonthYear,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
  }

  const currentMonthYear = format(new Date(), "yyyy-MM");

  // If month changed, the DB trigger will reset — allow it
  if (profile.currentMonthYear !== currentMonthYear) {
    return; // DB trigger handles reset
  }

  if (
    profile.subscriptionTier !== "pro" &&
    profile.monthlyAppointmentsUsed >= profile.monthlyAppointmentsLimit
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Monthly appointment limit reached (${profile.monthlyAppointmentsLimit} for ${profile.subscriptionTier} plan). Upgrade to Pro for unlimited appointments.`,
    });
  }
}

export const appointmentsRouter = router({
  // Public: book an appointment (no login required)
  book: publicProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        professionalId: z.string().uuid(),
        serviceId: z.string().uuid(),
        clientName: z.string().min(2).max(100),
        clientPhone: z.string().min(8).max(20),
        clientEmail: z.string().email().optional(),
        scheduledAt: z.string().datetime(), // ISO string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Check appointment limit (application-level; DB trigger is the final guard)
      await assertAppointmentLimit(ctx.db, input.profileId);

      // 2. Get service duration to calculate endsAt
      const [service] = await ctx.db
        .select({ durationMin: services.durationMin })
        .from(services)
        .where(
          and(
            eq(services.id, input.serviceId),
            eq(services.profileId, input.profileId),
            eq(services.isActive, true)
          )
        )
        .limit(1);

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      // 3. Validate professional belongs to profile
      const [professional] = await ctx.db
        .select({ id: professionals.id })
        .from(professionals)
        .where(
          and(
            eq(professionals.id, input.professionalId),
            eq(professionals.profileId, input.profileId),
            eq(professionals.isActive, true)
          )
        )
        .limit(1);

      if (!professional) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Professional not found",
        });
      }

      const scheduledAt = new Date(input.scheduledAt);
      const endsAt = new Date(
        scheduledAt.getTime() + service.durationMin * 60 * 1000
      );

      // 4. Check for conflicts (professional already booked at that time)
      const conflictingAppointment = await ctx.db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.professionalId, input.professionalId),
            lte(appointments.scheduledAt, endsAt),
            gte(appointments.endsAt, scheduledAt)
          )
        )
        .limit(1);

      if (conflictingAppointment.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This time slot is already booked for the selected professional. Please choose another time.",
        });
      }

      // 5. Create appointment (DB trigger will increment counter & validate limit)
      try {
        const [appointment] = await ctx.db
          .insert(appointments)
          .values({
            profileId: input.profileId,
            professionalId: input.professionalId,
            serviceId: input.serviceId,
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            clientEmail: input.clientEmail,
            scheduledAt,
            endsAt,
            notes: input.notes,
          })
          .returning();

        return appointment;
      } catch (error: any) {
        // Handle DB trigger exception for limit exceeded
        if (error?.message?.includes("APPOINTMENT_LIMIT_EXCEEDED")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Monthly appointment limit reached. Upgrade to Pro for unlimited appointments.",
          });
        }
        throw error;
      }
    }),

  // Protected: list appointments for my profile
  list: profileProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "confirmed", "completed", "canceled"])
          .optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(appointments.profileId, ctx.profileId!)];

      if (input.status) {
        conditions.push(eq(appointments.status, input.status));
      }
      if (input.from) {
        conditions.push(gte(appointments.scheduledAt, new Date(input.from)));
      }
      if (input.to) {
        conditions.push(lte(appointments.scheduledAt, new Date(input.to)));
      }

      return ctx.db
        .select({
          id: appointments.id,
          clientName: appointments.clientName,
          clientPhone: appointments.clientPhone,
          clientEmail: appointments.clientEmail,
          scheduledAt: appointments.scheduledAt,
          endsAt: appointments.endsAt,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          professional: {
            id: professionals.id,
            name: professionals.name,
          },
          service: {
            id: services.id,
            name: services.name,
            price: services.price,
            durationMin: services.durationMin,
          },
        })
        .from(appointments)
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(and(...conditions))
        .orderBy(desc(appointments.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Protected: get dashboard stats
  getDashboardStats: profileProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [profile] = await ctx.db
      .select({
        monthlyAppointmentsUsed: profiles.monthlyAppointmentsUsed,
        monthlyAppointmentsLimit: profiles.monthlyAppointmentsLimit,
        subscriptionTier: profiles.subscriptionTier,
      })
      .from(profiles)
      .where(eq(profiles.id, ctx.profileId!))
      .limit(1);

    // Get appointments this month for revenue calculation
    const monthlyAppointments = await ctx.db
      .select({
        status: appointments.status,
        price: services.price,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.profileId, ctx.profileId!),
          gte(appointments.scheduledAt, startOfMonth),
          lte(appointments.scheduledAt, endOfMonth)
        )
      );

    const completedThisMonth = monthlyAppointments.filter(
      (a) => a.status === "completed"
    );
    const pendingThisMonth = monthlyAppointments.filter(
      (a) => a.status === "pending" || a.status === "confirmed"
    );
    const revenueThisMonth = completedThisMonth.reduce(
      (sum, a) => sum + parseFloat(a.price ?? "0"),
      0
    );

    // Upcoming appointments (next 7 days)
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCount = await ctx.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.profileId, ctx.profileId!),
          gte(appointments.scheduledAt, now),
          lte(appointments.scheduledAt, next7Days),
          eq(appointments.status, "pending")
        )
      );

    return {
      profile,
      stats: {
        appointmentsThisMonth: monthlyAppointments.length,
        completedThisMonth: completedThisMonth.length,
        pendingThisMonth: pendingThisMonth.length,
        revenueThisMonth: revenueThisMonth.toFixed(2),
        upcomingNext7Days: upcomingCount.length,
        monthlyUsed: profile?.monthlyAppointmentsUsed ?? 0,
        monthlyLimit: profile?.monthlyAppointmentsLimit ?? 30,
        isPro: profile?.subscriptionTier === "pro",
      },
    };
  }),

  // Protected: update appointment status
  updateStatus: profileProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["confirmed", "completed", "canceled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(appointments)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(appointments.id, input.id),
            eq(appointments.profileId, ctx.profileId!)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),

  // Public: get available time slots for a professional on a given date
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        professionalId: z.string().uuid(),
        serviceId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      const [service] = await ctx.db
        .select({ durationMin: services.durationMin })
        .from(services)
        .where(eq(services.id, input.serviceId))
        .limit(1);

      if (!service) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const dateStart = new Date(`${input.date}T00:00:00`);
      const dateEnd = new Date(`${input.date}T23:59:59`);

      // Get existing appointments for this professional on this date
      const existingAppointments = await ctx.db
        .select({
          scheduledAt: appointments.scheduledAt,
          endsAt: appointments.endsAt,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.professionalId, input.professionalId),
            gte(appointments.scheduledAt, dateStart),
            lte(appointments.scheduledAt, dateEnd),
            // Exclude canceled appointments
            eq(appointments.status, "pending")
          )
        );

      // Generate slots from 08:00 to 19:00 in durationMin intervals
      const slots: { time: string; available: boolean }[] = [];
      const workdayStart = 8 * 60; // 8:00 AM in minutes
      const workdayEnd = 19 * 60; // 7:00 PM in minutes
      const duration = service.durationMin;

      for (let min = workdayStart; min + duration <= workdayEnd; min += 30) {
        const slotStart = new Date(dateStart);
        slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        // Check if slot conflicts with any existing appointment
        const isConflict = existingAppointments.some((appt) => {
          const apptStart = new Date(appt.scheduledAt);
          const apptEnd = new Date(appt.endsAt);
          return slotStart < apptEnd && slotEnd > apptStart;
        });

        const isPast = slotStart < new Date();

        slots.push({
          time: `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`,
          available: !isConflict && !isPast,
        });
      }

      return slots;
    }),
});
