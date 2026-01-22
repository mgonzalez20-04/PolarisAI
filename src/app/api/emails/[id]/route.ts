import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCaseFromResolvedEmail } from "@/lib/agent/learning/auto-case-creator";

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
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error) {
    console.error("Error fetching email:", error);
    return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
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
    // Actualizar el email
    const email = await prisma.email.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: body,
    });

    // Si el email se marcó como Resolved o Closed, intentar crear caso automáticamente
    if (body.status === 'Resolved' || body.status === 'Closed') {
      try {
        const result = await createCaseFromResolvedEmail(id, session.user.id);
        if (result.created) {
          console.log(`Auto-created case ${result.caseId} for email ${id}`);

          // Marcar el email como que tiene caso
          await prisma.email.update({
            where: { id },
            data: { hasCase: true },
          });

          return NextResponse.json({
            success: true,
            autoCaseCreated: true,
            caseId: result.caseId,
          });
        } else {
          console.log(`Case not auto-created for email ${id}: ${result.reason}`);
        }
      } catch (caseError) {
        // No fallar la actualización del email si falla la creación del caso
        console.error('Error creating auto case (non-critical):', caseError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating email:", error);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
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
    // Verify email belongs to user before deleting
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Microsoft Graph deletion is temporarily disabled
    // Email will only be deleted from local database
    console.log("Deleting email from local database only (Outlook sync disabled)");

    // Delete email from local database (tags will be deleted automatically via cascade)
    await prisma.email.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting email:", error);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
