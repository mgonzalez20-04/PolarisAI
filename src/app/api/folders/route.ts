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

  // Verificar que tenemos access token
  if (!session.accessToken) {
    return NextResponse.json(
      { error: "No access token available. Please sign in again with Microsoft." },
      { status: 401 }
    );
  }

  try {
    // Obtener información del usuario actual
    const userEmail = session.user.email;
    console.log(`Fetching folders from Microsoft Graph for ${userEmail}...`);

    // Si es soporte@iodigital.es, usa /me, sino usa /users/{email}
    const endpoint = userEmail === "soporte@iodigital.es"
      ? "https://graph.microsoft.com/v1.0/me/mailFolders"
      : `https://graph.microsoft.com/v1.0/users/soporte@iodigital.es/mailFolders`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Microsoft Graph error:", errorText);
      return NextResponse.json(
        { error: `Failed to fetch folders. Error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const graphFolders = data.value || [];

    console.log(`Found ${graphFolders.length} folders from Microsoft Graph`);

    // Sincronizar carpetas con la base de datos
    for (const graphFolder of graphFolders) {
      await prisma.folder.upsert({
        where: {
          userId_folderId: {
            userId: session.user.id,
            folderId: graphFolder.id,
          },
        },
        update: {
          displayName: graphFolder.displayName,
          parentFolderId: graphFolder.parentFolderId,
          folderPath: graphFolder.displayName, // Simplificado por ahora
          totalCount: graphFolder.totalItemCount || 0,
          unreadCount: graphFolder.unreadItemCount || 0,
        },
        create: {
          userId: session.user.id,
          folderId: graphFolder.id,
          displayName: graphFolder.displayName,
          parentFolderId: graphFolder.parentFolderId,
          folderPath: graphFolder.displayName,
          totalCount: graphFolder.totalItemCount || 0,
          unreadCount: graphFolder.unreadItemCount || 0,
          isVisible: true,
        },
      });
    }

    // Limpiar caché
    const cacheKey = `folders:${session.user.id}`;
    cache.set(cacheKey, null, 0);

    // Obtener carpetas actualizadas
    const folders = await prisma.folder.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        folderPath: "asc",
      },
    });

    console.log(`Synced ${folders.length} folders to database`);

    return NextResponse.json({
      success: true,
      folders,
      message: `Successfully synced ${folders.length} folders`,
    });
  } catch (error) {
    console.error("Error syncing folders:", error);
    return NextResponse.json(
      { error: "Failed to sync folders" },
      { status: 500 }
    );
  }
}
