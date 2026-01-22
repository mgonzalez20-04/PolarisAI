import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET user preferences
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try to fetch user preferences with groupThreads field
    let groupThreads = false;

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          groupThreads: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      groupThreads = user.groupThreads;
    } catch (fieldError: any) {
      // If groupThreads field doesn't exist yet, default to false
      console.warn("groupThreads field not found in database, defaulting to false:", fieldError.message);
      groupThreads = false;
    }

    return NextResponse.json({ preferences: { groupThreads } });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PATCH user preferences
export async function PATCH(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { groupThreads } = body;

    let updatedPreferences = { groupThreads: false };

    try {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(typeof groupThreads === "boolean" && { groupThreads }),
        },
        select: {
          groupThreads: true,
        },
      });

      updatedPreferences = updatedUser;
    } catch (updateError: any) {
      console.error("Error updating groupThreads field:", updateError.message);
      // If field doesn't exist, just return the default value
      updatedPreferences = { groupThreads: false };
    }

    return NextResponse.json({ preferences: updatedPreferences });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
