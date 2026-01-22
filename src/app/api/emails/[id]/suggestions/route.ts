import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { suggestionService } from "@/lib/suggestions/suggestion-service";

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
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const suggestions = await suggestionService.getSuggestions(
      email.subject,
      email.bodyText || email.bodyPreview || "",
      session.user.id
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
