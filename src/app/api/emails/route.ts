import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("search") || "";
  const folderId = searchParams.get("folderId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50"); // Increased default
  const cursor = searchParams.get("cursor"); // For cursor-based pagination

  try {
    // Get user preferences
    let groupThreads = false;
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { groupThreads: true },
      });
      groupThreads = user?.groupThreads || false;
    } catch (error) {
      // If groupThreads field doesn't exist yet, default to false
      console.warn("groupThreads field not found, defaulting to false");
      groupThreads = false;
    }

    let where: any = { userId: session.user.id };

    if (filter === "unread") {
      where.isRead = false;
    } else if (filter === "withCase") {
      // Filter for emails that are not in "New" status (i.e., being worked on)
      where.status = { not: "New" };
    }

    // Filter by folder if specified
    if (folderId) {
      // Get the folder DB ID from the Microsoft Graph folder ID
      const folder = await prisma.folder.findFirst({
        where: {
          userId: session.user.id,
          folderId: folderId,
        },
      });
      if (folder) {
        where.folderId = folder.id;
      }
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { from: { contains: search } },
        { fromEmail: { contains: search } },
        { bodyPreview: { contains: search } },
        { bodyText: { contains: search } },
      ];
    }

    if (groupThreads) {
      // Get all emails matching the filter
      const allEmails = await prisma.email.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Group emails by conversationId
      const threadMap = new Map<string, any[]>();
      const noThreadEmails: any[] = [];

      for (const email of allEmails) {
        if (email.conversationId) {
          if (!threadMap.has(email.conversationId)) {
            threadMap.set(email.conversationId, []);
          }
          threadMap.get(email.conversationId)!.push(email);
        } else {
          noThreadEmails.push(email);
        }
      }

      // Convert threads to array of thread objects
      const threads = Array.from(threadMap.entries()).map(([conversationId, emails]) => {
        const sortedEmails = emails.sort((a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );
        return {
          ...sortedEmails[0], // Most recent email
          threadCount: emails.length,
          threadEmails: sortedEmails,
          isThread: true,
        };
      });

      // Add emails without conversationId
      const allItems = [
        ...threads,
        ...noThreadEmails.map(email => ({ ...email, threadCount: 1, isThread: false }))
      ].sort((a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );

      // Paginate
      const total = allItems.length;
      const paginatedItems = allItems.slice((page - 1) * pageSize, page * pageSize);

      return NextResponse.json({
        emails: paginatedItems,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        groupThreads: true,
      });
    } else {
      // OPTIMIZED: Cursor-based pagination when cursor is provided
      const useCursor = !!cursor;

      const queryOptions: any = {
        where,
        orderBy: { receivedAt: "desc" },
        take: pageSize,
        // OPTIMIZATION: Select only necessary fields, not full bodyText/bodyHtml
        select: {
          id: true,
          messageId: true,
          subject: true,
          from: true,
          fromEmail: true,
          receivedAt: true,
          bodyPreview: true, // Only preview, not full body
          isRead: true,
          status: true,
          priority: true,
          hasAttachments: true,
          conversationId: true,
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } }
            }
          }
        },
      };

      // Add cursor if provided
      if (useCursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1; // Skip the cursor itself
      } else {
        // Offset-based fallback
        queryOptions.skip = (page - 1) * pageSize;
      }

      // Get emails
      const emails = await prisma.email.findMany(queryOptions);

      // Determine if there are more emails
      const hasMore = emails.length === pageSize;
      const nextCursor = hasMore ? emails[emails.length - 1].id : null;

      // Get total count only for offset pagination (not needed for cursor)
      let total = 0;
      if (!useCursor) {
        total = await prisma.email.count({ where });
      }

      return NextResponse.json({
        emails: emails.map(email => ({ ...email, threadCount: 1, isThread: false })),
        pagination: useCursor ? undefined : {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        // Cursor pagination data
        nextCursor,
        hasMore,
        groupThreads: false,
      });
    }
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
