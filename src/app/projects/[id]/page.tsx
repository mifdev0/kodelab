'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import EditorWorkspace from '@/components/EditorWorkspace';

export default function ProjectStudioPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <EditorWorkspace initialMeetingId={projectId} />;
}
