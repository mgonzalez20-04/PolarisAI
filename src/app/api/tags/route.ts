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
    const cacheKey = `tags:${session.user.id}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // If not in cache, fetch from database
    const tags = await prisma.tag.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Cache for 5 minutes (tags don't change often)
    cache.set(cacheKey, tags, 5 * 60 * 1000);

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: "Name and color are required" },
        { status: 400 }
      );
    }

    // Check if tag with same name already exists for this user
    const existing = await prisma.tag.findFirst({
      where: {
        userId: session.user.id,
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        userId: session.user.id,
        name,
        color,
      },
    });

    // Invalidate cache after creating a tag
    cache.invalidate(`tags:${session.user.id}`);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}
