import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Remove tag from email
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: emailId, tagId } = await params;

  try {
    // Verify email belongs to user
    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        userId: session.user.id,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Delete relationship
    const deleted = await prisma.emailTag.deleteMany({
      where: {
        emailId,
        tagId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Tag not found on this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing tag from email:", error);
    return NextResponse.json(
      { error: "Failed to remove tag from email" },
      { status: 500 }
    );
  }
}
