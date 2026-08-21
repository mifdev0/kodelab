'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import EditorWorkspace from '@/components/EditorWorkspace';

export default function MeetingEditorPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;

  return <EditorWorkspace initialMeetingId={meetingId} />;
}
