import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { targetFolderId } = await req.json();

  if (!targetFolderId) {
    return NextResponse.json({ error: "Target folder ID is required" }, { status: 400 });
  }

  try {
    // Get the email from database
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Get target folder info
    const targetFolder = await prisma.folder.findFirst({
      where: {
        folderId: targetFolderId,
        userId: session.user.id,
      },
    });

    if (!targetFolder) {
      return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
    }

    // Microsoft Graph move is temporarily disabled
    // Email will only be moved in local database
    console.log("Moving email in local database only (Outlook sync disabled)");

    // Update email in local database
    await prisma.email.update({
      where: { id },
      data: {
        folderId: targetFolder.id,
        folderPath: targetFolder.folderPath,
      },
    });

    return NextResponse.json({
      success: true,
      folderName: targetFolder.displayName,
    });
  } catch (error) {
    console.error("Error moving email:", error);
    return NextResponse.json({ error: "Failed to move email" }, { status: 500 });
  }
}
