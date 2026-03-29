import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { canAccessPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  createMobileIncident,
  createMobileMessageThread,
  downloadMobileFieldArtifact,
  endMobileVisitExecution,
  fetchMobileHome,
  fetchMobileMessageThread,
  fetchMobileMessageThreads,
  fetchMobileRoute,
  fetchMobileVisitDetail,
  MobileFieldArtifact,
  MobileHomeResponse,
  MobileIncident,
  MobileMessageThreadDetail,
  MobileMessageThreadSummary,
  MobileQuickNote,
  MobileQuickNoteStatus,
  MobileRouteProjectionResponse,
  SaveMobileTaskChecklistItemRequest,
  MobileTaskChecklistItem,
  MobileVisitDetailResponse,
  MobileVisitExecutionSession,
  saveMobileQuickNote,
  saveMobileTaskChecklist,
  sendMobileMessage,
  startMobileVisitExecution,
  uploadMobileFieldArtifact,
} from '../auth/session-api';
import {
  clearMobileExecutionSessionId,
  loadMobileExecutionSessionIds,
  loadMobileSyncQueue,
  MobileQueuedAction,
  persistMobileExecutionSessionId,
  queueMobileAction,
  removeQueuedMobileAction,
  replaceQueuedMobileAction,
} from '../mobile/mobile-sync';
import {
  MobileActionFooter,
  MobileAppShell,
  MobileModuleState,
  MobileMutationFrame,
  MobilePanel,
  MobileSyncVisualState,
  MobileVisitCard,
  MobileVisitDetailLayout,
} from '../components/MobileWorkspaceFoundation';

type LocationCapture =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'captured'; latitude: number; longitude: number }
  | { status: 'unavailable'; reason: string };

type ChecklistDraftItem = {
  taskTemplateId?: string;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  completionNotes: string;
};

type IncidentDraft = {
  incidentType: string;
  severity: string;
  narrative: string;
  escalationHook: string;
};

const MOBILE_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MOBILE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function summarizeAuthSource(kind: 'cookie' | 'storage') {
  return kind === 'storage' ? 'Local dev header mode' : 'Secure cookie mode';
}

function mobileAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

function MobileAuditCallout({
  actionTypes,
  body,
}: {
  actionTypes: string[];
  body: string;
}) {
  return (
    <div className="mobile-audit-callout">
      <p>{body}</p>
      <div className="mobile-inline-button-row">
        {actionTypes.map((actionType) => (
          <Link className="mobile-audit-link" key={actionType} to={mobileAuditHref(actionType)}>
            Review {actionType}
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function defaultChecklist(): ChecklistDraftItem[] {
  return [
    {
      title: 'Arrival and safety check',
      description: 'Confirm patient readiness and environment safety.',
      category: 'GENERAL',
      completed: false,
      completionNotes: '',
    },
    {
      title: 'Care delivery tasks',
      description: 'Capture the main visit tasks completed in the field.',
      category: 'CLINICAL',
      completed: false,
      completionNotes: '',
    },
  ];
}

function emptyIncident(): IncidentDraft {
  return {
    incidentType: 'CLINICAL_CONCERN',
    severity: 'HIGH',
    narrative: '',
    escalationHook: 'NOTIFY_BRANCH_CLINICAL',
  };
}

function nextActionLabel(
  executionSession: MobileVisitExecutionSession | null,
  canExecuteVisits: boolean,
  actionPending: boolean,
) {
  if (!canExecuteVisits) {
    return 'Read-only mobile view';
  }

  if (actionPending) {
    return executionSession?.executionStatus === 'IN_PROGRESS' ? 'Ending visit...' : 'Starting visit...';
  }

  if (executionSession?.executionStatus === 'IN_PROGRESS') {
    return 'End visit';
  }

  if (executionSession?.executionStatus === 'COMPLETED') {
    return 'Visit completed';
  }

  return 'Start visit';
}

async function requestGeolocation(): Promise<LocationCapture> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return {
      status: 'unavailable',
      reason:
        'Location is not available on this device. You can continue and the backend will record a controlled field action without coordinates.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: 'captured',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) =>
        resolve({
          status: 'unavailable',
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied. Retry location capture or continue without coordinates.'
              : 'Location capture failed. Retry or continue without coordinates if field policy allows it.',
        }),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  });
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, payload] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const contentType = mimeMatch?.[1] ?? 'image/png';
  const binary = window.atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: contentType });
}

function safeGetCanvasContext(canvas: HTMLCanvasElement | null) {
  if (!canvas) {
    return null;
  }

  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function SignaturePad({
  disabled,
  saving,
  onSave,
}: {
  disabled: boolean;
  saving: boolean;
  onSave: (file: File) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = safeGetCanvasContext(canvas);
    if (!context) {
      return;
    }
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0b4d73';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function positionForEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = safeGetCanvasContext(canvas);
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke || !safeGetCanvasContext(canvas)) {
      return;
    }
    const file = dataUrlToFile(canvas.toDataURL('image/png'), `signature-${Date.now()}.png`);
    await onSave(file);
  }

  return (
    <div className="mobile-signature-pad">
      <canvas
        className="mobile-signature-canvas"
        height={180}
        onPointerDown={(event) => {
          if (disabled) {
            return;
          }
          drawingRef.current = true;
          const context = safeGetCanvasContext(canvasRef.current);
          const position = positionForEvent(event);
          context?.beginPath();
          context?.moveTo(position.x, position.y);
        }}
        onPointerLeave={() => {
          drawingRef.current = false;
        }}
        onPointerMove={(event) => {
          if (disabled || !drawingRef.current) {
            return;
          }
          const context = safeGetCanvasContext(canvasRef.current);
          const position = positionForEvent(event);
          context?.lineTo(position.x, position.y);
          context?.stroke();
          setHasStroke(true);
        }}
        onPointerUp={() => {
          drawingRef.current = false;
        }}
        ref={canvasRef}
        width={520}
      />
      <div className="mobile-inline-button-row">
        <button className="button button-secondary" disabled={disabled} onClick={clearCanvas} type="button">
          Clear
        </button>
        <button
          className="button"
          disabled={disabled || !hasStroke || saving}
          onClick={() => void handleSave()}
          type="button"
        >
          {saving ? 'Saving signature...' : 'Save signature'}
        </button>
      </div>
    </div>
  );
}

