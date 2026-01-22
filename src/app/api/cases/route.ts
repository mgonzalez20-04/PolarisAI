import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    let where: any = { userId: session.user.id };

    if (status && status !== "all") {
      where.status = status;
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        email: {
          select: {
            subject: true,
            from: true,
            receivedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const case_ = await prisma.case.create({
      data: {
        ...body,
        userId: session.user.id,
        tags: body.tags ? JSON.stringify(body.tags) : null,
      },
      include: {
        email: true,
      },
    });

    // Update email hasCase flag
    await prisma.email.update({
      where: { id: body.emailId },
      data: { hasCase: true },
    });

    return NextResponse.json(case_);
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
