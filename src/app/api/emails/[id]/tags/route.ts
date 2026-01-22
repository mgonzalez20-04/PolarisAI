import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Add tag to email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: emailId } = await params;

  try {
    const body = await req.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: "tagId is required" }, { status: 400 });
    }

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

    // Verify tag belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: session.user.id,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if already tagged
    const existing = await prisma.emailTag.findUnique({
      where: {
        emailId_tagId: {
          emailId,
          tagId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already has this tag" },
        { status: 409 }
      );
    }

    // Create relationship
    await prisma.emailTag.create({
      data: {
        emailId,
        tagId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding tag to email:", error);
    return NextResponse.json(
      { error: "Failed to add tag to email" },
      { status: 500 }
    );
  }
}

// Get all tags for an email
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: emailId } = await params;

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

    // Get all tags for this email
    const emailTags = await prisma.emailTag.findMany({
      where: {
        emailId,
      },
      include: {
        tag: true,
      },
    });

    const tags = emailTags.map((et) => et.tag);

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching email tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch email tags" },
      { status: 500 }
    );
  }
}
