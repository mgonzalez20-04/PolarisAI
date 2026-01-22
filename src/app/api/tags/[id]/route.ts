import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, color } = body;

    // Verify tag belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // If updating name, check for duplicates
    if (name && name !== tag.name) {
      const existing = await prisma.tag.findFirst({
        where: {
          userId: session.user.id,
          name,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Tag with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
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
    // Verify tag belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete tag (EmailTag relations will be deleted automatically via cascade)
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
