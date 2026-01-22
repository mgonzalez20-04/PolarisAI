import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check cache first
    const cacheKey = `folders:${session.user.id}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return NextResponse.json({ folders: cached });
    }

    // Get folders from database - return all folders
    const folders = await prisma.folder.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        folderPath: "asc",
      },
    });

    // Cache for 5 minutes (folders don't change often)
    cache.set(cacheKey, folders, 5 * 60 * 1000);

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Microsoft Graph sync is temporarily disabled
  return NextResponse.json(
    { error: "Folder sync with Microsoft Graph is not available. Working with local folders only." },
    { status: 503 }
  );
}
