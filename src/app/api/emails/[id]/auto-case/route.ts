import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCaseFromResolvedEmail } from '@/lib/agent/learning/auto-case-creator';

/**
 * POST /api/emails/[id]/auto-case
 * Crea automáticamente un caso desde un email resuelto
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailId = params.id;

    const result = await createCaseFromResolvedEmail(emailId, session.user.id);

    if (!result.created) {
      return NextResponse.json({
        success: false,
        reason: result.reason,
      });
    }

    return NextResponse.json({
      success: true,
      caseId: result.caseId,
      message: 'Case created successfully from resolved email',
    });
  } catch (error) {
    console.error('Error creating auto case:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
