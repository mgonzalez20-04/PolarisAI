import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const case_ = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        email: true,
      },
    });

    if (!case_) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(case_);
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const updates: any = { ...body };

    if (body.tags) {
      updates.tags = JSON.stringify(body.tags);
    }

    if (body.status === "resolved" && !body.resolvedAt) {
      updates.resolvedAt = new Date();
    }

    const case_ = await prisma.case.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.case.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting case:", error);
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }
}