export function MobileWorkspacePage() {
  const { state, refreshAuth, logout } = useAuth();
  const { profile } = useAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { visitId } = useParams<{ visitId: string }>();
  const [home, setHome] = useState<MobileHomeResponse | null>(null);
  const [routeProjection, setRouteProjection] = useState<MobileRouteProjectionResponse | null>(null);
  const [visitDetail, setVisitDetail] = useState<MobileVisitDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<MobileSyncVisualState>('idle');
  const [syncMessage, setSyncMessage] = useState(
    'Field app is ready. Pull fresh data when you need it.',
  );
  const [logoutPending, setLogoutPending] = useState(false);
  const [executionSession, setExecutionSession] = useState<MobileVisitExecutionSession | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [locationCapture, setLocationCapture] = useState<LocationCapture>({ status: 'idle' });
  const [syncQueue, setSyncQueue] = useState<MobileQueuedAction[]>(() => loadMobileSyncQueue());
  const [queueBusy, setQueueBusy] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState<ChecklistDraftItem[]>(defaultChecklist());
  const [savedChecklist, setSavedChecklist] = useState<MobileTaskChecklistItem[]>([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [checklistSuccess, setChecklistSuccess] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteStatus, setQuickNoteStatus] = useState<MobileQuickNoteStatus>('DRAFT');
  const [savedNotes, setSavedNotes] = useState<MobileQuickNote[]>([]);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<MobileFieldArtifact[]>([]);
  const [artifactSaving, setArtifactSaving] = useState(false);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [artifactSuccess, setArtifactSuccess] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<MobileIncident[]>([]);
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft>(emptyIncident());
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [incidentSuccess, setIncidentSuccess] = useState<string | null>(null);
  const [threads, setThreads] = useState<MobileMessageThreadSummary[]>([]);
  const [selectedThread, setSelectedThread] = useState<MobileMessageThreadDetail | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadSubject, setThreadSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  const day = useMemo(() => toIsoDate(new Date()), []);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
    [],
  );

  const mobileHomePath = '/mobile';
  const inMessages = location.pathname === '/mobile/messages';
  const inAccount = location.pathname === '/mobile/account';
  const inVisit = Boolean(visitId);
  const selectedThreadId = searchParams.get('threadId');

  const visits = home?.visits ?? [];
  const inProgressVisit = visits.find((item) => item.executionStatus === 'IN_PROGRESS') ?? null;
  const completedVisits = visits.filter((item) => item.executionStatus === 'COMPLETED');
  const notStartedVisits = visits.filter((item) => item.executionStatus !== 'COMPLETED');
  const nextVisit =
    notStartedVisits.find((item) => item.executionStatus !== 'IN_PROGRESS') ??
    notStartedVisits[0] ??
    null;
  const currentVisit = inProgressVisit ?? nextVisit ?? null;
  const canExecuteVisits = canAccessPermission(profile, 'execute_mobile_visits');
  const canViewMessages = canAccessPermission(profile, 'view_mobile_messages');
  const canSendMessages = canAccessPermission(profile, 'send_mobile_messages');
  const executionSessionId = executionSession?.id ?? null;

  async function loadMobileData(mode: 'initial' | 'manual') {
    if (state.status !== 'authenticated') {
      return;
    }

    if (mode === 'manual') {
      setSyncState('syncing');
      setSyncMessage('Refreshing field data from the backend mobile APIs.');
    }

    setLoading(mode === 'initial');
    setError(null);

    try {
      const [homeResponse, routeResponse, detailResponse] = await Promise.all([
        fetchMobileHome({
          ...authContext,
          day,
          timezone,
        }),
        fetchMobileRoute({
          ...authContext,
          day,
          timezone,
        }),
        visitId
          ? fetchMobileVisitDetail({
              ...authContext,
              visitId,
            })
          : Promise.resolve(null),
      ]);

      setHome(homeResponse);
      setRouteProjection(routeResponse);
      setVisitDetail(detailResponse);

      if (visitId) {
        const matchedStatus =
          homeResponse.visits.find((item) => item.visitId === visitId)?.executionStatus ?? null;
        const storedSessionId = loadMobileExecutionSessionIds()[visitId];
        setExecutionSession((previous) => {
          if (previous) {
            return matchedStatus
              ? {
                  ...previous,
                  executionStatus: matchedStatus,
                }
              : previous;
          }

          if (storedSessionId && matchedStatus && detailResponse) {
            return {
              id: storedSessionId,
              visitOccurrenceId: visitId,
              caregiverProfileId: 'caregiver-mobile',
              patientId: detailResponse.patientSummary.patientId,
              branchId: 'branch-mobile',
              startedAt: new Date().toISOString(),
              endedAt: matchedStatus === 'COMPLETED' ? new Date().toISOString() : null,
              startedLatitude: null,
              startedLongitude: null,
              endedLatitude: null,
              endedLongitude: null,
              startSource: 'mobile_web',
              endSource: matchedStatus === 'COMPLETED' ? 'mobile_web' : null,
              executionStatus: matchedStatus,
              syncStatus: 'ACCEPTED',
            };
          }

          return null;
        });
      }

      setSyncState(syncQueue.length ? 'queued' : 'synced');
      setSyncMessage(
        syncQueue.length
          ? `${syncQueue.length} action${syncQueue.length === 1 ? '' : 's'} queued for sync.`
          : `Field data synced for ${homeResponse.day}.`,
      );
    } catch (fetchError) {
      const message =
        fetchError instanceof ApiError
          ? fetchError.message
          : 'Unable to load the mobile field view right now.';
      setError(message);
      setSyncState('failed');
      setSyncMessage(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadThreads() {
    if (!canViewMessages || state.status !== 'authenticated') {
      return;
    }

    setThreadsLoading(true);
    setThreadsError(null);

    try {
      const summaries = await fetchMobileMessageThreads(authContext);
      setThreads(summaries);

      if (selectedThreadId) {
        const detail = await fetchMobileMessageThread(selectedThreadId, authContext);
        setSelectedThread(detail);
      } else {
        setSelectedThread(null);
      }
    } catch (threadError) {
      setThreadsError(
        threadError instanceof ApiError
          ? threadError.message
          : 'Unable to load mobile messages right now.',
      );
    } finally {
      setThreadsLoading(false);
    }
  }

  useEffect(() => {
    void loadMobileData('initial');
  }, [day, timezone, visitId, authContext.accessToken, authContext.sessionId, state.status]);

  useEffect(() => {
    if (inMessages) {
      void loadThreads();
    }
  }, [inMessages, selectedThreadId, canViewMessages]);

  useEffect(() => {
    setChecklistError(null);
    setChecklistSuccess(null);
    setNoteError(null);
    setNoteSuccess(null);
    setArtifactError(null);
    setArtifactSuccess(null);
    setIncidentError(null);
    setIncidentSuccess(null);
    setActionError(null);
    setActionSuccess(null);
    setMessageError(null);
    setMessageSuccess(null);
    setLocationCapture({ status: 'idle' });
    setChecklistDraft(defaultChecklist());
    setQuickNoteText('');
    setQuickNoteStatus('DRAFT');
    setSavedChecklist([]);
    setSavedNotes([]);
    setArtifacts([]);
    setIncidents([]);
    setIncidentDraft(emptyIncident());
  }, [visitId]);

  async function handleLogout() {
    setLogoutPending(true);

    try {
      const result = await logout({
        redirectTo: '/mobile/login?loggedOut=1',
      });
      navigate(result.redirectTo, { replace: true });
    } finally {
      setLogoutPending(false);
    }
  }

  async function flushQueuedActions() {
    if (queueBusy || !syncQueue.length) {
      return;
    }

    setQueueBusy(true);
    setSyncState('syncing');
    setSyncMessage('Retrying queued mobile actions.');

    let nextQueue = [...syncQueue];

    for (const item of syncQueue) {
      try {
        if (item.kind === 'task-checklist') {
          await saveMobileTaskChecklist({
            ...authContext,
            executionSessionId: item.executionSessionId,
            items: item.payload.items as SaveMobileTaskChecklistItemRequest[],
          });
        } else if (item.kind === 'quick-note') {
          await saveMobileQuickNote({
            ...authContext,
            executionSessionId: item.executionSessionId,
            status: item.payload.status as MobileQuickNoteStatus,
            noteText: item.payload.noteText as string,
            authoredAt: item.payload.authoredAt as string,
          });
        } else if (item.kind === 'incident') {
          await createMobileIncident({
            ...authContext,
            executionSessionId: item.executionSessionId,
            incidentType: item.payload.incidentType as string,
            severity: item.payload.severity as string,
            narrative: item.payload.narrative as string,
            reportedAt: item.payload.reportedAt as string,
            escalationHook: item.payload.escalationHook as string,
            artifactIds: item.payload.artifactIds as string[],
          });
        } else if (item.kind === 'create-thread') {
          await createMobileMessageThread({
            ...authContext,
            executionSessionId: item.executionSessionId,
            subject: item.payload.subject as string,
          });
        } else if (item.kind === 'send-message') {
          await sendMobileMessage({
            ...authContext,
            threadId: item.payload.threadId as string,
            messageText: item.payload.messageText as string,
            sentAt: item.payload.sentAt as string,
          });
        }

        nextQueue = removeQueuedMobileAction(item.id);
        setSyncQueue(nextQueue);
      } catch (queueError) {
        nextQueue = replaceQueuedMobileAction({
          ...item,
          failureMessage:
            queueError instanceof ApiError
              ? queueError.message
              : 'Queued action still cannot be synced.',
        });
        setSyncQueue(nextQueue);
      }
    }

    setQueueBusy(false);
    if (nextQueue.length) {
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} queued action${nextQueue.length === 1 ? '' : 's'} still need attention.`);
    } else {
      setSyncState('synced');
      setSyncMessage('Queued actions synced successfully.');
      await loadMobileData('manual');
      if (inMessages) {
        await loadThreads();
      }
    }
  }

  async function handleVisitExecution(action: 'start' | 'end', allowWithoutLocation = false) {
    if (!visitId || !canExecuteVisits) {
      return;
    }

    setActionPending(true);
    setActionError(null);
    setActionSuccess(null);
    setSyncState('syncing');
    setSyncMessage(
      action === 'start'
        ? 'Starting visit and capturing field state.'
        : 'Ending visit and saving completion state.',
    );

    try {
      let capture = locationCapture;
      if (!allowWithoutLocation) {
        setLocationCapture({ status: 'requesting' });
        capture = await requestGeolocation();
        setLocationCapture(capture);
        if (capture.status === 'unavailable') {
          setSyncState('queued');
          setSyncMessage(capture.reason);
          setActionPending(false);
          return;
        }
      }

      if (action === 'start') {
        const session = await startMobileVisitExecution({
          ...authContext,
          visitId,
          startedAt: new Date().toISOString(),
          startedLatitude: capture.status === 'captured' ? capture.latitude : undefined,
          startedLongitude: capture.status === 'captured' ? capture.longitude : undefined,
          startSource: 'mobile_web',
          syncStatus: 'ACCEPTED',
        });
        persistMobileExecutionSessionId(visitId, session.id);
        setExecutionSession(session);
        setActionSuccess('Visit started. The field session is now active and recorded.');
      } else {
        const targetSessionId = executionSession?.id;
        if (!targetSessionId) {
          throw new Error('No active execution session is loaded for this visit.');
        }
        const session = await endMobileVisitExecution({
          ...authContext,
          executionSessionId: targetSessionId,
          endedAt: new Date().toISOString(),
          endedLatitude: capture.status === 'captured' ? capture.latitude : undefined,
          endedLongitude: capture.status === 'captured' ? capture.longitude : undefined,
          endSource: 'mobile_web',
          syncStatus: 'ACCEPTED',
        });
        clearMobileExecutionSessionId(visitId);
        setExecutionSession(session);
        setActionSuccess('Visit ended. Today-work and route state have been refreshed.');
      }

      await loadMobileData('manual');
    } catch (executionError) {
      const message =
        executionError instanceof ApiError
          ? executionError.message
          : executionError instanceof Error
            ? executionError.message
            : 'Unable to save the visit action right now.';
      setActionError(message);
      setSyncState('failed');
      setSyncMessage(message);
    } finally {
      setActionPending(false);
    }
  }

  async function handleChecklistSave() {
    if (!visitId || !executionSessionId) {
      setChecklistError('Start the visit before saving checklist work.');
      return;
    }

    const items = checklistDraft.map((item, index) => ({
      taskTemplateId: item.taskTemplateId,
      title: item.title,
      description: item.description,
      category: item.category,
      sortOrder: index + 1,
      completed: item.completed,
      completedAt: item.completed ? new Date().toISOString() : undefined,
      completionNotes: item.completionNotes,
    }));

    if (navigator.onLine === false) {
      const nextQueue = queueMobileAction({
        kind: 'task-checklist',
        visitId,
        executionSessionId,
        payload: { items },
      });
      setSyncQueue(nextQueue);
      setChecklistSuccess('Checklist queued for sync when connectivity returns.');
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} action${nextQueue.length === 1 ? '' : 's'} queued for sync.`);
      return;
    }

    setChecklistSaving(true);
    setChecklistError(null);
    setChecklistSuccess(null);

    try {
      const saved = await saveMobileTaskChecklist({
        ...authContext,
        executionSessionId,
        items,
      });
      setSavedChecklist(saved);
      setChecklistSuccess('Checklist saved to the backend mobile documentation flow.');
      setSyncState('synced');
      setSyncMessage('Checklist synced successfully.');
    } catch (saveError) {
      setChecklistError(saveError instanceof ApiError ? saveError.message : 'Unable to save checklist right now.');
    } finally {
      setChecklistSaving(false);
    }
  }

  async function handleQuickNoteSave() {
    if (!visitId || !executionSessionId) {
      setNoteError('Start the visit before saving a field note.');
      return;
    }
    if (!quickNoteText.trim()) {
      setNoteError('Enter note text before saving.');
      return;
    }

    const payload = {
      status: quickNoteStatus,
      noteText: quickNoteText.trim(),
      authoredAt: new Date().toISOString(),
    };

    if (navigator.onLine === false) {
      const nextQueue = queueMobileAction({
        kind: 'quick-note',
        visitId,
        executionSessionId,
        payload,
      });
      setSyncQueue(nextQueue);
      setSavedNotes((current) => [
        {
          id: `queued-${Date.now()}`,
          executionSessionId,
          caregiverProfileId: 'caregiver-mobile',
          authoredAt: payload.authoredAt,
          noteText: payload.noteText,
          status: payload.status,
        },
        ...current,
      ]);
      setQuickNoteText('');
      setNoteSuccess('Note queued for sync when connectivity returns.');
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} action${nextQueue.length === 1 ? '' : 's'} queued for sync.`);
      return;
    }

    setNoteSaving(true);
    setNoteError(null);
    setNoteSuccess(null);

    try {
      const saved = await saveMobileQuickNote({
        ...authContext,
        executionSessionId,
        ...payload,
      });
      setSavedNotes((current) => [saved, ...current]);
      setQuickNoteText('');
      setNoteSuccess(saved.status === 'DRAFT' ? 'Draft note saved.' : 'Quick note submitted.');
      setSyncState('synced');
      setSyncMessage('Quick note synced successfully.');
    } catch (saveError) {
      setNoteError(saveError instanceof ApiError ? saveError.message : 'Unable to save quick note right now.');
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleArtifactUpload(file: File, artifactType: 'PHOTO' | 'SIGNATURE') {
    if (!executionSessionId) {
      setArtifactError('Start the visit before uploading artifacts.');
      return;
    }
    if (!MOBILE_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setArtifactError('Only JPEG, PNG, and WEBP uploads are allowed in the mobile field workflow.');
      return;
    }
    if (file.size > MOBILE_MAX_UPLOAD_BYTES) {
      setArtifactError('Mobile artifact uploads must be 10 MB or smaller.');
      return;
    }

    setArtifactSaving(true);
    setArtifactError(null);
    setArtifactSuccess(null);

    try {
      const saved = await uploadMobileFieldArtifact({
        ...authContext,
        executionSessionId,
        artifactType,
        file,
        description:
          artifactType === 'PHOTO'
            ? 'Field photo uploaded from the mobile workflow.'
            : 'Field signature captured from the mobile workflow.',
      });
      setArtifacts((current) => [saved, ...current]);
      setArtifactSuccess(
        artifactType === 'PHOTO'
          ? 'Photo uploaded and logged.'
          : 'Signature captured and logged.',
      );
      setSyncState('synced');
      setSyncMessage('Artifact synced successfully.');
    } catch (uploadError) {
      setArtifactError(uploadError instanceof ApiError ? uploadError.message : 'Unable to upload artifact right now.');
    } finally {
      setArtifactSaving(false);
    }
  }

  async function handleArtifactDownload(artifact: MobileFieldArtifact) {
    try {
      const downloaded = await downloadMobileFieldArtifact(artifact.id, authContext);
      const url = window.URL.createObjectURL(downloaded.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloaded.fileName ?? artifact.fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setArtifactError(downloadError instanceof ApiError ? downloadError.message : 'Unable to download artifact right now.');
    }
  }

  async function handleIncidentSave() {
    if (!visitId || !executionSessionId) {
      setIncidentError('Start the visit before flagging an incident.');
      return;
    }
    if (!incidentDraft.narrative.trim()) {
      setIncidentError('Enter incident details before submitting.');
      return;
    }

    const payload = {
      incidentType: incidentDraft.incidentType,
      severity: incidentDraft.severity,
      narrative: incidentDraft.narrative.trim(),
      reportedAt: new Date().toISOString(),
      escalationHook: incidentDraft.escalationHook,
      artifactIds: artifacts.map((artifact) => artifact.id),
    };

    if (navigator.onLine === false) {
      const nextQueue = queueMobileAction({
        kind: 'incident',
        visitId,
        executionSessionId,
        payload,
      });
      setSyncQueue(nextQueue);
      setIncidentSuccess('Incident queued for sync when connectivity returns.');
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} action${nextQueue.length === 1 ? '' : 's'} queued for sync.`);
      return;
    }

    setIncidentSaving(true);
    setIncidentError(null);
    setIncidentSuccess(null);

    try {
      const saved = await createMobileIncident({
        ...authContext,
        executionSessionId,
        ...payload,
      });
      setIncidents((current) => [saved, ...current]);
      setIncidentDraft(emptyIncident());
      setIncidentSuccess('Incident submitted and logged.');
      setSyncState('synced');
      setSyncMessage('Incident synced successfully.');
    } catch (saveError) {
      setIncidentError(saveError instanceof ApiError ? saveError.message : 'Unable to submit incident right now.');
    } finally {
      setIncidentSaving(false);
    }
  }

  async function handleThreadCreate() {
    if (!visitId || !executionSessionId) {
      setMessageError('Start the visit before opening a visit-linked message thread.');
      return;
    }
    if (!threadSubject.trim()) {
      setMessageError('Enter a thread subject before creating the conversation.');
      return;
    }

    const payload = {
      subject: threadSubject.trim(),
    };

    if (navigator.onLine === false) {
      const nextQueue = queueMobileAction({
        kind: 'create-thread',
        visitId,
        executionSessionId,
        payload,
      });
      setSyncQueue(nextQueue);
      setThreadSubject('');
      setMessageSuccess('Message thread queued for sync when connectivity returns.');
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} action${nextQueue.length === 1 ? '' : 's'} queued for sync.`);
      return;
    }

    setMessageSaving(true);
    setMessageError(null);
    setMessageSuccess(null);

    try {
      const created = await createMobileMessageThread({
        ...authContext,
        executionSessionId,
        subject: payload.subject,
      });
      setThreadSubject('');
      setSearchParams({ threadId: created.id });
      setMessageSuccess('Message thread created.');
      await loadThreads();
    } catch (saveError) {
      setMessageError(saveError instanceof ApiError ? saveError.message : 'Unable to create message thread right now.');
    } finally {
      setMessageSaving(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedThreadId) {
      setMessageError('Select a thread before sending a message.');
      return;
    }
    if (!messageText.trim()) {
      setMessageError('Enter a message before sending.');
      return;
    }

    const payload = {
      threadId: selectedThreadId,
      messageText: messageText.trim(),
      sentAt: new Date().toISOString(),
    };

    if (navigator.onLine === false) {
      const nextQueue = queueMobileAction({
        kind: 'send-message',
        visitId: visitId ?? currentVisit?.visitId ?? 'mobile-messages',
        executionSessionId: executionSessionId ?? loadMobileExecutionSessionIds()[visitId ?? ''] ?? 'mobile-messages',
        payload,
      });
      setSyncQueue(nextQueue);
      setMessageText('');
      setMessageSuccess('Message queued for sync when connectivity returns.');
      setSyncState('queued');
      setSyncMessage(`${nextQueue.length} action${nextQueue.length === 1 ? '' : 's'} queued for sync.`);
      return;
    }

    setMessageSaving(true);
    setMessageError(null);
    setMessageSuccess(null);

    try {
      await sendMobileMessage({
        ...authContext,
        ...payload,
      });
      setMessageText('');
      setMessageSuccess('Message sent.');
      await loadThreads();
    } catch (saveError) {
      setMessageError(saveError instanceof ApiError ? saveError.message : 'Unable to send message right now.');
    } finally {
      setMessageSaving(false);
    }
  }

  const headerAction = (
    <button
      className="button button-secondary"
      onClick={() => {
        void loadMobileData('manual');
        if (inMessages) {
          void loadThreads();
        }
      }}
      type="button"
    >
      Refresh
    </button>
  );

  const effectiveExecutionStatus =
    executionSession?.executionStatus ??
    visits.find((item) => item.visitId === visitId)?.executionStatus ??
    null;

  return (
    <MobileAppShell
      description="Caregiver-first field shell with one-tap routes into today, visit detail, messages, and account state."
      eyebrow="Epic 6 Mobile"
      headerAction={headerAction}
      navItems={[
        { to: '/mobile', label: 'Today' },
        { to: '/mobile/messages', label: 'Messages' },
        { to: '/mobile/account', label: 'Account' },
      ]}
      syncMessage={syncMessage}
      syncState={syncState}
      title="Field work"
    >
      {loading ? (
        <MobileModuleState
          description="Restoring the caregiver mobile shell and loading today's visits."
          title="Loading mobile workspace"
        />
      ) : error ? (
        <MobileModuleState
          description={error}
          title="Mobile data could not be loaded"
          variant="error"
        />
      ) : null}

      {!loading && syncQueue.length ? (
        <MobilePanel
          description="Supported mobile field actions can be queued locally when connectivity drops."
          title="Queued sync actions"
        >
          <div className="mobile-queue-list">
            {syncQueue.map((item) => (
              <div className="mobile-queue-item" key={item.id}>
                <div>
                  <strong>{item.kind}</strong>
                  <p>Queued at {formatDateTime(item.queuedAt)}</p>
                  {item.failureMessage ? <p>{item.failureMessage}</p> : null}
                </div>
              </div>
            ))}
          </div>
          <MobileActionFooter
            primaryDisabled={queueBusy}
            primaryLabel={queueBusy ? 'Retrying queued actions...' : 'Retry queued sync'}
            secondaryLabel="Recheck backend"
            onPrimaryClick={() => void flushQueuedActions()}
            onSecondaryClick={() => void loadMobileData('manual')}
          />
          <MobileAuditCallout
            actionTypes={['MOBILE_OFFLINE_SYNC_ACCEPTED', 'MOBILE_OFFLINE_SYNC_REJECTED']}
            body="Queued offline actions remain visible until the backend accepts them. Rejected sync attempts are logged too, so follow-up stays controlled."
          />
        </MobilePanel>
      ) : null}

      {!loading && !error && inMessages ? (
        canViewMessages ? (
          <div className="mobile-stack">
            <MobilePanel
              description="Thread list and detail both use the backend mobile message APIs."
              title="Message threads"
            >
              {threadsLoading ? (
                <MobileModuleState
                  description="Loading the latest caregiver message threads."
                  title="Loading messages"
                />
              ) : threadsError ? (
                <MobileModuleState
                  description={threadsError}
                  title="Messages could not be loaded"
                  variant="error"
                />
              ) : threads.length ? (
                <div className="mobile-thread-list">
                  {threads.map((thread) => (
                    <button
                      className={`mobile-thread-card${
                        selectedThreadId === thread.threadId ? ' mobile-thread-card-active' : ''
                      }`}
                      key={thread.threadId}
                      onClick={() => setSearchParams({ threadId: thread.threadId })}
                      type="button"
                    >
                      <strong>{thread.lastMessagePreview ?? 'Conversation started'}</strong>
                      <p>{thread.participantsSummary.join(' · ')}</p>
                      <span>{thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : 'No messages yet'}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <MobileModuleState
                  description="Message threads will appear here once the caregiver opens or receives a conversation."
                  title="No message threads yet"
                  variant="empty"
                />
              )}
            </MobilePanel>

            <MobilePanel
              description="Use a visit-linked thread from the field app without leaving the caregiver workflow."
              title="Conversation detail"
            >
              {selectedThread ? (
                <div className="mobile-thread-detail">
                  <div className="mobile-inline-note">
                    <strong>{selectedThread.subject}</strong>
                    <p>
                      {selectedThread.messages.length
                        ? `${selectedThread.messages.length} message${selectedThread.messages.length === 1 ? '' : 's'}`
                        : 'No messages yet'}
                    </p>
                  </div>
                  <div className="mobile-message-list">
                    {selectedThread.messages.map((message) => (
                      <div className="mobile-message-item" key={message.messageId}>
                        <strong>{message.senderEmail}</strong>
                        <p>{message.messageText}</p>
                        <span>{formatDateTime(message.sentAt)}</span>
                      </div>
                    ))}
                  </div>
                  {canSendMessages ? (
                    <>
                      <label className="field">
                        <span>Reply</span>
                        <textarea
                          className="input"
                          onChange={(event) => setMessageText(event.target.value)}
                          placeholder="Send a field update without leaving the visit context."
                          rows={3}
                          value={messageText}
                        />
                      </label>
                      <MobileActionFooter
                        primaryDisabled={messageSaving}
                        primaryLabel={messageSaving ? 'Sending...' : 'Send message'}
                        onPrimaryClick={() => void handleSendMessage()}
                      />
                    </>
                  ) : null}
                </div>
              ) : (
                <MobileModuleState
                  description="Pick a thread to see the conversation history and reply from the field app."
                  title="Select a thread"
                  variant="empty"
                />
              )}
              {messageError ? (
                <MobileModuleState description={messageError} title="Message action failed" variant="error" />
              ) : null}
              {messageSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{messageSuccess}</p>
                </div>
              ) : null}
              <MobileAuditCallout
                actionTypes={['MOBILE_MESSAGE_SENT', 'MOBILE_OFFLINE_SYNC_ACCEPTED']}
                body="Message delivery stays lightweight for caregivers, while the backend keeps a reviewable record of sent and later-synced mobile messages."
              />
            </MobilePanel>
          </div>
        ) : (
          <MobileModuleState
            description="This caregiver profile does not currently include message-center access."
            title="Messages are not available for this role"
            variant="readonly"
          />
        )
      ) : null}

      {!loading && !error && inAccount && state.status === 'authenticated' ? (
        <div className="mobile-stack">
          <MobilePanel
            description="Mobile account state focuses on session trust, route-safe re-auth, and logout."
            title="Session bootstrap"
          >
            <dl className="mobile-summary-list">
              <div>
                <dt>Auth source</dt>
                <dd>{summarizeAuthSource(state.authSource)}</dd>
              </div>
              <div>
                <dt>Session ID</dt>
                <dd>
                  <code>{state.session.sessionId}</code>
                </dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd>
                  <code>{state.session.userId}</code>
                </dd>
              </div>
              <div>
                <dt>Forced logout</dt>
                <dd>{state.session.forcedLogoutAt}</dd>
              </div>
            </dl>
            <MobileActionFooter
              primaryLabel="Retry backend bootstrap"
              secondaryDisabled={logoutPending}
              secondaryLabel={logoutPending ? 'Signing out...' : 'Logout'}
              onPrimaryClick={() => void refreshAuth()}
              onSecondaryClick={() => void handleLogout()}
            />
          </MobilePanel>

          <MobilePanel
            description="The mobile app keeps privacy-sensitive chart data out of the shell and only shows visit-safe field context."
            title="Privacy-aware field behavior"
          >
            <p className="support-copy">
              Administrative record editing stays in the desktop app. This mobile shell only shows
              the minimum patient, route, and care context required for the assigned caregiver.
            </p>
            <MobileAuditCallout
              actionTypes={['MOBILE_VISIT_EXECUTION_STARTED', 'MOBILE_VISIT_EXECUTION_ENDED']}
              body="Key visit-execution changes are logged in the backend for admin follow-up, but those review controls stay out of the caregiver workflow."
            />
          </MobilePanel>
        </div>
      ) : null}

      {!loading && !error && inVisit && visitDetail ? (
        <div className="mobile-stack">
          <MobileVisitDetailLayout
            careInstructions={visitDetail.careInstructions}
            patientSummary={visitDetail.patientSummary}
          >
            <MobilePanel
              description="The visit detail keeps route timing, execution state, and next action in one mobile-safe workflow."
              title="Visit execution"
            >
              <dl className="mobile-summary-list">
                <div>
                  <dt>Status</dt>
                  <dd>{effectiveExecutionStatus ?? 'Not started'}</dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>
                    {effectiveExecutionStatus === 'IN_PROGRESS'
                      ? 'End visit when field work is complete'
                      : effectiveExecutionStatus === 'COMPLETED'
                        ? 'Review documentation and continue to the next stop'
                        : 'Start visit with current field location'}
                  </dd>
                </div>
              </dl>
              {locationCapture.status === 'requesting' ? (
                <div className="mobile-inline-note">
                  <strong>Location capture in progress</strong>
                  <p>Requesting device location before saving the field action.</p>
                </div>
              ) : null}
              {locationCapture.status === 'unavailable' ? (
                <div className="mobile-inline-note">
                  <strong>Location capture needs attention</strong>
                  <p>{locationCapture.reason}</p>
                </div>
              ) : null}
              {locationCapture.status === 'captured' ? (
                <div className="mobile-inline-note">
                  <strong>Location captured</strong>
                  <p>
                    Latitude {locationCapture.latitude.toFixed(4)}, longitude{' '}
                    {locationCapture.longitude.toFixed(4)}.
                  </p>
                </div>
              ) : null}
              {actionSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{actionSuccess}</p>
                </div>
              ) : null}
              {actionError ? (
                <MobileModuleState
                  description={actionError}
                  title="Visit action failed"
                  variant="error"
                />
              ) : null}
            </MobilePanel>

            <MobileMutationFrame
              helper="Phase B uses the real execution APIs for start and end visit, keeps location capture visible, and refreshes the mobile board after every success."
              mode={canExecuteVisits ? 'editable' : 'read-only'}
              syncMessage={syncMessage}
              syncState={syncState}
              title="Visit action framework"
            >
              <MobileActionFooter
                primaryDisabled={
                  !canExecuteVisits || actionPending || effectiveExecutionStatus === 'COMPLETED'
                }
                primaryLabel={nextActionLabel(executionSession, canExecuteVisits, actionPending)}
                primaryTone={effectiveExecutionStatus === 'IN_PROGRESS' ? 'success' : 'default'}
                secondaryLabel={
                  locationCapture.status === 'unavailable' &&
                  canExecuteVisits &&
                  effectiveExecutionStatus !== 'COMPLETED'
                    ? 'Continue without location'
                    : 'Back to today'
                }
                secondaryDisabled={actionPending}
                onPrimaryClick={() =>
                  void handleVisitExecution(
                    effectiveExecutionStatus === 'IN_PROGRESS' ? 'end' : 'start',
                  )
                }
                onSecondaryClick={() =>
                  locationCapture.status === 'unavailable' &&
                  canExecuteVisits &&
                  effectiveExecutionStatus !== 'COMPLETED'
                    ? void handleVisitExecution(
                        effectiveExecutionStatus === 'IN_PROGRESS' ? 'end' : 'start',
                        true,
                      )
                    : navigate(mobileHomePath)
                }
              />
            </MobileMutationFrame>

            <MobilePanel
              description="Checklist changes can be saved immediately or queued when connectivity drops."
              title="Task checklist"
            >
              {!executionSessionId ? (
                <MobileModuleState
                  description="Start the visit to open task checklist capture."
                  title="Checklist locked until visit start"
                  variant="readonly"
                />
              ) : (
                <>
                  <div className="mobile-form-stack">
                    {checklistDraft.map((item, index) => (
                      <div className="mobile-card-row" key={`${item.title}-${index}`}>
                        <label className="checkbox">
                          <input
                            checked={item.completed}
                            onChange={(event) =>
                              setChecklistDraft((current) =>
                                current.map((candidate, candidateIndex) =>
                                  candidateIndex === index
                                    ? { ...candidate, completed: event.target.checked }
                                    : candidate,
                                ),
                              )
                            }
                            type="checkbox"
                          />
                          <span>{item.title}</span>
                        </label>
                        <textarea
                          className="input"
                          onChange={(event) =>
                            setChecklistDraft((current) =>
                              current.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, completionNotes: event.target.value }
                                  : candidate,
                              ),
                            )
                          }
                          placeholder="Completion notes"
                          rows={2}
                          value={item.completionNotes}
                        />
                      </div>
                    ))}
                  </div>
                  <MobileActionFooter
                    primaryDisabled={checklistSaving}
                    primaryLabel={checklistSaving ? 'Saving checklist...' : 'Save checklist'}
                    secondaryLabel="Add task row"
                    onPrimaryClick={() => void handleChecklistSave()}
                    onSecondaryClick={() =>
                      setChecklistDraft((current) => [
                        ...current,
                        {
                          title: 'Additional field task',
                          description: '',
                          category: 'GENERAL',
                          completed: false,
                          completionNotes: '',
                        },
                      ])
                    }
                  />
                </>
              )}
              {checklistError ? (
                <MobileModuleState description={checklistError} title="Checklist save failed" variant="error" />
              ) : null}
              {checklistSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{checklistSuccess}</p>
                </div>
              ) : null}
              {savedChecklist.length ? (
                <div className="mobile-inline-note">
                  <strong>Last saved checklist</strong>
                  <p>{savedChecklist.filter((item) => item.completed).length} items marked complete.</p>
                </div>
              ) : null}
              <MobileAuditCallout
                actionTypes={['MOBILE_TASK_CHECKLIST_SAVED', 'MOBILE_OFFLINE_SYNC_ACCEPTED']}
                body="Checklist saves are controlled field mutations. Admins can verify saved or later-synced checklist activity from the audit trail."
              />
            </MobilePanel>

            <MobilePanel
              description="Quick notes support draft vs submitted state and share the same sync model as checklist saves."
              title="Quick notes"
            >
              <label className="field">
                <span>Note status</span>
                <select
                  className="input"
                  onChange={(event) => setQuickNoteStatus(event.target.value as MobileQuickNoteStatus)}
                  value={quickNoteStatus}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                </select>
              </label>
              <label className="field">
                <span>Field note</span>
                <textarea
                  className="input"
                  onChange={(event) => setQuickNoteText(event.target.value)}
                  placeholder="Document what happened during the visit."
                  rows={4}
                  value={quickNoteText}
                />
              </label>
              <MobileActionFooter
                primaryDisabled={noteSaving}
                primaryLabel={noteSaving ? 'Saving note...' : 'Save note'}
                onPrimaryClick={() => void handleQuickNoteSave()}
              />
              {noteError ? (
                <MobileModuleState description={noteError} title="Quick note save failed" variant="error" />
              ) : null}
              {noteSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{noteSuccess}</p>
                </div>
              ) : null}
              {savedNotes.length ? (
                <div className="mobile-message-list">
                  {savedNotes.map((note) => (
                    <div className="mobile-message-item" key={note.id}>
                      <strong>{note.status}</strong>
                      <p>{note.noteText}</p>
                      <span>{formatDateTime(note.authoredAt)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <MobileAuditCallout
                actionTypes={['MOBILE_QUICK_NOTE_SAVED', 'MOBILE_OFFLINE_SYNC_ACCEPTED']}
                body="Quick notes record field-only documentation. Saved and offline-synced notes are logged for later review without exposing extra chart metadata here."
              />
            </MobilePanel>

            <MobilePanel
              description="Photo capture and signature save both use the backend artifact upload flow, with clear mobile restrictions."
              title="Photos and signature"
            >
              {!executionSessionId ? (
                <MobileModuleState
                  description="Start the visit to capture photos or a signature."
                  title="Artifact capture locked until visit start"
                  variant="readonly"
                />
              ) : (
                <>
                  <label className="field">
                    <span>Upload field photo</span>
                    <input
                      accept={MOBILE_ALLOWED_IMAGE_TYPES.join(',')}
                      className="input"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleArtifactUpload(file, 'PHOTO');
                        }
                      }}
                      type="file"
                    />
                  </label>

                  <SignaturePad
                    disabled={!executionSessionId || artifactSaving}
                    onSave={(file) => handleArtifactUpload(file, 'SIGNATURE')}
                    saving={artifactSaving}
                  />
                </>
              )}
              {artifactError ? (
                <MobileModuleState description={artifactError} title="Artifact action failed" variant="error" />
              ) : null}
              {artifactSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{artifactSuccess}</p>
                </div>
              ) : null}
              {artifacts.length ? (
                <div className="mobile-thread-list">
                  {artifacts.map((artifact) => (
                    <div className="mobile-thread-card" key={artifact.id}>
                      <strong>{artifact.fileName}</strong>
                      <p>{artifact.artifactType}</p>
                      <span>{formatDateTime(artifact.uploadedAt)}</span>
                      <button
                        className="button button-secondary"
                        onClick={() => void handleArtifactDownload(artifact)}
                        type="button"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <MobileAuditCallout
                actionTypes={['MOBILE_PHOTO_UPLOADED', 'MOBILE_SIGNATURE_CAPTURED']}
                body="Uploaded photos and captured signatures are treated as controlled artifacts. Admin review stays in audit tools, not on the caregiver device."
              />
            </MobilePanel>

            <MobilePanel
              description="Incident capture keeps the narrative, severity, and optional linked artifacts together."
              title="Incident flagging"
            >
              <label className="field">
                <span>Incident type</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setIncidentDraft((current) => ({ ...current, incidentType: event.target.value }))
                  }
                  value={incidentDraft.incidentType}
                />
              </label>
              <label className="field">
                <span>Severity</span>
                <select
                  className="input"
                  onChange={(event) =>
                    setIncidentDraft((current) => ({ ...current, severity: event.target.value }))
                  }
                  value={incidentDraft.severity}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
              <label className="field">
                <span>Narrative</span>
                <textarea
                  className="input"
                  onChange={(event) =>
                    setIncidentDraft((current) => ({ ...current, narrative: event.target.value }))
                  }
                  rows={4}
                  value={incidentDraft.narrative}
                />
              </label>
              <MobileActionFooter
                primaryDisabled={incidentSaving}
                primaryLabel={incidentSaving ? 'Submitting incident...' : 'Submit incident'}
                onPrimaryClick={() => void handleIncidentSave()}
              />
              {incidentError ? (
                <MobileModuleState description={incidentError} title="Incident submit failed" variant="error" />
              ) : null}
              {incidentSuccess ? (
                <div className="mobile-inline-note">
                  <strong>Saved</strong>
                  <p>{incidentSuccess}</p>
                </div>
              ) : null}
              {incidents.length ? (
                <div className="mobile-message-list">
                  {incidents.map((incident) => (
                    <div className="mobile-message-item" key={incident.id}>
                      <strong>{incident.incidentType}</strong>
                      <p>{incident.narrative}</p>
                      <span>{formatDateTime(incident.reportedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <MobileAuditCallout
                actionTypes={['MOBILE_INCIDENT_FLAGGED', 'MOBILE_OFFLINE_SYNC_ACCEPTED']}
                body="Incident submissions are logged as sensitive field events so agencies can reconstruct what was reported and when."
              />
            </MobilePanel>

            <MobilePanel
              description="Create a visit-linked thread directly from the field workflow, then continue in the message center."
              title="Open a message thread"
            >
              <label className="field">
                <span>Thread subject</span>
                <input
                  className="input"
                  onChange={(event) => setThreadSubject(event.target.value)}
                  placeholder="Example: Route delay for next patient"
                  value={threadSubject}
                />
              </label>
              <MobileActionFooter
                primaryDisabled={messageSaving || !canSendMessages}
                primaryLabel={messageSaving ? 'Creating thread...' : 'Create thread'}
                secondaryLabel="Open message center"
                onPrimaryClick={() => void handleThreadCreate()}
                onSecondaryClick={() => navigate('/mobile/messages')}
              />
              <MobileAuditCallout
                actionTypes={['MOBILE_MESSAGE_SENT', 'MOBILE_OFFLINE_SYNC_ACCEPTED']}
                body="Visit-linked coordination messages are logged for traceability, while the field app keeps the conversation surface lightweight."
              />
            </MobilePanel>
          </MobileVisitDetailLayout>
        </div>
      ) : null}

      {!loading && !error && !inMessages && !inAccount && !inVisit ? (
        <div className="mobile-stack">
          <MobilePanel
            description="The mobile home highlights the current field action first, then the next stop, then what is already done."
            title="Current focus"
            tone="accent"
          >
            {currentVisit ? (
              <MobileVisitCard
                emphasis={inProgressVisit ? 'current' : 'upcoming'}
                item={currentVisit}
                to={`/mobile/visits/${currentVisit.visitId}`}
              />
            ) : (
              <MobileModuleState
                description="No visits are currently assigned for this day."
                title="No field work scheduled"
                variant="empty"
              />
            )}
            <div className="mobile-inline-note">
              <strong>Quick action</strong>
              <p>
                {inProgressVisit
                  ? 'Continue the in-progress visit without searching through the full list.'
                  : nextVisit
                    ? 'Open the next scheduled visit directly from the mobile home.'
                    : 'No next visit is currently queued for this day.'}
              </p>
            </div>
            <MobileActionFooter
              primaryDisabled={!currentVisit}
              primaryLabel={
                inProgressVisit
                  ? 'Continue in-progress visit'
                  : nextVisit
                    ? 'Open next visit'
                    : 'No current visit'
              }
              secondaryDisabled={!canViewMessages}
              secondaryLabel={canViewMessages ? 'Messages' : undefined}
              onPrimaryClick={() =>
                currentVisit ? navigate(`/mobile/visits/${currentVisit.visitId}`) : undefined
              }
              onSecondaryClick={() => navigate('/mobile/messages')}
            />
          </MobilePanel>

          <MobilePanel
            description="Today-work cards come from the backend mobile home API and stay ordered for quick handheld scanning."
            title="Today's visits"
          >
            <div className="mobile-visit-list">
              {visits.length ? (
                visits.map((item) => {
                  const emphasis =
                    item.executionStatus === 'COMPLETED'
                      ? 'completed'
                      : item.executionStatus === 'IN_PROGRESS'
                        ? 'current'
                        : item.visitId === nextVisit?.visitId
                          ? 'upcoming'
                          : undefined;
                  return (
                    <MobileVisitCard
                      emphasis={emphasis}
                      item={item}
                      key={item.visitId}
                      to={`/mobile/visits/${item.visitId}`}
                    />
                  );
                })
              ) : (
                <MobileModuleState
                  description="Assigned visits for the selected day will appear here."
                  title="No visits returned"
                  variant="empty"
                />
              )}
            </div>
          </MobilePanel>

          <MobilePanel
            description="Route order is shown in a practical field order without exposing raw routing-engine internals."
            title="Route order"
          >
            {routeProjection?.stops.length ? (
              <ol className="mobile-route-list">
                {routeProjection.stops.map((stop) => (
                  <li className="mobile-route-stop" key={stop.visitId}>
                    <div>
                      <strong>{stop.patientDisplaySummary}</strong>
                      <p>
                        {stop.addressSummary ?? 'Address available in visit-safe summary only.'}
                        {' · '}
                        {formatDateTime(stop.plannedStartAt)}
                      </p>
                    </div>
                    <span className="mobile-route-order">
                      {stop.executionStatus === 'COMPLETED'
                        ? 'Done'
                        : stop.executionStatus === 'IN_PROGRESS'
                          ? 'Now'
                          : `#${stop.sortOrder}`}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <MobileModuleState
                description="Route projection will appear once the backend has ordered assigned visits for the caregiver."
                title="No route projection returned"
                variant="empty"
              />
            )}
          </MobilePanel>

          <MobilePanel
            description="The home screen keeps completion context lightweight so the caregiver can focus on the next field action."
            title="Day summary"
          >
            <dl className="mobile-summary-list">
              <div>
                <dt>In progress</dt>
                <dd>{inProgressVisit ? 1 : 0}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{completedVisits.length}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{visits.length - completedVisits.length}</dd>
              </div>
            </dl>
          </MobilePanel>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
