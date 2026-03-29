import { DevSessionCredentials } from './session-storage';

export type SessionSnapshot = {
  sessionId: string;
  userId: string;
  idleTimeoutAt: string;
  absoluteTimeoutAt: string;
  forcedLogoutAt: string;
  warningRequired: boolean;
  secondsUntilForcedLogout: number;
};

export type SessionBootstrapResult =
  | { kind: 'authenticated'; snapshot: SessionSnapshot; authSource: 'cookie' | 'storage' }
  | { kind: 'unauthenticated' };

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  userId: string;
  mfaRequired: boolean;
  loginChallengeToken: string | null;
  sessionId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
};

export type MfaChallengeRequest = {
  challengeToken: string;
  totpCode?: string;
  recoveryCode?: string;
};

export type MfaChallengeResponse = {
  userId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  recoveryCodeUsed: boolean;
};

export type LogoutRequest = {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  redirectTo?: string;
};

export type LogoutResponse = {
  redirectTo: string;
};

export type RefreshSessionRequest = {
  refreshToken?: string;
  sessionId?: string;
};

export type RefreshSessionResponse = {
  userId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type PasswordPolicyResponse = {
  minimumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
  commonPasswordCheckEnabled: boolean;
  preventReuseCount: number;
  summary: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
  revokeExistingSessions: boolean;
};

export type ResetPasswordResponse = {
  message: string;
  revokedExistingSessions: boolean;
};

export type ChangePasswordRequest = {
  accessToken?: string;
  sessionId?: string;
  currentPassword: string;
  newPassword: string;
  invalidateOtherSessions: boolean;
};

export type ChangePasswordResponse = {
  message: string;
  invalidatedOtherSessions: boolean;
};

export type AuthenticatedRequestContext = {
  accessToken?: string;
  sessionId?: string;
};

export type MfaStatusResponse = {
  userId: string;
  mfaEnabled: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
};

export type MfaEnrollmentStartRequest = AuthenticatedRequestContext & {
  currentPassword: string;
};

export type MfaEnrollmentStartResponse = {
  enrollmentToken: string;
  manualEntryKey: string;
  otpauthUri: string;
  expiresAt: string;
  recoveryCodes: string[];
};

export type MfaEnrollmentConfirmRequest = {
  enrollmentToken: string;
  totpCode: string;
};

export type MfaEnrollmentConfirmResponse = {
  userId: string;
  mfaEnabled: boolean;
  recoveryCodesRemaining: number;
};

export type AgencyMfaPolicyMode = 'OFF' | 'ALL_USERS' | 'SELECTED_ROLES';

export type AgencyRole =
  | 'AGENCY_OWNER'
  | 'BRANCH_ADMIN'
  | 'SCHEDULER_COORDINATOR'
  | 'CAREGIVER'
  | 'QA_CLINICAL_REVIEWER'
  | 'BILLING_BACK_OFFICE'
  | 'READ_ONLY_AUDITOR';

export type UserStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type CurrentAccessResponse = {
  userId: string;
  agencyId: string;
  membershipId: string;
  role: AgencyRole;
  branchScope: 'AGENCY_WIDE' | 'AGENCY_WIDE_READ' | 'ASSIGNED_BRANCHES';
  assignedBranchIds: string[];
  permissions: string[];
};

export type MobileExecutionSessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export type MobileSyncDisposition = 'PENDING' | 'ACCEPTED' | 'FAILED';

export type MobileHomeTodayWorkItem = {
  visitId: string;
  patientDisplaySummary: string;
  branchName: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
  scheduleStatus: string;
  routeOrder: number | null;
  executionStatus: MobileExecutionSessionStatus | null;
};

export type MobileHomeResponse = {
  day: string;
  timezone: string;
  visits: MobileHomeTodayWorkItem[];
};

export type MobileRouteStop = {
  visitId: string;
  patientDisplaySummary: string;
  addressSummary: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  sortOrder: number;
  executionStatus: MobileExecutionSessionStatus | null;
};

export type MobileRouteProjectionResponse = {
  caregiverProfileId: string;
  day: string;
  timezone: string;
  stops: MobileRouteStop[];
};

export type MobilePatientContactSummary = {
  fullName: string;
  relationshipType: string | null;
  phone: string | null;
  email: string | null;
};

export type MobilePatientSummary = {
  patientId: string;
  patientDisplaySummary: string;
  dateOfBirth: string;
  addressSummary: string | null;
  contactSummary: MobilePatientContactSummary | null;
  diagnosisSummaries: string[];
  serviceLineSummary: string | null;
  visitTypeSummary: string | null;
  payerSnippet: string | null;
};

export type MobileCareInstructionSummary = {
  visitId: string;
  visitTypeInstructions: string | null;
  serviceLineInstructions: string | null;
  branchInstructions: string | null;
  patientSpecificCareNotes: string | null;
};

export type MobileVisitDetailResponse = {
  visitId: string;
  patientSummary: MobilePatientSummary;
  careInstructions: MobileCareInstructionSummary;
};

export type MobileVisitExecutionSession = {
  id: string;
  visitOccurrenceId: string;
  caregiverProfileId: string;
  patientId: string;
  branchId: string;
  startedAt: string;
  endedAt: string | null;
  startedLatitude: number | null;
  startedLongitude: number | null;
  endedLatitude: number | null;
  endedLongitude: number | null;
  startSource: string | null;
  endSource: string | null;
  executionStatus: MobileExecutionSessionStatus;
  syncStatus: MobileSyncDisposition | null;
};

export type MobileQuickNoteStatus = 'DRAFT' | 'SUBMITTED';

export type MobileFieldArtifactType = 'PHOTO' | 'SIGNATURE';

export type MobileFieldArtifactStatus = 'ACTIVE' | 'ARCHIVED';

export type MobileIncidentStatus = 'OPEN' | 'TRIAGED' | 'RESOLVED';

export type MobileMessageThreadStatus = 'OPEN' | 'ARCHIVED';

export type MobileTaskChecklistItem = {
  id: string;
  executionSessionId: string;
  taskTemplateId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  completionNotes: string | null;
};

export type SaveMobileTaskChecklistItemRequest = {
  taskTemplateId?: string;
  title: string;
  description?: string;
  category?: string;
  sortOrder: number;
  completed: boolean;
  completedAt?: string;
  completionNotes?: string;
};

export type SaveMobileTaskChecklistRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  items: SaveMobileTaskChecklistItemRequest[];
};

export type SaveMobileQuickNoteRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  status: MobileQuickNoteStatus;
  noteText: string;
  authoredAt?: string;
};

export type MobileQuickNote = {
  id: string;
  executionSessionId: string;
  caregiverProfileId: string;
  authoredAt: string;
  noteText: string;
  status: MobileQuickNoteStatus;
};

export type UploadMobileFieldArtifactRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  artifactType: MobileFieldArtifactType;
  file: File;
  description: string;
};

export type MobileFieldArtifact = {
  id: string;
  executionSessionId: string;
  visitOccurrenceId: string;
  artifactType: MobileFieldArtifactType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  description: string | null;
  status: MobileFieldArtifactStatus;
  uploadedAt: string;
};

export type CreateMobileIncidentRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  incidentType: string;
  severity?: string;
  narrative: string;
  reportedAt?: string;
  escalationHook?: string;
  artifactIds?: string[];
};

export type MobileIncident = {
  id: string;
  executionSessionId: string;
  visitOccurrenceId: string;
  incidentType: string;
  severity: string | null;
  narrative: string;
  reportedAt: string;
  status: MobileIncidentStatus;
  escalationHook: string | null;
  artifactIds: string[];
};

export type MobileMessageThreadSummary = {
  threadId: string;
  participantsSummary: string[];
  lastMessagePreview: string | null;
  unreadCount: number;
  patientId: string | null;
  visitOccurrenceId: string | null;
  lastMessageAt: string | null;
};

export type MobileMessageThreadMessage = {
  messageId: string;
  senderMembershipId: string;
  senderEmail: string;
  sentAt: string;
  messageText: string;
};

export type MobileMessageThreadDetail = {
  threadId: string;
  subject: string;
  patientId: string | null;
  visitOccurrenceId: string | null;
  messages: MobileMessageThreadMessage[];
};

export type CreateMobileMessageThreadRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  subject: string;
};

export type MobileMessageThread = {
  id: string;
  subject: string;
  patientId: string | null;
  visitOccurrenceId: string | null;
  lastMessageAt: string | null;
  status: MobileMessageThreadStatus;
};

export type SendMobileMessageRequest = AuthenticatedRequestContext & {
  threadId: string;
  messageText: string;
  sentAt?: string;
};

export type MobileMessageEntry = {
  id: string;
  threadId: string;
  senderMembershipId: string;
  sentAt: string;
  messageText: string;
};

export type StartMobileVisitExecutionRequest = AuthenticatedRequestContext & {
  visitId: string;
  startedAt: string;
  startedLatitude?: number;
  startedLongitude?: number;
  startSource?: string;
  syncStatus?: MobileSyncDisposition;
};

export type EndMobileVisitExecutionRequest = AuthenticatedRequestContext & {
  executionSessionId: string;
  endedAt: string;
  endedLatitude?: number;
  endedLongitude?: number;
  endSource?: string;
  syncStatus?: MobileSyncDisposition;
};

export type MobileDayQuery = AuthenticatedRequestContext & {
  day: string;
  timezone?: string;
};

export type MobileVisitDetailQuery = AuthenticatedRequestContext & {
  visitId: string;
};

export type EvvVerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'VERIFIED_WITH_WARNING'
  | 'EXCEPTION_OPEN'
  | 'EXCEPTION_ACKNOWLEDGED'
  | 'MISSED_VISIT_REPORTED'
  | 'ESCALATED'
  | 'RESOLVED';

export type GeofenceEvaluationOutcome =
  | 'WITHIN_TOLERANCE'
  | 'OUTSIDE_TOLERANCE_WARNING'
  | 'OUTSIDE_TOLERANCE_BLOCKED'
  | 'NOT_EVALUABLE';

export type EvvComplianceOutcome =
  | 'READY'
  | 'READY_WITH_WARNING'
  | 'BLOCKED'
  | 'MISSED_VISIT';

export type MobileEvvSummaryResponse = {
  visitId: string;
  verificationSessionId: string | null;
  patientId: string;
  branchId: string | null;
  caregiverProfileId: string | null;
  verificationStatus: EvvVerificationStatus;
  complianceOutcome: EvvComplianceOutcome;
  startEventPresent: boolean;
  endEventPresent: boolean;
  geofenceOutcome: GeofenceEvaluationOutcome;
  signatureComplete: boolean;
  openExceptionCount: number;
  missedVisitReported: boolean;
  warnings: string[];
  blockers: string[];
};

export type FetchEvvReadinessQuery = AuthenticatedRequestContext & {
  day: string;
  branchId?: string;
  verificationStatus?: EvvVerificationStatus;
  complianceOutcome?: EvvComplianceOutcome;
};

export type EvvClockEventType = 'CLOCK_IN' | 'CLOCK_OUT';

export type SignatureVerificationStatus =
  | 'PRESENT'
  | 'MISSING'
  | 'REFUSED'
  | 'NOT_APPLICABLE';

export type SignatureSignerRole = 'PATIENT' | 'CAREGIVER' | 'REPRESENTATIVE';

export type VisitExceptionType =
  | 'LATE_START'
  | 'GEOFENCE_OUT_OF_RANGE'
  | 'MISSING_SIGNATURE'
  | 'NO_SHOW'
  | 'PATIENT_REFUSED'
  | 'CAREGIVER_UNAVAILABLE'
  | 'DOCUMENTATION_GAP';

export type VisitExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VisitExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

export type MobileMissedVisitStatus = 'REPORTED' | 'NOTIFIED' | 'ESCALATED' | 'RESOLVED';

export type SupervisorNotificationStatus = 'QUEUED' | 'SENT' | 'FAILED';

export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';

export type MobileEvvClockEventResponse = {
  eventId: string;
  verificationSessionId: string;
  eventType: EvvClockEventType;
  capturedAt: string;
  verificationStatus: EvvVerificationStatus;
  geofenceOutcome: GeofenceEvaluationOutcome | null;
  geofenceReasonCode: string | null;
  distanceFromExpectedMeters: number | null;
  toleranceMetersUsed: number | null;
  overallOutcome: EvvComplianceOutcome;
  warnings: string[];
  blockers: string[];
};

export type RecordMobileEvvClockEventRequest = AuthenticatedRequestContext & {
  visitId: string;
  executionSessionId?: string;
  capturedAt: string;
  capturedLatitude?: number;
  capturedLongitude?: number;
  timezone: string;
  captureSource: string;
  platformSummary?: string;
  appVersion?: string;
  deviceClass?: string;
  timezoneOffsetMinutes?: number;
  userAgentHash?: string;
  sessionFingerprintHash?: string;
};

export type MobileEvvSignatureResponse = {
  id: string;
  verificationSessionId: string;
  artifactId: string | null;
  signerRole: SignatureSignerRole;
  verificationStatus: SignatureVerificationStatus;
  recordedAt: string;
};

export type RecordMobileEvvSignatureRequest = AuthenticatedRequestContext & {
  verificationSessionId: string;
  artifactId?: string;
  signerRole: SignatureSignerRole;
  verificationStatus: SignatureVerificationStatus;
  recordedAt: string;
};

export type ReportMobileMissedVisitRequest = AuthenticatedRequestContext & {
  visitId: string;
  reasonCode: string;
  narrative: string;
  reportedAt: string;
};

export type MobileMissedVisitResponse = {
  id: string;
  visitId: string;
  caregiverProfileId: string | null;
  patientId: string;
  branchId: string | null;
  reasonCode: string;
  narrative: string;
  reportedAt: string;
  status: MobileMissedVisitStatus;
};

export type CreateMobileVisitExceptionRequest = AuthenticatedRequestContext & {
  verificationSessionId: string;
  exceptionType: VisitExceptionType;
  severity: VisitExceptionSeverity;
  reasonCode: string;
  narrative: string;
};

export type MobileVisitExceptionResponse = {
  id: string;
  verificationSessionId: string | null;
  visitId: string;
  caregiverProfileId: string | null;
  patientId: string;
  branchId: string | null;
  exceptionType: VisitExceptionType;
  severity: VisitExceptionSeverity;
  reasonCode: string;
  narrative: string;
  status: VisitExceptionStatus;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type ListMobileVisitExceptionsQuery = AuthenticatedRequestContext & {
  visitId?: string;
  status?: VisitExceptionStatus;
};

export type UpdateMobileVisitExceptionStatusRequest = AuthenticatedRequestContext & {
  exceptionId: string;
  status: VisitExceptionStatus;
  actedAt: string;
};

export type NotifyMobileEvvSupervisorRequest = AuthenticatedRequestContext & {
  recipientMembershipId: string;
  channel: string;
  rationale: string;
  createdAt: string;
};

export type MobileEvvNotificationResponse = {
  id: string;
  missedVisitRecordId: string | null;
  visitExceptionRecordId: string | null;
  recipientMembershipId: string;
  channel: string;
  rationale: string;
  createdAt: string;
  status: SupervisorNotificationStatus;
};

export type CreateMobileEvvEscalationRequest = AuthenticatedRequestContext & {
  targetRoleKey: string;
  severity: VisitExceptionSeverity;
  rationale: string;
  slaDueAt?: string;
};

export type MobileEvvEscalationResponse = {
  id: string;
  missedVisitRecordId: string | null;
  visitExceptionRecordId: string | null;
  targetRoleKey: string;
  severity: VisitExceptionSeverity;
  rationale: string;
  slaDueAt: string | null;
  status: EscalationStatus;
};

export type ScheduleBoardView = 'DAY' | 'WEEK' | 'MONTH';

export type SchedulingVisitStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'OPEN_SHIFT'
  | 'RESCHEDULED'
  | 'CANCELLED';

export type SchedulingConflictOutcome = 'CLEAR' | 'WARNING' | 'BLOCKING';

export type TravelAwarenessLevel =
  | 'FEASIBLE'
  | 'TIGHT_CONNECTION'
  | 'INFEASIBLE'
  | 'UNKNOWN';

export type ScheduleBoardItem = {
  visitId: string;
  patientId: string;
  patientDisplayName: string;
  branchId: string | null;
  serviceLineId: string | null;
  visitTypeId: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
  status: SchedulingVisitStatus;
  priority: string | null;
  activeAssignmentId: string | null;
  activeCaregiverProfileId: string | null;
  openShift: boolean;
};

export type ScheduleBoardResponse = {
  view: ScheduleBoardView;
  windowStart: string;
  windowEnd: string;
  items: ScheduleBoardItem[];
};

export type ScheduleBoardQuery = AuthenticatedRequestContext & {
  view: ScheduleBoardView;
  date: string;
  branchId?: string;
  caregiverId?: string;
  patientId?: string;
  status?: SchedulingVisitStatus;
  openShiftsOnly?: boolean;
};

export type ScheduleVisitDetail = {
  id: string;
  agencyId: string;
  patientId: string;
  branchId: string | null;
  serviceLineId: string | null;
  visitTypeId: string | null;
  recurringVisitRuleId: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
  status: SchedulingVisitStatus;
  priority: string | null;
  creationMode: string | null;
  notes: string | null;
  activeAssignmentId: string | null;
  activeCaregiverProfileId: string | null;
  openShiftId: string | null;
};

export type ScheduleVisitPage = ConfigurationPage<ScheduleVisitDetail>;

export type ScheduleVisitQuery = AuthenticatedRequestContext & {
  status?: SchedulingVisitStatus | 'ALL';
  branchId?: string;
  caregiverId?: string;
  patientId?: string;
  page?: number;
  size?: number;
};

export type ManageScheduleVisitRequest = AuthenticatedRequestContext & {
  visitId?: string;
  patientId: string;
  branchId?: string;
  serviceLineId?: string;
  visitTypeId?: string;
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
  priority?: string;
  creationMode?: string;
  notes?: string;
};

export type CaregiverAssignmentStatus = 'ACTIVE' | 'REMOVED';

export type ScheduleAssignment = {
  id: string;
  agencyId: string;
  visitOccurrenceId: string;
  caregiverProfileId: string;
  branchId: string | null;
  assignedAt: string;
  assignmentStatus: CaregiverAssignmentStatus;
  assignmentSource: string | null;
  notes: string | null;
};

export type ManageScheduleAssignmentRequest = AuthenticatedRequestContext & {
  visitId: string;
  caregiverProfileId: string;
  branchId?: string;
  assignmentSource?: string;
  notes?: string;
};

export type OpenShiftStatus = 'OPEN' | 'FILLED' | 'CLOSED';

export type ScheduleOpenShift = {
  id: string;
  agencyId: string;
  visitOccurrenceId: string;
  branchId: string | null;
  openedAt: string;
  closedAt: string | null;
  status: OpenShiftStatus;
  priority: string | null;
  notes: string | null;
};

export type ManageScheduleOpenShiftRequest = AuthenticatedRequestContext & {
  visitId: string;
  branchId?: string;
  priority?: string;
  notes?: string;
};

export type TravelAwareness = {
  estimatedTravelMinutes: number;
  gapMinutes: number;
  level: TravelAwarenessLevel;
  rationaleCode: string | null;
};

export type OvertimeEvaluation = {
  projectedScheduledMinutes: number;
  proposedMinutes: number;
  warningThresholdMinutes: number;
  blockingThresholdMinutes: number;
  outcome: SchedulingConflictOutcome;
  message: string | null;
};

export type SchedulingConflictItem = {
  code: string;
  outcome: SchedulingConflictOutcome;
  message: string;
};

export type CaregiverMatch = {
  caregiverProfileId: string;
  caregiverDisplayName: string;
  score: number;
  outcome: SchedulingConflictOutcome;
  factors: SchedulingConflictItem[];
  travelAwareness: TravelAwareness;
  overtimeEvaluation: OvertimeEvaluation;
};

export type ScheduleMatchQuery = AuthenticatedRequestContext & {
  visitId: string;
  preferredLanguage?: string;
  enforcePatientOverlapCheck?: boolean;
  requireAvailabilityFit?: boolean;
  requiredSkillIds?: string[];
  requiredCredentialTypes?: string[];
};

export type ScheduleConflictPreviewRequest = AuthenticatedRequestContext & {
  visitId: string;
  caregiverProfileId: string;
  preferredLanguage?: string;
  enforcePatientOverlapCheck?: boolean;
  requireAvailabilityFit?: boolean;
  requiredSkillIds?: string[];
  requiredCredentialTypes?: string[];
};

export type ScheduleConflictPreview = {
  visitOccurrenceId: string;
  caregiverProfileId: string;
  outcome: SchedulingConflictOutcome;
  items: SchedulingConflictItem[];
  travelAwareness: TravelAwareness;
  overtimeEvaluation: OvertimeEvaluation;
};

export type RecurringVisitCadence = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type RecurringVisitRuleStatus = 'ACTIVE' | 'INACTIVE';

export type ScheduleRecurringVisitRule = {
  id: string;
  agencyId: string;
  patientId: string;
  branchId: string | null;
  serviceLineId: string | null;
  visitTypeId: string | null;
  cadence: RecurringVisitCadence;
  weekdays: string[];
  effectiveStart: string;
  effectiveEnd: string | null;
  plannedStartTime: string;
  plannedEndTime: string;
  timezone: string;
  priority: string | null;
  creationMode: string | null;
  notes: string | null;
  status: RecurringVisitRuleStatus;
};

export type ManageRecurringVisitRuleRequest = AuthenticatedRequestContext & {
  recurringRuleId?: string;
  patientId: string;
  branchId?: string;
  serviceLineId?: string;
  visitTypeId?: string;
  cadence: RecurringVisitCadence;
  weekdays?: string[];
  effectiveStart: string;
  effectiveEnd?: string;
  plannedStartTime: string;
  plannedEndTime: string;
  timezone: string;
  priority?: string;
  creationMode?: string;
  notes?: string;
};

export type ExpandRecurringVisitRuleRequest = AuthenticatedRequestContext & {
  recurringRuleId: string;
  windowStart: string;
  windowEnd: string;
};

export type ScheduleRescheduleRequest = AuthenticatedRequestContext & {
  visitId: string;
  newPlannedStartAt: string;
  newPlannedEndAt: string;
  timezone: string;
  branchId?: string;
  newCaregiverProfileId?: string;
  reason?: string;
};

export type ScheduleRescheduleResponse = {
  id: string;
  agencyId: string;
  visitOccurrenceId: string;
  previousCaregiverProfileId: string | null;
  newCaregiverProfileId: string | null;
  previousPlannedStartAt: string;
  previousPlannedEndAt: string;
  newPlannedStartAt: string;
  newPlannedEndAt: string;
  reason: string | null;
  rescheduledAt: string;
};

export type VisitCancellationParty = 'AGENCY' | 'CAREGIVER' | 'PATIENT' | 'SYSTEM';

export type ScheduleCancellationRequest = AuthenticatedRequestContext & {
  visitId: string;
  cancellationParty: VisitCancellationParty;
  reason?: string;
};

export type ScheduleCancellationResponse = {
  id: string;
  agencyId: string;
  visitOccurrenceId: string;
  cancellationParty: VisitCancellationParty;
  reason: string | null;
  cancelledAt: string;
};

export type WorkforceLifecycleStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'UNSCHEDULABLE'
  | 'ARCHIVED';

export type CaregiverSummary = {
  id: string;
  status: WorkforceLifecycleStatus;
  caregiverCode: string | null;
  displayName: string;
  agencyMembershipId: string;
  userId: string;
  userFullName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  branchId: string | null;
  branchName: string | null;
};

export type CaregiverDirectoryQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: WorkforceLifecycleStatus | 'ALL';
  branchId?: string;
  page?: number;
  size?: number;
};

export type CaregiverDirectoryPage = {
  content: CaregiverSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CaregiverProfile = {
  id: string;
  agencyId: string;
  agencyMembershipId: string;
  userId: string;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  membershipRole: string | null;
  status: WorkforceLifecycleStatus;
  caregiverCode: string | null;
  displayName: string;
  primaryBranchId: string | null;
  primaryBranchName: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export type CaregiverCredentialStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'ARCHIVED';

export type CaregiverCredentialVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

export type CaregiverCredential = {
  id: string;
  caregiverProfileId: string;
  certificationId: string | null;
  credentialType: string;
  licenseNumber: string | null;
  issuingAuthority: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  status: CaregiverCredentialStatus;
  verificationStatus: CaregiverCredentialVerificationStatus | null;
  notes: string | null;
};

export type ManageCaregiverProfileRecordRequest = AuthenticatedRequestContext & {
  caregiverId?: string;
  agencyMembershipId: string;
  primaryBranchId?: string;
  caregiverCode: string;
  displayName: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type ManageCaregiverCredentialRecordRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  credentialId?: string;
  certificationId?: string;
  credentialType: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuedOn: string;
  expiresOn: string;
  status: CaregiverCredentialStatus;
  verificationStatus: CaregiverCredentialVerificationStatus | '';
  notes: string;
};

export type CaregiverLanguage = {
  id: string;
  caregiverProfileId: string;
  languageCode: string;
  proficiencyLevel: string | null;
  primaryLanguage: boolean;
  status: WorkforceLifecycleStatus;
};

export type ManageCaregiverLanguageProfileRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  languageId?: string;
  languageCode: string;
  proficiencyLevel: string;
  primaryLanguage: boolean;
};

export type CaregiverSkillProfileEntry = {
  id: string;
  caregiverProfileId: string;
  skillId: string;
  skillName: string;
  skillCode: string;
  proficiencyLevel: string | null;
  verified: boolean;
  status: WorkforceLifecycleStatus;
  notes: string | null;
};

export type ManageCaregiverSkillProfileRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  skillProfileId?: string;
  skillId: string;
  proficiencyLevel: string;
  verified: boolean;
  notes: string;
};

export type CaregiverGeographyPreferenceType =
  | 'BRANCH'
  | 'POSTAL_CODE'
  | 'CITY_STATE'
  | 'RADIUS';

export type CaregiverGeographyPreference = {
  id: string;
  caregiverProfileId: string;
  branchId: string | null;
  preferenceType: CaregiverGeographyPreferenceType;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  anchorLatitude: number | null;
  anchorLongitude: number | null;
  radiusMiles: number | null;
  priorityRank: number | null;
  status: WorkforceLifecycleStatus;
  notes: string | null;
};

export type ManageCaregiverGeographyPreferenceRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  preferenceId?: string;
  branchId?: string;
  preferenceType: CaregiverGeographyPreferenceType;
  postalCode: string;
  city: string;
  state: string;
  anchorLatitude: string;
  anchorLongitude: string;
  radiusMiles: string;
  priorityRank: string;
  notes: string;
};

export type ShiftPreferenceStrength = 'PREFERRED' | 'AVAILABLE_ONLY' | 'AVOID';

export type CaregiverShiftPreference = {
  id: string;
  caregiverProfileId: string;
  dayOfWeek: string | null;
  preferredStartTime: string | null;
  preferredEndTime: string | null;
  preferredShiftLengthMinutes: number | null;
  preferredVisitTypes: string | null;
  preferenceStrength: ShiftPreferenceStrength | null;
  status: WorkforceLifecycleStatus;
  notes: string | null;
};

export type ManageCaregiverShiftPreferenceRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  shiftPreferenceId?: string;
  dayOfWeek: string;
  preferredStartTime: string;
  preferredEndTime: string;
  preferredShiftLengthMinutes: string;
  preferredVisitTypes: string;
  preferenceStrength: ShiftPreferenceStrength;
  notes: string;
};

export type CaregiverAvailabilityType = 'RECURRING' | 'DATE_SPECIFIC';

export type CaregiverAvailability = {
  id: string;
  caregiverProfileId: string;
  branchId: string | null;
  availabilityType: CaregiverAvailabilityType;
  startsAt: string | null;
  endsAt: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: WorkforceLifecycleStatus;
  notes: string | null;
};

export type ManageCaregiverAvailabilityRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  availabilityId?: string;
  branchId?: string;
  availabilityType: CaregiverAvailabilityType;
  startsAt: string;
  endsAt: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
};

export type CaregiverUnavailabilityApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CaregiverUnavailabilityReasonType =
  | 'PTO'
  | 'SICK'
  | 'TRAINING'
  | 'BLOCKED'
  | 'OTHER';

export type CaregiverUnavailability = {
  id: string;
  caregiverProfileId: string;
  reasonType: CaregiverUnavailabilityReasonType;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  approvalStatus: CaregiverUnavailabilityApprovalStatus | null;
  status: WorkforceLifecycleStatus;
  notes: string | null;
};

export type ManageCaregiverUnavailabilityRequest = AuthenticatedRequestContext & {
  caregiverId: string;
  unavailabilityId?: string;
  reasonType: CaregiverUnavailabilityReasonType;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  approvalStatus: CaregiverUnavailabilityApprovalStatus;
  notes: string;
};

export type WorkforcePerformanceIndicatorType =
  | 'COMPLETED_VISITS_COUNT'
  | 'MISSED_VISITS_COUNT'
  | 'ON_TIME_PERCENTAGE'
  | 'DOCUMENTATION_COMPLETION_PERCENTAGE'
  | 'EXCEPTION_COUNT';

export type CaregiverPerformanceSummary = {
  caregiverId: string;
  windowStart: string;
  windowEnd: string;
  profileStatus: WorkforceLifecycleStatus;
  currentlySchedulable: boolean;
  activeCredentialCount: number;
  expiringCredentialCount: number;
  activeLanguageCount: number;
  activeSkillCount: number;
  recurringAvailabilityCount: number;
  dateSpecificAvailabilityCount: number;
  activeUnavailabilityCount: number;
  unsupportedMetrics: WorkforcePerformanceIndicatorType[];
};

export type CaregiverPerformanceQuery = AuthenticatedRequestContext & {
  caregiverId: string;
  windowStart?: string;
  windowEnd?: string;
};

export type PatientLifecycleStatus = 'ACTIVE' | 'INACTIVE';

export type PatientSummary = {
  id: string;
  agencyId: string;
  status: PatientLifecycleStatus;
  externalReference: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string;
  sexMarker: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  language: string | null;
  notesSummary: string | null;
};

export type PatientDirectoryQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: PatientLifecycleStatus | 'ALL';
  page?: number;
  size?: number;
};

export type PatientDirectoryPage = {
  content: PatientSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ManagePatientRequest = AuthenticatedRequestContext & {
  externalReference: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  sexMarker: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  language: string;
  notesSummary: string;
};

export type PatientContact = {
  id: string;
  patientId: string;
  relationshipType: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: boolean;
  primaryContact: boolean;
  responsibleParty: boolean;
  notes: string | null;
  status: PatientLifecycleStatus;
};

export type ManagePatientContactRequest = AuthenticatedRequestContext & {
  relationshipType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: boolean;
  primaryContact: boolean;
  responsibleParty: boolean;
  notes: string;
};

export type PatientAddress = {
  id: string;
  patientId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeStatus: string | null;
  timezone: string | null;
  locationNotes: string | null;
};

export type ManagePatientAddressRequest = AuthenticatedRequestContext & {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  geocodeStatus: string;
  timezone: string;
  locationNotes: string;
};

export type PatientServiceEligibilityStatus =
  | 'ELIGIBLE'
  | 'INELIGIBLE'
  | 'PENDING'
  | 'EXPIRED';

export type PatientDiagnosisStatus =
  | 'ACTIVE'
  | 'RESOLVED'
  | 'HISTORICAL'
  | 'INACTIVE';

export type PatientPayerLinkStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'INACTIVE'
  | 'TERMINATED'
  | 'EXPIRED';

export type PatientEpisodeAuthorizationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'CANCELLED';

export type PatientServiceEligibility = {
  id: string;
  patientId: string;
  serviceLineId: string | null;
  status: PatientServiceEligibilityStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  verificationSource: string | null;
  notes: string | null;
};

export type ManagePatientServiceEligibilityRequest = AuthenticatedRequestContext & {
  serviceLineId?: string;
  status: PatientServiceEligibilityStatus;
  effectiveFrom: string;
  effectiveTo: string;
  verificationSource: string;
  notes: string;
};

export type PatientDiagnosis = {
  id: string;
  patientId: string;
  diagnosisCode: string | null;
  description: string;
  diagnosisType: string | null;
  primaryCondition: boolean;
  onsetDate: string | null;
  resolvedDate: string | null;
  status: PatientDiagnosisStatus;
  notes: string | null;
};

export type ManagePatientDiagnosisRequest = AuthenticatedRequestContext & {
  diagnosisCode: string;
  description: string;
  diagnosisType: string;
  primaryCondition: boolean;
  onsetDate: string;
  resolvedDate: string;
  status: PatientDiagnosisStatus;
  notes: string;
};

export type PatientPayerLink = {
  id: string;
  patientId: string;
  payerName: string | null;
  payerExternalId: string | null;
  memberPolicyNumber: string | null;
  groupNumber: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  primaryPayer: boolean;
  status: PatientPayerLinkStatus;
  notes: string | null;
};

export type ManagePatientPayerLinkRequest = AuthenticatedRequestContext & {
  payerName: string;
  payerExternalId: string;
  memberPolicyNumber: string;
  groupNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  primaryPayer: boolean;
  status: PatientPayerLinkStatus;
  notes: string;
};

export type PatientAuthorization = {
  id: string;
  patientId: string;
  patientPayerLinkId: string | null;
  serviceLineId: string | null;
  authorizationNumber: string | null;
  startDate: string;
  endDate: string;
  authorizedUnits: number | null;
  usedUnits: number | null;
  status: PatientEpisodeAuthorizationStatus;
  notes: string | null;
};

export type PatientAttachmentStatus = 'ACTIVE' | 'ARCHIVED';

export type PatientAttachment = {
  id: string;
  patientId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  uploaderMembershipId: string;
  uploaderEmail: string;
  uploadedAt: string;
  status: PatientAttachmentStatus;
  description: string | null;
};

export type UploadPatientAttachmentRequest = AuthenticatedRequestContext & {
  file: File;
  category: string;
  description: string;
};

export type UpdatePatientAttachmentMetadataRequest = AuthenticatedRequestContext & {
  category: string;
  description: string;
};

export type ManagePatientAuthorizationRequest = AuthenticatedRequestContext & {
  patientPayerLinkId?: string;
  serviceLineId?: string;
  authorizationNumber: string;
  startDate: string;
  endDate: string;
  authorizedUnits?: number;
  usedUnits?: number;
  status: PatientEpisodeAuthorizationStatus;
  notes: string;
};

export type BranchSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type SelfProfileResponse = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredLanguage: string | null;
  timeZone: string | null;
};

export type UpdateSelfProfileRequest = AuthenticatedRequestContext & {
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: string;
  timeZone: string;
};

export type UserStatusResponse = {
  userId: string;
  status: UserStatus;
  sessionRevocationTriggered: boolean;
};

export type ChangeUserStatusRequest = AuthenticatedRequestContext & {
  userId: string;
  status: UserStatus;
};

export type AuditEventOutcome = 'SUCCESS' | 'FAILURE';

export type AuditEventEntry = {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  actorEmail: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  agencyId: string | null;
  branchId: string | null;
  outcome: AuditEventOutcome;
  metadataJson: string | null;
};

export type AuditEventPage = {
  content: AuditEventEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AuditEventQuery = AuthenticatedRequestContext & {
  from?: string;
  to?: string;
  actorId?: string;
  actionType?: string;
  targetUserId?: string;
  page?: number;
  size?: number;
};

export type AgencySettingsResponse = {
  agencyId: string;
  name: string;
  slug: string;
  timezone: string;
  contactEmail: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type ConfigurationStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type ConfigurationPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgencyProfileResponse = {
  id: string;
  agencyId: string;
  displayName: string | null;
  legalName: string | null;
  primaryPhone: string | null;
  primaryAddress: string | null;
  operationsContactName: string | null;
  operationsContactEmail: string | null;
  supportContactName: string | null;
  supportContactEmail: string | null;
  defaultTimezone: string;
  defaultLocale: string;
  status: ConfigurationStatus;
};

export type UpdateAgencyProfileRequest = AuthenticatedRequestContext & {
  displayName: string;
  legalName: string;
  primaryPhone: string;
  primaryAddress: string;
  operationsContactName: string;
  operationsContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  defaultTimezone: string;
  defaultLocale: string;
};

export type ServiceLineSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type ServiceLineQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageServiceLineRequest = AuthenticatedRequestContext & {
  serviceLineId?: string;
  name: string;
  code: string;
  description: string;
  displayOrder: number;
};

export type VisitTypeSummary = {
  id: string;
  agencyId: string;
  serviceLineId: string | null;
  name: string;
  code: string;
  description: string | null;
  defaultDurationMinutes: number;
  billable: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type VisitTypeQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  serviceLineId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type ManageVisitTypeRequest = AuthenticatedRequestContext & {
  visitTypeId?: string;
  serviceLineId?: string;
  name: string;
  code: string;
  description: string;
  defaultDurationMinutes: number;
  billable: boolean;
  displayOrder: number;
};

export type CaregiverSkillSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  status: ConfigurationStatus;
};

export type CaregiverCertificationSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  expirationRequired: boolean;
  status: ConfigurationStatus;
};

export type WorkforceCatalogQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageCaregiverSkillRequest = AuthenticatedRequestContext & {
  skillId?: string;
  name: string;
  code: string;
  description: string;
};

export type ManageCaregiverCertificationRequest = AuthenticatedRequestContext & {
  certificationId?: string;
  name: string;
  code: string;
  description: string;
  expirationRequired: boolean;
};

export type TaskTemplateCategory =
  | 'OPERATIONAL'
  | 'CLINICAL'
  | 'COMPLIANCE'
  | 'ADMINISTRATIVE';

export type DocumentationTemplateType =
  | 'VISIT_NOTE'
  | 'ASSESSMENT'
  | 'CARE_PLAN'
  | 'CUSTOM_FORM';

export type AlertRuleType =
  | 'MISSED_VISIT'
  | 'LATE_ARRIVAL'
  | 'DOCUMENTATION_OVERDUE'
  | 'CREDENTIAL_EXPIRING'
  | 'CUSTOM_THRESHOLD';

export type MileageReimbursementStrategy = 'NONE' | 'STANDARD_RATE' | 'CUSTOM_RATE';

export type TaskTemplateSummary = {
  id: string;
  agencyId: string;
  serviceLineId: string | null;
  visitTypeId: string | null;
  name: string;
  code: string;
  description: string | null;
  category: TaskTemplateCategory | null;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type TaskTemplateQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  category?: TaskTemplateCategory | 'ALL';
  serviceLineId?: string | 'ALL';
  visitTypeId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type ManageTaskTemplateRequest = AuthenticatedRequestContext & {
  taskTemplateId?: string;
  serviceLineId?: string;
  visitTypeId?: string;
  name: string;
  code: string;
  description: string;
  category?: TaskTemplateCategory;
  displayOrder: number;
};

export type DocumentationTemplateSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  templateType: DocumentationTemplateType | null;
  structuredDefinitionJson: string;
  version: number;
  status: ConfigurationStatus;
  displayOrder: number;
  serviceLineId?: string | null;
  visitTypeId?: string | null;
  branchId?: string | null;
  helpText?: string | null;
  allowedActorRoles?: AgencyRole[];
  requiresSignatureVerification?: boolean;
};

export type DocumentationTemplateQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  templateType?: DocumentationTemplateType | 'ALL';
  page?: number;
  size?: number;
};

export type ManageDocumentationTemplateRequest = AuthenticatedRequestContext & {
  templateId?: string;
  name: string;
  code: string;
  templateType?: DocumentationTemplateType;
  structuredDefinitionJson: string;
  displayOrder: number;
  serviceLineId?: string | null;
  visitTypeId?: string | null;
  branchId?: string | null;
  helpText?: string | null;
  allowedActorRoles?: AgencyRole[];
  requiresSignatureVerification?: boolean;
  sections?: DocumentationSectionRequest[];
  fields?: DocumentationFieldDefinitionRequest[];
  tasks?: DocumentationTemplateTaskRequest[];
};

export type DocumentationRecordStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AMENDED'
  | 'LOCKED';

export type DocumentationResponseState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type DocumentationFieldType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'DATE_TIME'
  | 'SELECT_CODED_VALUE'
  | 'FREE_TEXT_BLOCK';

export type DocumentationSectionRequest = {
  sectionKey: string;
  title: string;
  helpText?: string | null;
  sortOrder: number;
};

export type DocumentationFieldDefinitionRequest = {
  sectionKey?: string | null;
  fieldKey: string;
  label: string;
  fieldType: DocumentationFieldType;
  requiredField: boolean;
  sortOrder: number;
  optionsJson?: string | null;
  helpText?: string | null;
  visibleActorRoles?: AgencyRole[];
  editableActorRoles?: AgencyRole[];
};

export type DocumentationTemplateTaskRequest = {
  sectionKey?: string | null;
  taskTemplateId?: string | null;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  requiredOverride?: boolean | null;
  sortOrder: number;
};

export type DocumentationSection = {
  id: string;
  sectionKey: string;
  title: string;
  helpText: string | null;
  sortOrder: number;
};

export type DocumentationFieldDefinition = {
  id: string;
  documentationTemplateId: string;
  sectionId: string | null;
  fieldKey: string;
  label: string;
  fieldType: DocumentationFieldType;
  requiredField: boolean;
  sortOrder: number;
  optionsJson: string | null;
  helpText: string | null;
  visibleActorRoles: AgencyRole[];
  editableActorRoles: AgencyRole[];
};

export type DocumentationTemplateTaskDefinition = {
  id: string;
  documentationTemplateId: string;
  sectionId: string | null;
  taskTemplateId: string | null;
  effectiveTitle: string;
  effectiveDescription: string | null;
  effectiveRequired: boolean;
  sortOrder: number;
};

export type DocumentationTemplateAggregate = {
  template: DocumentationTemplateSummary;
  sections: DocumentationSection[];
  fields: DocumentationFieldDefinition[];
  tasks: DocumentationTemplateTaskDefinition[];
};

export type DocumentationTaskLibraryItem = {
  id: string;
  agencyId: string;
  serviceLineId: string | null;
  visitTypeId: string | null;
  name: string;
  code: string;
  description: string | null;
  category: TaskTemplateCategory | null;
  status: ConfigurationStatus;
  displayOrder: number;
  defaultSortOrder: number;
  defaultCompletionExpectation: string | null;
  requiredByDefault: boolean;
};

export type DocumentationTaskLibraryQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  category?: TaskTemplateCategory | 'ALL';
  serviceLineId?: string | 'ALL';
  visitTypeId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type ManageDocumentationTaskLibraryItemRequest = AuthenticatedRequestContext & {
  taskTemplateId?: string;
  serviceLineId?: string | null;
  visitTypeId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  category: TaskTemplateCategory;
  displayOrder: number;
  defaultSortOrder: number;
  defaultCompletionExpectation?: string | null;
  requiredByDefault: boolean;
};

export type VisitDocumentationSummary = {
  id: string;
  visitOccurrenceId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  branchId: string;
  branchName: string;
  templateId: string;
  templateName: string;
  status: DocumentationRecordStatus;
  lastSavedAt: string;
  submittedAt: string | null;
  authorMembershipId: string;
  authorEmail: string;
};

export type VisitDocumentationQuery = AuthenticatedRequestContext & {
  from?: string;
  to?: string;
  branchId?: string | 'ALL';
  caregiverMembershipId?: string | 'ALL';
  patientId?: string | 'ALL';
  status?: DocumentationRecordStatus | 'ALL';
  templateId?: string | 'ALL';
  visitTypeId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type VisitDocumentationRecord = {
  id: string;
  visitOccurrenceId: string;
  patientId: string;
  branchId: string;
  selectedTemplateId: string;
  authorMembershipId: string;
  lastEditorMembershipId: string;
  status: DocumentationRecordStatus;
  startedAt: string | null;
  submittedAt: string | null;
  lastSavedAt: string;
  printableSummaryVersion: number;
};

export type VisitDocumentationFieldResponse = {
  id: string;
  templateFieldId: string;
  fieldKey: string;
  normalizedValue: string | null;
  displayValue: string | null;
  responseNotes: string | null;
  completionState: DocumentationResponseState;
  completedAt: string | null;
};

export type VisitDocumentationTaskResponse = {
  id: string;
  templateTaskId: string;
  taskTitle: string;
  taskDescription: string | null;
  completionRequired: boolean;
  completionState: DocumentationResponseState;
  completionNotes: string | null;
  completedAt: string | null;
  sortOrder: number;
};

export type VisitDocumentationAttachmentLink = {
  id: string;
  documentationRecordId: string;
  patientAttachmentId: string | null;
  mobileArtifactId: string | null;
  caption: string | null;
  description: string | null;
  linkedAt: string;
};

export type VisitDocumentationAggregate = {
  record: VisitDocumentationRecord;
  fieldResponses: VisitDocumentationFieldResponse[];
  taskResponses: VisitDocumentationTaskResponse[];
  attachmentLinks: VisitDocumentationAttachmentLink[];
};

export type SaveVisitDocumentationDraftRequest = AuthenticatedRequestContext & {
  documentationRecordId: string;
  fieldResponses: Array<{
    templateFieldId: string;
    normalizedValue?: string | null;
    displayValue?: string | null;
    responseNotes?: string | null;
    completionState?: DocumentationResponseState | null;
    completedAt?: string | null;
  }>;
  taskResponses: Array<{
    templateTaskId: string;
    completionState?: DocumentationResponseState | null;
    completionNotes?: string | null;
    completedAt?: string | null;
  }>;
  savedAt?: string | null;
};

export type PrintableDocumentationHeader = {
  patientDisplayName: string;
  visitStartAt: string | null;
  visitEndAt: string | null;
  branchName: string | null;
  authorDisplayName: string | null;
  submittedAt: string | null;
};

export type PrintableDocumentationField = {
  fieldKey: string;
  label: string;
  displayValue: string;
};

export type PrintableDocumentationTask = {
  taskTitle: string;
  completionState: DocumentationResponseState;
  completionNotes: string | null;
};

export type PrintableDocumentationAttachment = {
  attachmentLabel: string;
  caption: string | null;
  description: string | null;
};

export type PrintableDocumentationSummary = {
  documentationRecordId: string;
  templateTitle: string;
  status: DocumentationRecordStatus;
  header: PrintableDocumentationHeader;
  fields: PrintableDocumentationField[];
  tasks: PrintableDocumentationTask[];
  attachments: PrintableDocumentationAttachment[];
};

export type BranchPolicySummary = {
  id: string;
  agencyId: string;
  branchId: string | null;
  policyKey: string;
  settingsPayloadJson: string | null;
  effectiveSettingsPayloadJson: string | null;
  fallbackToAgencyDefault: boolean;
  usesAgencyDefault: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type BranchPolicyQuery = AuthenticatedRequestContext & {
  branchId?: string | 'ALL';
  policyKey?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageBranchPolicyRequest = AuthenticatedRequestContext & {
  branchPolicyId?: string;
  branchId?: string;
  policyKey: string;
  settingsPayloadJson: string;
  fallbackToAgencyDefault: boolean;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo: string;
};

export type AlertRuleSummary = {
  id: string;
  agencyId: string;
  branchId: string | null;
  name: string;
  ruleType: AlertRuleType | null;
  configPayloadJson: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
  branchSpecific: boolean;
};

export type AlertRuleQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  branchId?: string | 'ALL';
  ruleType?: AlertRuleType | 'ALL';
  page?: number;
  size?: number;
};

export type ManageAlertRuleRequest = AuthenticatedRequestContext & {
  alertRuleId?: string;
  branchId?: string;
  name: string;
  ruleType?: AlertRuleType;
  configPayloadJson: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  displayOrder: number;
};

export type MileagePaySettingScope = {
  id: string;
  agencyId: string;
  branchId: string | null;
  reimbursementStrategy: MileageReimbursementStrategy;
  mileageRate: number;
  travelPayEnabled: boolean;
  visitTypePayAdjustmentsJson: string | null;
  status: ConfigurationStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  effectiveAtRequestedTime: boolean;
  branchOverride: boolean;
};

export type MileagePaySettingsResponse = {
  agencyId: string;
  effectiveAt: string;
  agencyDefault: MileagePaySettingScope | null;
  branchOverrides: MileagePaySettingScope[];
};

export type ManageMileagePaySettingRequest = AuthenticatedRequestContext & {
  branchId?: string;
  reimbursementStrategy: MileageReimbursementStrategy;
  mileageRate: number;
  travelPayEnabled: boolean;
  visitTypePayAdjustmentsJson: string;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo: string;
};

export type UpdateAgencySettingsRequest = AuthenticatedRequestContext & {
  name: string;
  timezone: string;
  contactEmail: string;
};

export type CreateBranchRequest = AuthenticatedRequestContext & {
  agencyId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
};

export type UpdateBranchRequest = AuthenticatedRequestContext & {
  branchId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
};

export type UserDirectoryEntry = {
  userId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  userStatus: UserStatus;
  role: AgencyRole;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  branchNames: string[];
};

export type UserDirectoryPage = {
  content: UserDirectoryEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type UserDirectoryQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: UserStatus | 'ALL';
  role?: AgencyRole | 'ALL';
  branchId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type InviteUserRequest = AuthenticatedRequestContext & {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

export type InvitationResponse = {
  invitationId: string;
  agencyId: string;
  membershipId: string;
  userId: string;
  email: string;
  role: AgencyRole;
  expiresAt: string;
  branchIds: string[];
  branchNames: string[];
};

export type InvitationDetailsResponse = {
  invitationId: string;
  agencyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AgencyRole;
  expiresAt: string;
  branchIds: string[];
  branchNames: string[];
};

export type AcceptInvitationRequest = {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
};

export type AcceptedInvitationResponse = {
  invitationId: string;
  userId: string;
  membershipId: string;
  agencyId: string;
};

export type UpdateUserRequest = AuthenticatedRequestContext & {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

export type UpdatedUserResponse = {
  userId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AgencyRole;
  branchIds: string[];
  branchNames: string[];
};

export type AgencyMfaPolicyResponse = {
  agencyId: string;
  mode: AgencyMfaPolicyMode;
  requiredRoles: AgencyRole[];
};

export type UpdateAgencyMfaPolicyRequest = AuthenticatedRequestContext & {
  mode: AgencyMfaPolicyMode;
  requiredRoles: AgencyRole[];
};

export type AdminNotificationPreferencesResponse = {
  membershipId: string;
  emailEnabled: boolean;
  failedLoginAlertsEnabled: boolean;
  lockedAccountAlertsEnabled: boolean;
  newAdminAlertsEnabled: boolean;
};

export type UpdateAdminNotificationPreferencesRequest = AuthenticatedRequestContext & {
  emailEnabled: boolean;
  failedLoginAlertsEnabled: boolean;
  lockedAccountAlertsEnabled: boolean;
  newAdminAlertsEnabled: boolean;
};

export type UserSessionSummary = {
  sessionId: string;
  current: boolean;
  active: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  absoluteExpiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
};

export type RevokeSessionResponse = {
  sessionId: string;
  revoked: boolean;
  revocationReason: string | null;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function apiUrl(path: string): string {
  const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!configuredBase) {
    return path;
  }
  return `${configuredBase.replace(/\/$/, '')}${path}`;
}

function buildAuthenticatedHeaders(
  request: AuthenticatedRequestContext,
  contentType?: 'application/json',
): Headers {
  const headers = new Headers();

  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  return headers;
}

function appendOptionalSearchParams(
  url: URL,
  values: Record<string, string | number | null | undefined>,
) {
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });
}

export async function fetchSessionSnapshot(
  devSession: DevSessionCredentials | null,
): Promise<SessionBootstrapResult> {
  const headers = new Headers();

  if (devSession?.accessToken) {
    headers.set('Authorization', `Bearer ${devSession.accessToken}`);
  }

  if (devSession?.sessionId) {
    headers.set('X-Session-Id', devSession.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    return { kind: 'unauthenticated' };
  }

  if (!response.ok) {
    throw new Error(`Session bootstrap failed with status ${response.status}`);
  }

  const snapshot = (await response.json()) as SessionSnapshot;
  return {
    kind: 'authenticated',
    snapshot,
    authSource: devSession ? 'storage' : 'cookie',
  };
}

export async function fetchMobileHome(
  request: MobileDayQuery,
): Promise<MobileHomeResponse> {
  const url = new URL(apiUrl('/api/mobile/home'), window.location.origin);
  appendOptionalSearchParams(url, {
    day: request.day,
    timezone: request.timezone,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileHomeResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mobile home request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as MobileHomeResponse;
}

export async function fetchMobileRoute(
  request: MobileDayQuery,
): Promise<MobileRouteProjectionResponse> {
  const url = new URL(apiUrl('/api/mobile/route'), window.location.origin);
  appendOptionalSearchParams(url, {
    day: request.day,
    timezone: request.timezone,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileRouteProjectionResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mobile route request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileRouteProjectionResponse;
}

export async function fetchMobileVisitDetail(
  request: MobileVisitDetailQuery,
): Promise<MobileVisitDetailResponse> {
  const response = await fetch(apiUrl(`/api/mobile/visits/${request.visitId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileVisitDetailResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mobile visit detail failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitDetailResponse;
}

export async function fetchOwnMobileEvvSummary(
  request: MobileVisitDetailQuery,
): Promise<MobileEvvSummaryResponse> {
  const response = await fetch(apiUrl(`/api/evv/my/visits/${request.visitId}/summary`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvSummaryResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Mobile EVV summary failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvSummaryResponse;
}

export async function fetchEvvReadiness(
  request: FetchEvvReadinessQuery,
): Promise<MobileEvvSummaryResponse[]> {
  const url = new URL(apiUrl('/api/evv/readiness'), window.location.origin);
  appendOptionalSearchParams(url, {
    day: request.day,
    branchId: request.branchId,
    verificationStatus: request.verificationStatus,
    complianceOutcome: request.complianceOutcome,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvSummaryResponse[]
    | null;

  if (!response.ok) {
    const message =
      payload &&
      !Array.isArray(payload) &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV readiness failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvSummaryResponse[];
}

export async function recordMobileEvvClockIn(
  request: RecordMobileEvvClockEventRequest,
): Promise<MobileEvvClockEventResponse> {
  const response = await fetch(apiUrl(`/api/evv/visits/${request.visitId}/clock-in`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      executionSessionId: request.executionSessionId ?? null,
      capturedAt: request.capturedAt,
      capturedLatitude: request.capturedLatitude ?? null,
      capturedLongitude: request.capturedLongitude ?? null,
      timezone: request.timezone,
      captureSource: request.captureSource,
      platformSummary: request.platformSummary ?? null,
      appVersion: request.appVersion ?? null,
      deviceClass: request.deviceClass ?? null,
      timezoneOffsetMinutes: request.timezoneOffsetMinutes ?? null,
      userAgentHash: request.userAgentHash ?? null,
      sessionFingerprintHash: request.sessionFingerprintHash ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvClockEventResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV clock-in failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvClockEventResponse;
}

export async function recordMobileEvvClockOut(
  request: RecordMobileEvvClockEventRequest,
): Promise<MobileEvvClockEventResponse> {
  const response = await fetch(apiUrl(`/api/evv/visits/${request.visitId}/clock-out`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      executionSessionId: request.executionSessionId ?? null,
      capturedAt: request.capturedAt,
      capturedLatitude: request.capturedLatitude ?? null,
      capturedLongitude: request.capturedLongitude ?? null,
      timezone: request.timezone,
      captureSource: request.captureSource,
      platformSummary: request.platformSummary ?? null,
      appVersion: request.appVersion ?? null,
      deviceClass: request.deviceClass ?? null,
      timezoneOffsetMinutes: request.timezoneOffsetMinutes ?? null,
      userAgentHash: request.userAgentHash ?? null,
      sessionFingerprintHash: request.sessionFingerprintHash ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvClockEventResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV clock-out failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvClockEventResponse;
}

export async function recordMobileEvvSignature(
  request: RecordMobileEvvSignatureRequest,
): Promise<MobileEvvSignatureResponse> {
  const response = await fetch(
    apiUrl(`/api/evv/verification-sessions/${request.verificationSessionId}/signatures`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        artifactId: request.artifactId ?? null,
        signerRole: request.signerRole,
        verificationStatus: request.verificationStatus,
        recordedAt: request.recordedAt,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvSignatureResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV signature save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvSignatureResponse;
}

export async function reportMobileMissedVisit(
  request: ReportMobileMissedVisitRequest,
): Promise<MobileMissedVisitResponse> {
  const response = await fetch(apiUrl(`/api/evv/visits/${request.visitId}/missed-visits`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reasonCode: request.reasonCode,
      narrative: request.narrative,
      reportedAt: request.reportedAt,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileMissedVisitResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Missed visit report failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileMissedVisitResponse;
}

export async function createMobileVisitException(
  request: CreateMobileVisitExceptionRequest,
): Promise<MobileVisitExceptionResponse> {
  const response = await fetch(
    apiUrl(`/api/evv/verification-sessions/${request.verificationSessionId}/exceptions`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        exceptionType: request.exceptionType,
        severity: request.severity,
        reasonCode: request.reasonCode,
        narrative: request.narrative,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileVisitExceptionResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV exception save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitExceptionResponse;
}

export async function fetchMobileVisitExceptions(
  request: ListMobileVisitExceptionsQuery,
): Promise<MobileVisitExceptionResponse[]> {
  const url = new URL(apiUrl('/api/evv/exceptions'), window.location.origin);
  appendOptionalSearchParams(url, {
    visitId: request.visitId,
    status: request.status,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileVisitExceptionResponse[]
    | null;

  if (!response.ok) {
    const message =
      payload &&
      !Array.isArray(payload) &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV exceptions failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitExceptionResponse[];
}

export async function updateMobileVisitExceptionStatus(
  request: UpdateMobileVisitExceptionStatusRequest,
): Promise<MobileVisitExceptionResponse> {
  const response = await fetch(apiUrl(`/api/evv/exceptions/${request.exceptionId}/status`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      status: request.status,
      actedAt: request.actedAt,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileVisitExceptionResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `EVV exception update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitExceptionResponse;
}

export async function notifySupervisorForMobileMissedVisit(
  missedVisitId: string,
  request: NotifyMobileEvvSupervisorRequest,
): Promise<MobileEvvNotificationResponse> {
  const response = await fetch(
    apiUrl(`/api/evv/missed-visits/${missedVisitId}/notify-supervisor`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        recipientMembershipId: request.recipientMembershipId,
        channel: request.channel,
        rationale: request.rationale,
        createdAt: request.createdAt,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvNotificationResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Supervisor notification failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvNotificationResponse;
}

export async function notifySupervisorForMobileException(
  exceptionId: string,
  request: NotifyMobileEvvSupervisorRequest,
): Promise<MobileEvvNotificationResponse> {
  const response = await fetch(
    apiUrl(`/api/evv/exceptions/${exceptionId}/notify-supervisor`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        recipientMembershipId: request.recipientMembershipId,
        channel: request.channel,
        rationale: request.rationale,
        createdAt: request.createdAt,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvNotificationResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Exception notification failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvNotificationResponse;
}

export async function createMobileMissedVisitEscalation(
  missedVisitId: string,
  request: CreateMobileEvvEscalationRequest,
): Promise<MobileEvvEscalationResponse> {
  const response = await fetch(apiUrl(`/api/evv/missed-visits/${missedVisitId}/escalations`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      targetRoleKey: request.targetRoleKey,
      severity: request.severity,
      rationale: request.rationale,
      slaDueAt: request.slaDueAt ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvEscalationResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Missed visit escalation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvEscalationResponse;
}

export async function createMobileExceptionEscalation(
  exceptionId: string,
  request: CreateMobileEvvEscalationRequest,
): Promise<MobileEvvEscalationResponse> {
  const response = await fetch(apiUrl(`/api/evv/exceptions/${exceptionId}/escalations`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      targetRoleKey: request.targetRoleKey,
      severity: request.severity,
      rationale: request.rationale,
      slaDueAt: request.slaDueAt ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | MobileEvvEscalationResponse
    | null;

  if (!response.ok) {
    const message =
      payload &&
      (('error' in payload && payload.error) || ('message' in payload && payload.message))
        ? ('error' in payload ? payload.error : payload.message)!
        : `Exception escalation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileEvvEscalationResponse;
}

export async function startMobileVisitExecution(
  request: StartMobileVisitExecutionRequest,
): Promise<MobileVisitExecutionSession> {
  const response = await fetch(apiUrl(`/api/mobile/visits/${request.visitId}/execution/start`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      startedAt: request.startedAt,
      startedLatitude: request.startedLatitude,
      startedLongitude: request.startedLongitude,
      startSource: request.startSource,
      syncStatus: request.syncStatus,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileVisitExecutionSession
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Start visit failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitExecutionSession;
}

export async function endMobileVisitExecution(
  request: EndMobileVisitExecutionRequest,
): Promise<MobileVisitExecutionSession> {
  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/end`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        endedAt: request.endedAt,
        endedLatitude: request.endedLatitude,
        endedLongitude: request.endedLongitude,
        endSource: request.endSource,
        syncStatus: request.syncStatus,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileVisitExecutionSession
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `End visit failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileVisitExecutionSession;
}

export async function saveMobileTaskChecklist(
  request: SaveMobileTaskChecklistRequest,
): Promise<MobileTaskChecklistItem[]> {
  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/task-checklist`),
    {
      method: 'PUT',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify(
        request.items.map((item) => ({
          taskTemplateId: item.taskTemplateId || null,
          title: item.title,
          description: item.description || null,
          category: item.category || null,
          sortOrder: item.sortOrder,
          completed: item.completed,
          completedAt: item.completedAt || null,
          completionNotes: item.completionNotes || null,
        })),
      ),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileTaskChecklistItem[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Task checklist save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileTaskChecklistItem[];
}

export async function saveMobileQuickNote(
  request: SaveMobileQuickNoteRequest,
): Promise<MobileQuickNote> {
  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/quick-notes`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        status: request.status,
        noteText: request.noteText,
        authoredAt: request.authoredAt || null,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileQuickNote
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Quick note save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileQuickNote;
}

export async function uploadMobileFieldArtifact(
  request: UploadMobileFieldArtifactRequest,
): Promise<MobileFieldArtifact> {
  const formData = new FormData();
  formData.set('artifactType', request.artifactType);
  formData.set('file', request.file);
  if (request.description.trim()) {
    formData.set('description', request.description.trim());
  }

  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/artifacts`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
      body: formData,
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileFieldArtifact
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Artifact upload failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileFieldArtifact;
}

export async function downloadMobileFieldArtifact(
  artifactId: string,
  request: AuthenticatedRequestContext,
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await fetch(apiUrl(`/api/mobile/artifacts/${artifactId}/download`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? `Mobile artifact download failed with status ${response.status}`,
    );
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  const fileNameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : null,
  };
}

export async function createMobileIncident(
  request: CreateMobileIncidentRequest,
): Promise<MobileIncident> {
  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/incidents`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        incidentType: request.incidentType,
        severity: request.severity || null,
        narrative: request.narrative,
        reportedAt: request.reportedAt || null,
        escalationHook: request.escalationHook || null,
        artifactIds: request.artifactIds?.length ? request.artifactIds : [],
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileIncident
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Incident save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileIncident;
}

export async function fetchMobileMessageThreads(
  request: AuthenticatedRequestContext,
): Promise<MobileMessageThreadSummary[]> {
  const response = await fetch(apiUrl('/api/mobile/messages/threads'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileMessageThreadSummary[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Message thread request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileMessageThreadSummary[];
}

export async function fetchMobileMessageThread(
  threadId: string,
  request: AuthenticatedRequestContext,
): Promise<MobileMessageThreadDetail> {
  const response = await fetch(apiUrl(`/api/mobile/messages/threads/${threadId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileMessageThreadDetail
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Message thread detail failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileMessageThreadDetail;
}

export async function createMobileMessageThread(
  request: CreateMobileMessageThreadRequest,
): Promise<MobileMessageThread> {
  const response = await fetch(
    apiUrl(`/api/mobile/execution-sessions/${request.executionSessionId}/messages/threads`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        subject: request.subject,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileMessageThread
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Message thread create failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileMessageThread;
}

export async function sendMobileMessage(
  request: SendMobileMessageRequest,
): Promise<MobileMessageEntry> {
  const response = await fetch(apiUrl(`/api/mobile/messages/threads/${request.threadId}/messages`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      messageText: request.messageText,
      sentAt: request.sentAt || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MobileMessageEntry
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Message send failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MobileMessageEntry;
}

export async function loginWithPassword(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | LoginResponse | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Login failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as LoginResponse;
}

export async function completeMfaChallenge(
  request: MfaChallengeRequest,
): Promise<MfaChallengeResponse> {
  const response = await fetch(apiUrl('/api/auth/login/mfa'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaChallengeResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA challenge failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaChallengeResponse;
}

export async function logoutCurrentSession(request: LogoutRequest): Promise<LogoutResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.refreshToken) {
    headers.set('X-Refresh-Token', request.refreshToken);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const logoutUrl = new URL(apiUrl('/api/auth/logout'), window.location.origin);
  if (request.redirectTo) {
    logoutUrl.searchParams.set('redirectTo', request.redirectTo);
  }

  const response = await fetch(logoutUrl.toString(), {
    method: 'POST',
    credentials: 'include',
    headers,
    redirect: 'manual',
  });

  if (response.status === 401) {
    return {
      redirectTo: request.redirectTo ?? '/login',
    };
  }

  if (response.status === 0 || response.status === 302) {
    return {
      redirectTo: response.headers.get('Location') ?? request.redirectTo ?? '/login',
    };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? `Logout failed with status ${response.status}`,
    );
  }

  return {
    redirectTo: response.headers.get('Location') ?? request.redirectTo ?? '/login',
  };
}

export async function refreshAuthenticatedSession(
  request: RefreshSessionRequest,
): Promise<RefreshSessionResponse> {
  const headers = new Headers();

  if (request.refreshToken) {
    headers.set('X-Refresh-Token', request.refreshToken);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | RefreshSessionResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Session refresh failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as RefreshSessionResponse;
}

export async function requestPasswordReset(
  request: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  const response = await fetch(apiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ForgotPasswordResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Forgot password request failed with status ${response.status}`,
    );
  }

  return payload as ForgotPasswordResponse;
}

export async function fetchPasswordPolicy(): Promise<PasswordPolicyResponse> {
  const response = await fetch(apiUrl('/api/auth/password-policy'), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PasswordPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Password policy request failed with status ${response.status}`;
    throw new ApiError(
      response.status,
      message,
    );
  }

  return payload as PasswordPolicyResponse;
}

export async function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const response = await fetch(apiUrl('/api/auth/reset-password'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ResetPasswordResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Reset password failed with status ${response.status}`,
    );
  }

  return payload as ResetPasswordResponse;
}

export async function changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/change-password'), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      currentPassword: request.currentPassword,
      newPassword: request.newPassword,
      invalidateOtherSessions: request.invalidateOtherSessions,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ChangePasswordResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Change password failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ChangePasswordResponse;
}

export async function fetchMfaStatus(
  request: AuthenticatedRequestContext,
): Promise<MfaStatusResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/mfa/status'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaStatusResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA status request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaStatusResponse;
}

export async function startMfaEnrollment(
  request: MfaEnrollmentStartRequest,
): Promise<MfaEnrollmentStartResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/mfa/enrollment/start'), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      currentPassword: request.currentPassword,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaEnrollmentStartResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA enrollment start failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaEnrollmentStartResponse;
}

export async function confirmMfaEnrollment(
  request: MfaEnrollmentConfirmRequest,
): Promise<MfaEnrollmentConfirmResponse> {
  const response = await fetch(apiUrl('/api/auth/mfa/enrollment/confirm'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaEnrollmentConfirmResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA enrollment confirmation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaEnrollmentConfirmResponse;
}

export async function fetchAgencyMfaPolicy(
  request: AuthenticatedRequestContext,
): Promise<AgencyMfaPolicyResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/mfa-policy'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyMfaPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency MFA policy request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencyMfaPolicyResponse;
}

export async function updateAgencyMfaPolicy(
  request: UpdateAgencyMfaPolicyRequest,
): Promise<AgencyMfaPolicyResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/mfa-policy'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      mode: request.mode,
      requiredRoles: request.requiredRoles,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyMfaPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency MFA policy update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencyMfaPolicyResponse;
}

export async function fetchAdminNotificationPreferences(
  request: AuthenticatedRequestContext,
): Promise<AdminNotificationPreferencesResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/admin-notifications'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AdminNotificationPreferencesResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Admin notification preferences request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AdminNotificationPreferencesResponse;
}

export async function updateAdminNotificationPreferences(
  request: UpdateAdminNotificationPreferencesRequest,
): Promise<AdminNotificationPreferencesResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/admin-notifications'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      emailEnabled: request.emailEnabled,
      failedLoginAlertsEnabled: request.failedLoginAlertsEnabled,
      lockedAccountAlertsEnabled: request.lockedAccountAlertsEnabled,
      newAdminAlertsEnabled: request.newAdminAlertsEnabled,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AdminNotificationPreferencesResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Admin notification preferences update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AdminNotificationPreferencesResponse;
}

export async function fetchUserSessions(
  request: AuthenticatedRequestContext,
): Promise<UserSessionSummary[]> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/sessions'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserSessionSummary[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Session list request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserSessionSummary[];
}

export async function revokeUserSession(
  request: AuthenticatedRequestContext & { targetSessionId: string },
): Promise<RevokeSessionResponse> {
  const headers = buildAuthenticatedHeaders(request);

  const response = await fetch(apiUrl(`/api/auth/sessions/${request.targetSessionId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | RevokeSessionResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Session revocation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as RevokeSessionResponse;
}

export async function fetchCurrentAccess(
  request: AuthenticatedRequestContext,
): Promise<CurrentAccessResponse> {
  const response = await fetch(apiUrl('/api/me/access'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CurrentAccessResponse
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Current access request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CurrentAccessResponse;
}

export async function fetchScheduleBoard(
  request: ScheduleBoardQuery,
): Promise<ScheduleBoardResponse> {
  const boardUrl = new URL(apiUrl('/api/schedule-board'), window.location.origin);
  appendOptionalSearchParams(boardUrl, {
    view: request.view,
    date: request.date,
    branchId: request.branchId,
    caregiverId: request.caregiverId,
    patientId: request.patientId,
    status: request.status,
    openShiftsOnly: request.openShiftsOnly ? 'true' : undefined,
  });

  const response = await fetch(boardUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleBoardResponse
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Schedule board request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleBoardResponse;
}

export async function fetchScheduleVisit(
  visitId: string,
  request: AuthenticatedRequestContext,
): Promise<ScheduleVisitDetail> {
  const response = await fetch(apiUrl(`/api/schedule-visits/${visitId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleVisitDetail
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Scheduled visit request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleVisitDetail;
}

export async function fetchScheduleVisits(
  request: ScheduleVisitQuery,
): Promise<ScheduleVisitPage> {
  const visitsUrl = new URL(apiUrl('/api/schedule-visits'), window.location.origin);
  appendOptionalSearchParams(visitsUrl, {
    status: request.status === 'ALL' ? undefined : request.status,
    branchId: request.branchId,
    caregiverId: request.caregiverId,
    patientId: request.patientId,
    page: request.page,
    size: request.size,
  });

  const response = await fetch(visitsUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleVisitPage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Schedule visits request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleVisitPage;
}

export async function saveScheduleVisit(
  request: ManageScheduleVisitRequest,
): Promise<ScheduleVisitDetail> {
  const path = request.visitId ? `/api/schedule-visits/${request.visitId}` : '/api/schedule-visits';
  const response = await fetch(apiUrl(path), {
    method: request.visitId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      patientId: request.patientId,
      branchId: request.branchId || null,
      serviceLineId: request.serviceLineId || null,
      visitTypeId: request.visitTypeId || null,
      plannedStartAt: request.plannedStartAt,
      plannedEndAt: request.plannedEndAt,
      timezone: request.timezone,
      priority: request.priority || null,
      creationMode: request.creationMode || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleVisitDetail
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Schedule visit save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleVisitDetail;
}

export async function assignCaregiverToScheduleVisit(
  request: ManageScheduleAssignmentRequest,
): Promise<ScheduleAssignment> {
  const response = await fetch(apiUrl(`/api/schedule-visits/${request.visitId}/assignments`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      caregiverProfileId: request.caregiverProfileId,
      branchId: request.branchId || null,
      assignmentSource: request.assignmentSource || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleAssignment
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver assignment failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleAssignment;
}

export async function createScheduleOpenShift(
  request: ManageScheduleOpenShiftRequest,
): Promise<ScheduleOpenShift> {
  const response = await fetch(apiUrl(`/api/schedule-visits/${request.visitId}/open-shift`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      priority: request.priority || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleOpenShift
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Open shift request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleOpenShift;
}

export async function assignFromOpenShift(
  openShiftId: string,
  request: Omit<ManageScheduleAssignmentRequest, 'visitId'>,
): Promise<ScheduleAssignment> {
  const response = await fetch(apiUrl(`/api/open-shifts/${openShiftId}/assign`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      caregiverProfileId: request.caregiverProfileId,
      branchId: request.branchId || null,
      assignmentSource: request.assignmentSource || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleAssignment
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Open-shift assignment failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleAssignment;
}

export async function fetchScheduleMatches(
  request: ScheduleMatchQuery,
): Promise<CaregiverMatch[]> {
  const matchesUrl = new URL(
    apiUrl(`/api/schedule-visits/${request.visitId}/matches`),
    window.location.origin,
  );
  appendOptionalSearchParams(matchesUrl, {
    preferredLanguage: request.preferredLanguage,
    enforcePatientOverlapCheck: request.enforcePatientOverlapCheck ? 'true' : undefined,
    requireAvailabilityFit:
      request.requireAvailabilityFit === false ? 'false' : request.requireAvailabilityFit ? 'true' : undefined,
    requiredSkillIds: request.requiredSkillIds?.length ? request.requiredSkillIds.join(',') : undefined,
    requiredCredentialTypes:
      request.requiredCredentialTypes?.length ? request.requiredCredentialTypes.join(',') : undefined,
  });

  const response = await fetch(matchesUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverMatch[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Schedule match request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverMatch[];
}

export async function previewScheduleConflicts(
  request: ScheduleConflictPreviewRequest,
): Promise<ScheduleConflictPreview> {
  const response = await fetch(
    apiUrl(`/api/schedule-visits/${request.visitId}/conflict-preview`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        caregiverProfileId: request.caregiverProfileId,
        requiredSkillIds: request.requiredSkillIds ?? [],
        requiredCredentialTypes: request.requiredCredentialTypes ?? [],
        preferredLanguage: request.preferredLanguage || null,
        enforcePatientOverlapCheck: Boolean(request.enforcePatientOverlapCheck),
        requireAvailabilityFit: request.requireAvailabilityFit !== false,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleConflictPreview
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Schedule conflict preview failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleConflictPreview;
}

export async function fetchRecurringVisitRules(
  request: AuthenticatedRequestContext & { patientId?: string },
): Promise<ScheduleRecurringVisitRule[]> {
  const rulesUrl = new URL(apiUrl('/api/recurring-visits'), window.location.origin);
  appendOptionalSearchParams(rulesUrl, {
    patientId: request.patientId,
  });

  const response = await fetch(rulesUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleRecurringVisitRule[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Recurring visit rule request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleRecurringVisitRule[];
}

export async function saveRecurringVisitRule(
  request: ManageRecurringVisitRuleRequest,
): Promise<ScheduleRecurringVisitRule> {
  const path = request.recurringRuleId
    ? `/api/recurring-visits/${request.recurringRuleId}`
    : '/api/recurring-visits';
  const response = await fetch(apiUrl(path), {
    method: request.recurringRuleId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      patientId: request.patientId,
      branchId: request.branchId || null,
      serviceLineId: request.serviceLineId || null,
      visitTypeId: request.visitTypeId || null,
      cadence: request.cadence,
      weekdays: request.weekdays ?? [],
      effectiveStart: request.effectiveStart,
      effectiveEnd: request.effectiveEnd || null,
      plannedStartTime: request.plannedStartTime,
      plannedEndTime: request.plannedEndTime,
      timezone: request.timezone,
      priority: request.priority || null,
      creationMode: request.creationMode || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleRecurringVisitRule
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Recurring visit rule save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleRecurringVisitRule;
}

export async function deactivateRecurringVisitRule(
  recurringRuleId: string,
  request: AuthenticatedRequestContext,
): Promise<ScheduleRecurringVisitRule> {
  const response = await fetch(apiUrl(`/api/recurring-visits/${recurringRuleId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleRecurringVisitRule
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Recurring visit rule deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleRecurringVisitRule;
}

export async function expandRecurringVisitRule(
  request: ExpandRecurringVisitRuleRequest,
): Promise<ScheduleVisitDetail[]> {
  const response = await fetch(apiUrl(`/api/recurring-visits/${request.recurringRuleId}/expand`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      windowStart: request.windowStart,
      windowEnd: request.windowEnd,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleVisitDetail[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Recurring visit rule expansion failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleVisitDetail[];
}

export async function rescheduleScheduleVisit(
  request: ScheduleRescheduleRequest,
): Promise<ScheduleRescheduleResponse> {
  const response = await fetch(apiUrl(`/api/schedule-visits/${request.visitId}/reschedule`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      newPlannedStartAt: request.newPlannedStartAt,
      newPlannedEndAt: request.newPlannedEndAt,
      timezone: request.timezone,
      branchId: request.branchId || null,
      newCaregiverProfileId: request.newCaregiverProfileId || null,
      reason: request.reason || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleRescheduleResponse
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Visit reschedule failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleRescheduleResponse;
}

export async function cancelScheduleVisit(
  request: ScheduleCancellationRequest,
): Promise<ScheduleCancellationResponse> {
  const response = await fetch(apiUrl(`/api/schedule-visits/${request.visitId}/cancel`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      cancellationParty: request.cancellationParty,
      reason: request.reason || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ScheduleCancellationResponse
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Visit cancellation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ScheduleCancellationResponse;
}

export async function fetchCaregivers(
  request: CaregiverDirectoryQuery,
): Promise<CaregiverDirectoryPage> {
  const caregiversUrl = new URL(apiUrl('/api/caregivers'), window.location.origin);
  appendOptionalSearchParams(caregiversUrl, {
    search: request.search,
    status: request.status === 'ALL' ? undefined : request.status,
    branchId: request.branchId,
    page: request.page,
    size: request.size,
  });

  const response = await fetch(caregiversUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverDirectoryPage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver directory request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverDirectoryPage;
}

export async function fetchCaregiver(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverProfile> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverProfile
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver record request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverProfile;
}

export async function createCaregiverProfile(
  request: ManageCaregiverProfileRecordRequest,
): Promise<CaregiverProfile> {
  const response = await fetch(apiUrl('/api/caregivers'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      agencyMembershipId: request.agencyMembershipId,
      primaryBranchId: request.primaryBranchId || null,
      caregiverCode: request.caregiverCode || null,
      displayName: request.displayName || null,
      employmentType: request.employmentType || null,
      startDate: request.startDate || null,
      endDate: request.endDate || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverProfile
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver create request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverProfile;
}

export async function updateCaregiverProfile(
  request: ManageCaregiverProfileRecordRequest,
): Promise<CaregiverProfile> {
  const response = await fetch(apiUrl(`/api/caregivers/${request.caregiverId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      agencyMembershipId: request.agencyMembershipId,
      primaryBranchId: request.primaryBranchId || null,
      caregiverCode: request.caregiverCode || null,
      displayName: request.displayName || null,
      employmentType: request.employmentType || null,
      startDate: request.startDate || null,
      endDate: request.endDate || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverProfile
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver update request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverProfile;
}

export async function deactivateCaregiverProfile(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverProfile> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverProfile
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver deactivate request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverProfile;
}

export async function fetchCaregiverCredentials(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverCredential[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/credentials`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCredential[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver credentials request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverCredential[];
}

export async function saveCaregiverCredential(
  request: ManageCaregiverCredentialRecordRequest,
): Promise<CaregiverCredential> {
  const path = request.credentialId
    ? `/api/caregivers/${request.caregiverId}/credentials/${request.credentialId}`
    : `/api/caregivers/${request.caregiverId}/credentials`;
  const response = await fetch(apiUrl(path), {
    method: request.credentialId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      certificationId: request.certificationId || null,
      credentialType: request.credentialType,
      licenseNumber: request.licenseNumber || null,
      issuingAuthority: request.issuingAuthority || null,
      issuedOn: request.issuedOn || null,
      expiresOn: request.expiresOn || null,
      status: request.status,
      verificationStatus: request.verificationStatus || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCredential
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver credential save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverCredential;
}

export async function deactivateCaregiverCredential(
  caregiverId: string,
  credentialId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverCredential> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/credentials/${credentialId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCredential
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver credential deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverCredential;
}

export async function fetchCaregiverLanguages(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverLanguage[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/languages`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverLanguage[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver languages request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverLanguage[];
}

export async function saveCaregiverLanguage(
  request: ManageCaregiverLanguageProfileRequest,
): Promise<CaregiverLanguage> {
  const path = request.languageId
    ? `/api/caregivers/${request.caregiverId}/languages/${request.languageId}`
    : `/api/caregivers/${request.caregiverId}/languages`;
  const response = await fetch(apiUrl(path), {
    method: request.languageId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      languageCode: request.languageCode,
      proficiencyLevel: request.proficiencyLevel || null,
      primaryLanguage: request.primaryLanguage,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverLanguage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver language save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverLanguage;
}

export async function deactivateCaregiverLanguage(
  caregiverId: string,
  languageId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverLanguage> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/languages/${languageId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverLanguage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver language deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverLanguage;
}

export async function fetchCaregiverSkillProfiles(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverSkillProfileEntry[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/skills`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillProfileEntry[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill profiles request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverSkillProfileEntry[];
}

export async function saveCaregiverSkillProfile(
  request: ManageCaregiverSkillProfileRequest,
): Promise<CaregiverSkillProfileEntry> {
  const path = request.skillProfileId
    ? `/api/caregivers/${request.caregiverId}/skills/${request.skillProfileId}`
    : `/api/caregivers/${request.caregiverId}/skills`;
  const response = await fetch(apiUrl(path), {
    method: request.skillProfileId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      skillId: request.skillId,
      proficiencyLevel: request.proficiencyLevel || null,
      verified: request.verified,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillProfileEntry
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill profile save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverSkillProfileEntry;
}

export async function deactivateCaregiverSkillProfile(
  caregiverId: string,
  skillProfileId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverSkillProfileEntry> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/skills/${skillProfileId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillProfileEntry
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill profile deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverSkillProfileEntry;
}

export async function fetchCaregiverGeographyPreferences(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverGeographyPreference[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/geography-preferences`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverGeographyPreference[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver geography preferences request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverGeographyPreference[];
}

export async function saveCaregiverGeographyPreference(
  request: ManageCaregiverGeographyPreferenceRequest,
): Promise<CaregiverGeographyPreference> {
  const path = request.preferenceId
    ? `/api/caregivers/${request.caregiverId}/geography-preferences/${request.preferenceId}`
    : `/api/caregivers/${request.caregiverId}/geography-preferences`;
  const response = await fetch(apiUrl(path), {
    method: request.preferenceId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      preferenceType: request.preferenceType,
      postalCode: request.postalCode || null,
      city: request.city || null,
      state: request.state || null,
      anchorLatitude: request.anchorLatitude ? Number(request.anchorLatitude) : null,
      anchorLongitude: request.anchorLongitude ? Number(request.anchorLongitude) : null,
      radiusMiles: request.radiusMiles ? Number(request.radiusMiles) : null,
      priorityRank: request.priorityRank ? Number(request.priorityRank) : null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverGeographyPreference
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver geography preference save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverGeographyPreference;
}

export async function deactivateCaregiverGeographyPreference(
  caregiverId: string,
  preferenceId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverGeographyPreference> {
  const response = await fetch(
    apiUrl(`/api/caregivers/${caregiverId}/geography-preferences/${preferenceId}`),
    {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverGeographyPreference
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver geography preference deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverGeographyPreference;
}

export async function fetchCaregiverShiftPreferences(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverShiftPreference[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/shift-preferences`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverShiftPreference[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver shift preferences request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverShiftPreference[];
}

export async function saveCaregiverShiftPreference(
  request: ManageCaregiverShiftPreferenceRequest,
): Promise<CaregiverShiftPreference> {
  const path = request.shiftPreferenceId
    ? `/api/caregivers/${request.caregiverId}/shift-preferences/${request.shiftPreferenceId}`
    : `/api/caregivers/${request.caregiverId}/shift-preferences`;
  const response = await fetch(apiUrl(path), {
    method: request.shiftPreferenceId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      dayOfWeek: request.dayOfWeek || null,
      preferredStartTime: request.preferredStartTime || null,
      preferredEndTime: request.preferredEndTime || null,
      preferredShiftLengthMinutes: request.preferredShiftLengthMinutes
        ? Number(request.preferredShiftLengthMinutes)
        : null,
      preferredVisitTypes: request.preferredVisitTypes || null,
      preferenceStrength: request.preferenceStrength || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverShiftPreference
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver shift preference save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverShiftPreference;
}

export async function deactivateCaregiverShiftPreference(
  caregiverId: string,
  shiftPreferenceId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverShiftPreference> {
  const response = await fetch(
    apiUrl(`/api/caregivers/${caregiverId}/shift-preferences/${shiftPreferenceId}`),
    {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverShiftPreference
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver shift preference deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverShiftPreference;
}

export async function fetchCaregiverAvailabilities(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverAvailability[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/availabilities`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverAvailability[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver availabilities request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverAvailability[];
}

export async function saveCaregiverAvailability(
  request: ManageCaregiverAvailabilityRequest,
): Promise<CaregiverAvailability> {
  const path = request.availabilityId
    ? `/api/caregivers/${request.caregiverId}/availabilities/${request.availabilityId}`
    : `/api/caregivers/${request.caregiverId}/availabilities`;
  const response = await fetch(apiUrl(path), {
    method: request.availabilityId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      availabilityType: request.availabilityType,
      startsAt: request.startsAt || null,
      endsAt: request.endsAt || null,
      dayOfWeek: request.dayOfWeek || null,
      startTime: request.startTime || null,
      endTime: request.endTime || null,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverAvailability
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver availability save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverAvailability;
}

export async function deactivateCaregiverAvailability(
  caregiverId: string,
  availabilityId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverAvailability> {
  const response = await fetch(
    apiUrl(`/api/caregivers/${caregiverId}/availabilities/${availabilityId}`),
    {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverAvailability
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver availability deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverAvailability;
}

export async function fetchCaregiverUnavailabilities(
  caregiverId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverUnavailability[]> {
  const response = await fetch(apiUrl(`/api/caregivers/${caregiverId}/unavailabilities`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverUnavailability[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver unavailabilities request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverUnavailability[];
}

export async function saveCaregiverUnavailability(
  request: ManageCaregiverUnavailabilityRequest,
): Promise<CaregiverUnavailability> {
  const path = request.unavailabilityId
    ? `/api/caregivers/${request.caregiverId}/unavailabilities/${request.unavailabilityId}`
    : `/api/caregivers/${request.caregiverId}/unavailabilities`;
  const response = await fetch(apiUrl(path), {
    method: request.unavailabilityId ? 'PUT' : 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reasonType: request.reasonType,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      allDay: request.allDay,
      approvalStatus: request.approvalStatus || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverUnavailability
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver unavailability save request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverUnavailability;
}

export async function deactivateCaregiverUnavailability(
  caregiverId: string,
  unavailabilityId: string,
  request: AuthenticatedRequestContext,
): Promise<CaregiverUnavailability> {
  const response = await fetch(
    apiUrl(`/api/caregivers/${caregiverId}/unavailabilities/${unavailabilityId}`),
    {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverUnavailability
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver unavailability deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverUnavailability;
}

export async function fetchCaregiverPerformanceSummary(
  request: CaregiverPerformanceQuery,
): Promise<CaregiverPerformanceSummary> {
  const summaryUrl = new URL(
    apiUrl(`/api/caregivers/${request.caregiverId}/performance-summary`),
    window.location.origin,
  );
  appendOptionalSearchParams(summaryUrl, {
    windowStart: request.windowStart,
    windowEnd: request.windowEnd,
  });

  const response = await fetch(summaryUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverPerformanceSummary
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver performance summary request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CaregiverPerformanceSummary;
}

export async function fetchPatients(
  request: PatientDirectoryQuery,
): Promise<PatientDirectoryPage> {
  const patientsUrl = new URL(apiUrl('/api/patients'), window.location.origin);
  appendOptionalSearchParams(patientsUrl, {
    search: request.search,
    status: request.status === 'ALL' ? undefined : request.status,
    page: request.page,
    size: request.size,
  });

  const response = await fetch(patientsUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientDirectoryPage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient directory request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as PatientDirectoryPage;
}

export async function fetchPatient(
  patientId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientSummary> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientSummary
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient record request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as PatientSummary;
}

export async function createPatient(
  request: ManagePatientRequest,
): Promise<PatientSummary> {
  const response = await fetch(apiUrl('/api/patients'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      externalReference: request.externalReference || null,
      firstName: request.firstName,
      middleName: request.middleName || null,
      lastName: request.lastName,
      preferredName: request.preferredName || null,
      dateOfBirth: request.dateOfBirth,
      sexMarker: request.sexMarker || null,
      primaryPhone: request.primaryPhone || null,
      secondaryPhone: request.secondaryPhone || null,
      email: request.email || null,
      language: request.language || null,
      notesSummary: request.notesSummary || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientSummary | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient create failed with status ${response.status}`,
    );
  }

  return payload as PatientSummary;
}

export async function updatePatient(
  patientId: string,
  request: ManagePatientRequest,
): Promise<PatientSummary> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      externalReference: request.externalReference || null,
      firstName: request.firstName,
      middleName: request.middleName || null,
      lastName: request.lastName,
      preferredName: request.preferredName || null,
      dateOfBirth: request.dateOfBirth,
      sexMarker: request.sexMarker || null,
      primaryPhone: request.primaryPhone || null,
      secondaryPhone: request.secondaryPhone || null,
      email: request.email || null,
      language: request.language || null,
      notesSummary: request.notesSummary || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientSummary | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient update failed with status ${response.status}`,
    );
  }

  return payload as PatientSummary;
}

export async function deactivatePatient(
  patientId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientSummary> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientSummary | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientSummary;
}

export async function fetchPatientContacts(
  patientId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientContact[]> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/contacts`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientContact[] | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient contacts request failed with status ${response.status}`,
    );
  }

  return payload as PatientContact[];
}

export async function createPatientContact(
  patientId: string,
  request: ManagePatientContactRequest,
): Promise<PatientContact> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/contacts`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      relationshipType: request.relationshipType || null,
      fullName: request.fullName,
      phone: request.phone || null,
      email: request.email || null,
      address: request.address || null,
      emergencyContact: request.emergencyContact,
      primaryContact: request.primaryContact,
      responsibleParty: request.responsibleParty,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientContact | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient contact create failed with status ${response.status}`,
    );
  }

  return payload as PatientContact;
}

export async function updatePatientContact(
  contactId: string,
  request: ManagePatientContactRequest,
): Promise<PatientContact> {
  const response = await fetch(apiUrl(`/api/patient-contacts/${contactId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      relationshipType: request.relationshipType || null,
      fullName: request.fullName,
      phone: request.phone || null,
      email: request.email || null,
      address: request.address || null,
      emergencyContact: request.emergencyContact,
      primaryContact: request.primaryContact,
      responsibleParty: request.responsibleParty,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientContact | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient contact update failed with status ${response.status}`,
    );
  }

  return payload as PatientContact;
}

export async function deactivatePatientContact(
  contactId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientContact> {
  const response = await fetch(apiUrl(`/api/patient-contacts/${contactId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientContact | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient contact deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientContact;
}

export async function fetchPatientAddress(
  patientId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientAddress> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/address`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientAddress | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient address request failed with status ${response.status}`,
    );
  }

  return payload as PatientAddress;
}

export async function upsertPatientAddress(
  patientId: string,
  request: ManagePatientAddressRequest,
): Promise<PatientAddress> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/address`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      addressLine1: request.addressLine1,
      addressLine2: request.addressLine2 || null,
      city: request.city,
      state: request.state,
      postalCode: request.postalCode,
      country: request.country || null,
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null,
      geocodeStatus: request.geocodeStatus || null,
      timezone: request.timezone || null,
      locationNotes: request.locationNotes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | PatientAddress | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient address update failed with status ${response.status}`,
    );
  }

  return payload as PatientAddress;
}

export async function fetchPatientEligibilities(
  patientId: string,
  request: AuthenticatedRequestContext & {
    status?: PatientServiceEligibilityStatus | 'ALL';
    serviceLineId?: string | 'ALL';
  },
): Promise<PatientServiceEligibility[]> {
  const url = new URL(apiUrl(`/api/patients/${patientId}/eligibilities`), window.location.origin);
  appendOptionalSearchParams(url, {
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientServiceEligibility[]
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient eligibility request failed with status ${response.status}`,
    );
  }

  return payload as PatientServiceEligibility[];
}

export async function createPatientEligibility(
  patientId: string,
  request: ManagePatientServiceEligibilityRequest,
): Promise<PatientServiceEligibility> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/eligibilities`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      status: request.status,
      effectiveFrom: request.effectiveFrom,
      effectiveTo: request.effectiveTo || null,
      verificationSource: request.verificationSource || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientServiceEligibility
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient eligibility create failed with status ${response.status}`,
    );
  }

  return payload as PatientServiceEligibility;
}

export async function updatePatientEligibility(
  eligibilityId: string,
  request: ManagePatientServiceEligibilityRequest,
): Promise<PatientServiceEligibility> {
  const response = await fetch(apiUrl(`/api/patient-eligibilities/${eligibilityId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      status: request.status,
      effectiveFrom: request.effectiveFrom,
      effectiveTo: request.effectiveTo || null,
      verificationSource: request.verificationSource || null,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientServiceEligibility
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient eligibility update failed with status ${response.status}`,
    );
  }

  return payload as PatientServiceEligibility;
}

export async function deactivatePatientEligibility(
  eligibilityId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientServiceEligibility> {
  const response = await fetch(apiUrl(`/api/patient-eligibilities/${eligibilityId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientServiceEligibility
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient eligibility deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientServiceEligibility;
}

export async function fetchPatientDiagnoses(
  patientId: string,
  request: AuthenticatedRequestContext & {
    status?: PatientDiagnosisStatus | 'ALL';
  },
): Promise<PatientDiagnosis[]> {
  const url = new URL(apiUrl(`/api/patients/${patientId}/diagnoses`), window.location.origin);
  appendOptionalSearchParams(url, {
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientDiagnosis[]
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient diagnosis request failed with status ${response.status}`,
    );
  }

  return payload as PatientDiagnosis[];
}

export async function createPatientDiagnosis(
  patientId: string,
  request: ManagePatientDiagnosisRequest,
): Promise<PatientDiagnosis> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/diagnoses`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      diagnosisCode: request.diagnosisCode || null,
      description: request.description,
      diagnosisType: request.diagnosisType || null,
      primaryCondition: request.primaryCondition,
      onsetDate: request.onsetDate || null,
      resolvedDate: request.resolvedDate || null,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientDiagnosis
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient diagnosis create failed with status ${response.status}`,
    );
  }

  return payload as PatientDiagnosis;
}

export async function updatePatientDiagnosis(
  diagnosisId: string,
  request: ManagePatientDiagnosisRequest,
): Promise<PatientDiagnosis> {
  const response = await fetch(apiUrl(`/api/patient-diagnoses/${diagnosisId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      diagnosisCode: request.diagnosisCode || null,
      description: request.description,
      diagnosisType: request.diagnosisType || null,
      primaryCondition: request.primaryCondition,
      onsetDate: request.onsetDate || null,
      resolvedDate: request.resolvedDate || null,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientDiagnosis
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient diagnosis update failed with status ${response.status}`,
    );
  }

  return payload as PatientDiagnosis;
}

export async function deactivatePatientDiagnosis(
  diagnosisId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientDiagnosis> {
  const response = await fetch(apiUrl(`/api/patient-diagnoses/${diagnosisId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientDiagnosis
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient diagnosis deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientDiagnosis;
}

export async function fetchPatientPayerLinks(
  patientId: string,
  request: AuthenticatedRequestContext & {
    status?: PatientPayerLinkStatus | 'ALL';
    primaryPayer?: 'ALL' | 'ONLY_PRIMARY' | 'ONLY_NON_PRIMARY';
  },
): Promise<PatientPayerLink[]> {
  const url = new URL(apiUrl(`/api/patients/${patientId}/payer-links`), window.location.origin);
  appendOptionalSearchParams(url, {
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    primaryPayer:
      request.primaryPayer === 'ONLY_PRIMARY'
        ? 'true'
        : request.primaryPayer === 'ONLY_NON_PRIMARY'
          ? 'false'
          : undefined,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientPayerLink[]
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient payer request failed with status ${response.status}`,
    );
  }

  return payload as PatientPayerLink[];
}

export async function createPatientPayerLink(
  patientId: string,
  request: ManagePatientPayerLinkRequest,
): Promise<PatientPayerLink> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/payer-links`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      payerName: request.payerName || null,
      payerExternalId: request.payerExternalId || null,
      memberPolicyNumber: request.memberPolicyNumber || null,
      groupNumber: request.groupNumber || null,
      effectiveFrom: request.effectiveFrom,
      effectiveTo: request.effectiveTo || null,
      primaryPayer: request.primaryPayer,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientPayerLink
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient payer create failed with status ${response.status}`,
    );
  }

  return payload as PatientPayerLink;
}

export async function updatePatientPayerLink(
  payerLinkId: string,
  request: ManagePatientPayerLinkRequest,
): Promise<PatientPayerLink> {
  const response = await fetch(apiUrl(`/api/patient-payer-links/${payerLinkId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      payerName: request.payerName || null,
      payerExternalId: request.payerExternalId || null,
      memberPolicyNumber: request.memberPolicyNumber || null,
      groupNumber: request.groupNumber || null,
      effectiveFrom: request.effectiveFrom,
      effectiveTo: request.effectiveTo || null,
      primaryPayer: request.primaryPayer,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientPayerLink
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient payer update failed with status ${response.status}`,
    );
  }

  return payload as PatientPayerLink;
}

export async function deactivatePatientPayerLink(
  payerLinkId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientPayerLink> {
  const response = await fetch(apiUrl(`/api/patient-payer-links/${payerLinkId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientPayerLink
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient payer deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientPayerLink;
}

export async function fetchPatientAuthorizations(
  patientId: string,
  request: AuthenticatedRequestContext & {
    status?: PatientEpisodeAuthorizationStatus | 'ALL';
    currentOnly?: boolean;
    patientPayerLinkId?: string | 'ALL';
    serviceLineId?: string | 'ALL';
  },
): Promise<PatientAuthorization[]> {
  const url = new URL(apiUrl(`/api/patients/${patientId}/authorizations`), window.location.origin);
  appendOptionalSearchParams(url, {
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    currentOnly: request.currentOnly ? 'true' : undefined,
    patientPayerLinkId:
      request.patientPayerLinkId && request.patientPayerLinkId !== 'ALL'
        ? request.patientPayerLinkId
        : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL'
        ? request.serviceLineId
        : undefined,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAuthorization[]
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient authorization request failed with status ${response.status}`,
    );
  }

  return payload as PatientAuthorization[];
}

export async function createPatientAuthorization(
  patientId: string,
  request: ManagePatientAuthorizationRequest,
): Promise<PatientAuthorization> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/authorizations`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      patientPayerLinkId: request.patientPayerLinkId || null,
      serviceLineId: request.serviceLineId || null,
      authorizationNumber: request.authorizationNumber || null,
      startDate: request.startDate,
      endDate: request.endDate,
      authorizedUnits: request.authorizedUnits ?? null,
      usedUnits: request.usedUnits ?? null,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAuthorization
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient authorization create failed with status ${response.status}`,
    );
  }

  return payload as PatientAuthorization;
}

export async function updatePatientAuthorization(
  authorizationId: string,
  request: ManagePatientAuthorizationRequest,
): Promise<PatientAuthorization> {
  const response = await fetch(apiUrl(`/api/patient-authorizations/${authorizationId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      patientPayerLinkId: request.patientPayerLinkId || null,
      serviceLineId: request.serviceLineId || null,
      authorizationNumber: request.authorizationNumber || null,
      startDate: request.startDate,
      endDate: request.endDate,
      authorizedUnits: request.authorizedUnits ?? null,
      usedUnits: request.usedUnits ?? null,
      status: request.status,
      notes: request.notes || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAuthorization
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient authorization update failed with status ${response.status}`,
    );
  }

  return payload as PatientAuthorization;
}

export async function deactivatePatientAuthorization(
  authorizationId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientAuthorization> {
  const response = await fetch(apiUrl(`/api/patient-authorizations/${authorizationId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAuthorization
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient authorization deactivation failed with status ${response.status}`,
    );
  }

  return payload as PatientAuthorization;
}

export async function fetchPatientAttachments(
  patientId: string,
  request: AuthenticatedRequestContext,
): Promise<PatientAttachment[]> {
  const response = await fetch(apiUrl(`/api/patients/${patientId}/attachments`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAttachment[]
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Patient attachment request failed with status ${response.status}`,
    );
  }

  return payload as PatientAttachment[];
}

export async function uploadPatientAttachment(
  patientId: string,
  request: UploadPatientAttachmentRequest,
): Promise<PatientAttachment> {
  const formData = new FormData();
  formData.set('file', request.file);
  formData.set('category', request.category);
  if (request.description.trim()) {
    formData.set('description', request.description.trim());
  }

  const response = await fetch(apiUrl(`/api/patients/${patientId}/attachments`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAttachment
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Patient attachment upload failed with status ${response.status}`,
    );
  }

  return payload as PatientAttachment;
}

export async function updatePatientAttachmentMetadata(
  attachmentId: string,
  request: UpdatePatientAttachmentMetadataRequest,
): Promise<PatientAttachment> {
  const formData = new FormData();
  formData.set('category', request.category);
  if (request.description.trim()) {
    formData.set('description', request.description.trim());
  }

  const response = await fetch(apiUrl(`/api/patient-attachments/${attachmentId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PatientAttachment
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Attachment metadata update failed with status ${response.status}`,
    );
  }

  return payload as PatientAttachment;
}

export async function downloadPatientAttachment(
  attachmentId: string,
  request: AuthenticatedRequestContext,
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await fetch(apiUrl(`/api/patient-attachments/${attachmentId}/download`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? `Attachment download failed with status ${response.status}`,
    );
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  const fileNameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : null,
  };
}

export async function fetchBranches(
  request: AuthenticatedRequestContext & { search?: string },
): Promise<BranchSummary[]> {
  const branchesUrl = new URL(apiUrl('/api/branches'), window.location.origin);
  if (request.search?.trim()) {
    branchesUrl.searchParams.set('search', request.search.trim());
  }

  const response = await fetch(branchesUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Branch list request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary[];
}

export async function fetchUserDirectory(
  request: UserDirectoryQuery,
): Promise<UserDirectoryPage> {
  const directoryUrl = new URL(apiUrl('/api/users'), window.location.origin);

  if (request.search?.trim()) {
    directoryUrl.searchParams.set('search', request.search.trim());
  }
  if (request.status && request.status !== 'ALL') {
    directoryUrl.searchParams.set('status', request.status);
  }
  if (request.role && request.role !== 'ALL') {
    directoryUrl.searchParams.set('role', request.role);
  }
  if (request.branchId && request.branchId !== 'ALL') {
    directoryUrl.searchParams.set('branchId', request.branchId);
  }
  directoryUrl.searchParams.set('page', String(request.page ?? 0));
  directoryUrl.searchParams.set('size', String(request.size ?? 20));

  const response = await fetch(directoryUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserDirectoryPage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `User directory request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserDirectoryPage;
}

export async function inviteUser(
  request: InviteUserRequest,
): Promise<InvitationResponse> {
  const response = await fetch(apiUrl('/api/users/invitations'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || null,
      role: request.role,
      branchIds: request.branchIds,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | InvitationResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User invitation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as InvitationResponse;
}

export async function fetchInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
  const response = await fetch(apiUrl(`/api/invitations/${encodeURIComponent(token)}`), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | InvitationDetailsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Invitation lookup failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as InvitationDetailsResponse;
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptedInvitationResponse> {
  const response = await fetch(apiUrl(`/api/invitations/${encodeURIComponent(request.token)}/accept`), {
    method: 'POST',
    credentials: 'include',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      password: request.password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AcceptedInvitationResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Invitation acceptance failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AcceptedInvitationResponse;
}

export async function updateUser(
  request: UpdateUserRequest,
): Promise<UpdatedUserResponse> {
  const response = await fetch(apiUrl(`/api/users/${request.userId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      role: request.role,
      branchIds: request.branchIds,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UpdatedUserResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UpdatedUserResponse;
}

export async function changeUserStatus(
  request: ChangeUserStatusRequest,
): Promise<UserStatusResponse> {
  const response = await fetch(apiUrl(`/api/users/${request.userId}/status`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      status: request.status,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserStatusResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User status change failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserStatusResponse;
}

export async function fetchSelfProfile(
  request: AuthenticatedRequestContext,
): Promise<SelfProfileResponse> {
  const response = await fetch(apiUrl('/api/me/profile'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | SelfProfileResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Self profile request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as SelfProfileResponse;
}

export async function updateSelfProfile(
  request: UpdateSelfProfileRequest,
): Promise<SelfProfileResponse> {
  const response = await fetch(apiUrl('/api/me/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      preferredLanguage: request.preferredLanguage || null,
      timeZone: request.timeZone || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | SelfProfileResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Self profile update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as SelfProfileResponse;
}

export async function fetchAuditEvents(
  request: AuditEventQuery,
): Promise<AuditEventPage> {
  const eventsUrl = new URL(apiUrl('/api/audit-events'), window.location.origin);
  if (request.from) {
    eventsUrl.searchParams.set('from', request.from);
  }
  if (request.to) {
    eventsUrl.searchParams.set('to', request.to);
  }
  if (request.actorId) {
    eventsUrl.searchParams.set('actorId', request.actorId);
  }
  if (request.actionType?.trim()) {
    eventsUrl.searchParams.set('actionType', request.actionType.trim());
  }
  if (request.targetUserId) {
    eventsUrl.searchParams.set('targetUserId', request.targetUserId);
  }
  eventsUrl.searchParams.set('page', String(request.page ?? 0));
  eventsUrl.searchParams.set('size', String(request.size ?? 20));

  const response = await fetch(eventsUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AuditEventPage
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Audit event request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AuditEventPage;
}

export async function exportAuditEvents(
  request: AuditEventQuery,
): Promise<string> {
  const exportUrl = new URL(apiUrl('/api/audit-events/export'), window.location.origin);
  if (request.from) {
    exportUrl.searchParams.set('from', request.from);
  }
  if (request.to) {
    exportUrl.searchParams.set('to', request.to);
  }
  if (request.actorId) {
    exportUrl.searchParams.set('actorId', request.actorId);
  }
  if (request.actionType?.trim()) {
    exportUrl.searchParams.set('actionType', request.actionType.trim());
  }
  if (request.targetUserId) {
    exportUrl.searchParams.set('targetUserId', request.targetUserId);
  }

  const response = await fetch(exportUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  if (!response.ok) {
    const payload = (await response.text().catch(() => '')) || '';
    throw new ApiError(response.status, payload || `Audit export failed with status ${response.status}`);
  }

  return response.text();
}

export async function fetchAgencySettings(
  request: AuthenticatedRequestContext,
): Promise<AgencySettingsResponse> {
  const response = await fetch(apiUrl('/api/agency/settings'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencySettingsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency settings request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencySettingsResponse;
}

export async function updateAgencySettings(
  request: UpdateAgencySettingsRequest,
): Promise<AgencySettingsResponse> {
  const response = await fetch(apiUrl('/api/agency/settings'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      timezone: request.timezone,
      contactEmail: request.contactEmail,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencySettingsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency settings update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencySettingsResponse;
}

export async function createBranch(
  request: CreateBranchRequest,
): Promise<BranchSummary> {
  const response = await fetch(apiUrl('/api/branches'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      agencyId: request.agencyId,
      name: request.name,
      code: request.code,
      address: request.address,
      timezone: request.timezone,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch creation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function updateBranch(
  request: UpdateBranchRequest,
): Promise<BranchSummary> {
  const response = await fetch(apiUrl(`/api/branches/${request.branchId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      address: request.address,
      timezone: request.timezone,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function deactivateBranch(
  request: AuthenticatedRequestContext & { branchId: string },
): Promise<BranchSummary> {
  const response = await fetch(apiUrl(`/api/branches/${request.branchId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function fetchAgencyProfile(
  request: AuthenticatedRequestContext,
): Promise<AgencyProfileResponse> {
  const response = await fetch(apiUrl('/api/agency/profile'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyProfileResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency profile request failed with status ${response.status}`,
    );
  }

  return payload as AgencyProfileResponse;
}

export async function updateAgencyProfile(
  request: UpdateAgencyProfileRequest,
): Promise<AgencyProfileResponse> {
  const response = await fetch(apiUrl('/api/agency/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      displayName: request.displayName || null,
      legalName: request.legalName || null,
      primaryPhone: request.primaryPhone || null,
      primaryAddress: request.primaryAddress || null,
      operationsContactName: request.operationsContactName || null,
      operationsContactEmail: request.operationsContactEmail || null,
      supportContactName: request.supportContactName || null,
      supportContactEmail: request.supportContactEmail || null,
      defaultTimezone: request.defaultTimezone,
      defaultLocale: request.defaultLocale,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyProfileResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency profile update failed with status ${response.status}`,
    );
  }

  return payload as AgencyProfileResponse;
}

export async function fetchServiceLines(
  request: ServiceLineQuery,
): Promise<ConfigurationPage<ServiceLineSummary>> {
  const url = new URL(apiUrl('/api/service-lines'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<ServiceLineSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<ServiceLineSummary>;
}

export async function saveServiceLine(
  request: ManageServiceLineRequest,
): Promise<ServiceLineSummary> {
  const method = request.serviceLineId ? 'PUT' : 'POST';
  const path = request.serviceLineId
    ? `/api/service-lines/${request.serviceLineId}`
    : '/api/service-lines';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ServiceLineSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line save failed with status ${response.status}`,
    );
  }

  return payload as ServiceLineSummary;
}

export async function deactivateServiceLine(
  request: AuthenticatedRequestContext & { serviceLineId: string },
): Promise<ServiceLineSummary> {
  const response = await fetch(apiUrl(`/api/service-lines/${request.serviceLineId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ServiceLineSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line deactivation failed with status ${response.status}`,
    );
  }

  return payload as ServiceLineSummary;
}

export async function fetchVisitTypes(
  request: VisitTypeQuery,
): Promise<ConfigurationPage<VisitTypeSummary>> {
  const url = new URL(apiUrl('/api/visit-types'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<VisitTypeSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<VisitTypeSummary>;
}

export async function saveVisitType(
  request: ManageVisitTypeRequest,
): Promise<VisitTypeSummary> {
  const method = request.visitTypeId ? 'PUT' : 'POST';
  const path = request.visitTypeId
    ? `/api/visit-types/${request.visitTypeId}`
    : '/api/visit-types';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      name: request.name,
      code: request.code,
      description: request.description || null,
      defaultDurationMinutes: request.defaultDurationMinutes,
      billable: request.billable,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | VisitTypeSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type save failed with status ${response.status}`,
    );
  }

  return payload as VisitTypeSummary;
}

export async function deactivateVisitType(
  request: AuthenticatedRequestContext & { visitTypeId: string },
): Promise<VisitTypeSummary> {
  const response = await fetch(apiUrl(`/api/visit-types/${request.visitTypeId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | VisitTypeSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type deactivation failed with status ${response.status}`,
    );
  }

  return payload as VisitTypeSummary;
}

export async function fetchCaregiverSkills(
  request: WorkforceCatalogQuery,
): Promise<ConfigurationPage<CaregiverSkillSummary>> {
  const url = new URL(apiUrl('/api/caregiver-skills'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<CaregiverSkillSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<CaregiverSkillSummary>;
}

export async function saveCaregiverSkill(
  request: ManageCaregiverSkillRequest,
): Promise<CaregiverSkillSummary> {
  const method = request.skillId ? 'PUT' : 'POST';
  const path = request.skillId
    ? `/api/caregiver-skills/${request.skillId}`
    : '/api/caregiver-skills';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill save failed with status ${response.status}`,
    );
  }

  return payload as CaregiverSkillSummary;
}

export async function deactivateCaregiverSkill(
  request: AuthenticatedRequestContext & { skillId: string },
): Promise<CaregiverSkillSummary> {
  const response = await fetch(apiUrl(`/api/caregiver-skills/${request.skillId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill deactivation failed with status ${response.status}`,
    );
  }

  return payload as CaregiverSkillSummary;
}

export async function fetchCaregiverCertifications(
  request: WorkforceCatalogQuery,
): Promise<ConfigurationPage<CaregiverCertificationSummary>> {
  const url = new URL(apiUrl('/api/caregiver-certifications'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<CaregiverCertificationSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<CaregiverCertificationSummary>;
}

export async function saveCaregiverCertification(
  request: ManageCaregiverCertificationRequest,
): Promise<CaregiverCertificationSummary> {
  const method = request.certificationId ? 'PUT' : 'POST';
  const path = request.certificationId
    ? `/api/caregiver-certifications/${request.certificationId}`
    : '/api/caregiver-certifications';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
      expirationRequired: request.expirationRequired,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCertificationSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification save failed with status ${response.status}`,
    );
  }

  return payload as CaregiverCertificationSummary;
}

export async function deactivateCaregiverCertification(
  request: AuthenticatedRequestContext & { certificationId: string },
): Promise<CaregiverCertificationSummary> {
  const response = await fetch(apiUrl(`/api/caregiver-certifications/${request.certificationId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCertificationSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification deactivation failed with status ${response.status}`,
    );
  }

  return payload as CaregiverCertificationSummary;
}

export async function fetchTaskTemplates(
  request: TaskTemplateQuery,
): Promise<ConfigurationPage<TaskTemplateSummary>> {
  const url = new URL(apiUrl('/api/task-templates'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    category: request.category && request.category !== 'ALL' ? request.category : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
    visitTypeId: request.visitTypeId && request.visitTypeId !== 'ALL' ? request.visitTypeId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<TaskTemplateSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<TaskTemplateSummary>;
}

export async function saveTaskTemplate(
  request: ManageTaskTemplateRequest,
): Promise<TaskTemplateSummary> {
  const method = request.taskTemplateId ? 'PUT' : 'POST';
  const path = request.taskTemplateId
    ? `/api/task-templates/${request.taskTemplateId}`
    : '/api/task-templates';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      visitTypeId: request.visitTypeId || null,
      name: request.name,
      code: request.code,
      description: request.description || null,
      category: request.category || null,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | TaskTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template save failed with status ${response.status}`,
    );
  }

  return payload as TaskTemplateSummary;
}

export async function deactivateTaskTemplate(
  request: AuthenticatedRequestContext & { taskTemplateId: string },
): Promise<TaskTemplateSummary> {
  const response = await fetch(apiUrl(`/api/task-templates/${request.taskTemplateId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | TaskTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template deactivation failed with status ${response.status}`,
    );
  }

  return payload as TaskTemplateSummary;
}

export async function fetchDocumentationTemplates(
  request: DocumentationTemplateQuery,
): Promise<ConfigurationPage<DocumentationTemplateSummary>> {
  const url = new URL(apiUrl('/api/documentation-templates'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    templateType:
      request.templateType && request.templateType !== 'ALL' ? request.templateType : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<DocumentationTemplateSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<DocumentationTemplateSummary>;
}

export async function saveDocumentationTemplate(
  request: ManageDocumentationTemplateRequest,
): Promise<DocumentationTemplateSummary> {
  const method = request.templateId ? 'PUT' : 'POST';
  const path = request.templateId
    ? `/api/documentation-templates/${request.templateId}`
    : '/api/documentation-templates';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      templateType: request.templateType || null,
      structuredDefinitionJson: request.structuredDefinitionJson,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template save failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function createDocumentationTemplateVersion(
  request: ManageDocumentationTemplateRequest & { templateId: string },
): Promise<DocumentationTemplateSummary> {
  const response = await fetch(apiUrl(`/api/documentation-templates/${request.templateId}/version`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      templateType: request.templateType || null,
      structuredDefinitionJson: request.structuredDefinitionJson,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template versioning failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function publishDocumentationTemplate(
  request: AuthenticatedRequestContext & { templateId: string },
): Promise<DocumentationTemplateSummary> {
  const response = await fetch(apiUrl(`/api/documentation-templates/${request.templateId}/publish`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template publish failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function fetchEpic8DocumentationTemplates(
  request: DocumentationTemplateQuery,
): Promise<ConfigurationPage<DocumentationTemplateSummary>> {
  const url = new URL(apiUrl('/api/documentation/templates'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    templateType:
      request.templateType && request.templateType !== 'ALL' ? request.templateType : undefined,
    branchId: (request as DocumentationTemplateQuery & { branchId?: string | 'ALL' }).branchId,
    visitTypeId:
      (request as DocumentationTemplateQuery & { visitTypeId?: string | 'ALL' }).visitTypeId,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | ConfigurationPage<DocumentationTemplateSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation template request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<DocumentationTemplateSummary>;
}

export async function fetchEpic8DocumentationTemplate(
  request: AuthenticatedRequestContext & { templateId: string },
): Promise<DocumentationTemplateAggregate> {
  const response = await fetch(apiUrl(`/api/documentation/templates/${request.templateId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | DocumentationTemplateAggregate
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation template detail failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateAggregate;
}

export async function saveEpic8DocumentationTemplate(
  request: ManageDocumentationTemplateRequest,
): Promise<DocumentationTemplateAggregate> {
  const method = request.templateId ? 'PUT' : 'POST';
  const path = request.templateId
    ? `/api/documentation/templates/${request.templateId}`
    : '/api/documentation/templates';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      templateType: request.templateType,
      structuredDefinitionJson: request.structuredDefinitionJson,
      displayOrder: request.displayOrder,
      serviceLineId: request.serviceLineId ?? null,
      visitTypeId: request.visitTypeId ?? null,
      branchId: request.branchId ?? null,
      helpText: request.helpText ?? null,
      allowedActorRoles: request.allowedActorRoles ?? [],
      requiresSignatureVerification: request.requiresSignatureVerification ?? false,
      sections: request.sections ?? [],
      fields: request.fields ?? [],
      tasks: request.tasks ?? [],
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | DocumentationTemplateAggregate
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation template save failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateAggregate;
}

export async function deactivateEpic8DocumentationTemplate(
  request: AuthenticatedRequestContext & { templateId: string },
): Promise<DocumentationTemplateSummary> {
  const response = await fetch(apiUrl(`/api/documentation/templates/${request.templateId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation template deactivation failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function fetchDocumentationTaskLibrary(
  request: DocumentationTaskLibraryQuery,
): Promise<ConfigurationPage<DocumentationTaskLibraryItem>> {
  const url = new URL(apiUrl('/api/documentation/task-library'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    category: request.category && request.category !== 'ALL' ? request.category : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
    visitTypeId: request.visitTypeId && request.visitTypeId !== 'ALL' ? request.visitTypeId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | ConfigurationPage<DocumentationTaskLibraryItem>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation task library request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<DocumentationTaskLibraryItem>;
}

export async function saveDocumentationTaskLibraryItem(
  request: ManageDocumentationTaskLibraryItemRequest,
): Promise<DocumentationTaskLibraryItem> {
  const method = request.taskTemplateId ? 'PUT' : 'POST';
  const path = request.taskTemplateId
    ? `/api/documentation/task-library/${request.taskTemplateId}`
    : '/api/documentation/task-library';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId ?? null,
      visitTypeId: request.visitTypeId ?? null,
      name: request.name,
      code: request.code,
      description: request.description ?? null,
      category: request.category,
      displayOrder: request.displayOrder,
      defaultSortOrder: request.defaultSortOrder,
      defaultCompletionExpectation: request.defaultCompletionExpectation ?? null,
      requiredByDefault: request.requiredByDefault,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | DocumentationTaskLibraryItem
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation task library save failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTaskLibraryItem;
}

export async function deactivateDocumentationTaskLibraryItem(
  request: AuthenticatedRequestContext & { taskTemplateId: string },
): Promise<DocumentationTaskLibraryItem> {
  const response = await fetch(apiUrl(`/api/documentation/task-library/${request.taskTemplateId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | DocumentationTaskLibraryItem
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Documentation task library deactivation failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTaskLibraryItem;
}

export async function fetchVisitDocumentationRecords(
  request: VisitDocumentationQuery,
): Promise<ConfigurationPage<VisitDocumentationSummary>> {
  const url = new URL(apiUrl('/api/visit-documentation'), window.location.origin);
  appendOptionalSearchParams(url, {
    from: request.from,
    to: request.to,
    branchId: request.branchId && request.branchId !== 'ALL' ? request.branchId : undefined,
    caregiverMembershipId:
      request.caregiverMembershipId && request.caregiverMembershipId !== 'ALL'
        ? request.caregiverMembershipId
        : undefined,
    patientId: request.patientId && request.patientId !== 'ALL' ? request.patientId : undefined,
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    templateId: request.templateId && request.templateId !== 'ALL' ? request.templateId : undefined,
    visitTypeId: request.visitTypeId && request.visitTypeId !== 'ALL' ? request.visitTypeId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | ConfigurationPage<VisitDocumentationSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<VisitDocumentationSummary>;
}

export async function loadVisitDocumentationForVisit(
  request: AuthenticatedRequestContext & { visitOccurrenceId: string; selectedTemplateId?: string | null },
): Promise<VisitDocumentationAggregate> {
  const url = new URL(apiUrl('/api/visit-documentation/by-visit'), window.location.origin);
  appendOptionalSearchParams(url, {
    visitOccurrenceId: request.visitOccurrenceId,
    selectedTemplateId: request.selectedTemplateId ?? undefined,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAggregate
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation lookup failed with status ${response.status}`,
    );
  }

  return payload as VisitDocumentationAggregate;
}

export async function fetchVisitDocumentationAggregate(
  request: AuthenticatedRequestContext & { documentationRecordId: string },
): Promise<VisitDocumentationAggregate> {
  const response = await fetch(apiUrl(`/api/visit-documentation/${request.documentationRecordId}`), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAggregate
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation detail failed with status ${response.status}`,
    );
  }

  return payload as VisitDocumentationAggregate;
}

export async function createVisitDocumentationRecord(
  request: AuthenticatedRequestContext & {
    visitOccurrenceId: string;
    selectedTemplateId: string;
    startedAt?: string | null;
  },
): Promise<VisitDocumentationAggregate> {
  const response = await fetch(apiUrl('/api/visit-documentation'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      visitOccurrenceId: request.visitOccurrenceId,
      selectedTemplateId: request.selectedTemplateId,
      startedAt: request.startedAt ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAggregate
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation creation failed with status ${response.status}`,
    );
  }

  return payload as VisitDocumentationAggregate;
}

export async function saveVisitDocumentationDraft(
  request: SaveVisitDocumentationDraftRequest,
): Promise<VisitDocumentationAggregate> {
  const response = await fetch(apiUrl(`/api/visit-documentation/${request.documentationRecordId}/draft`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      fieldResponses: request.fieldResponses,
      taskResponses: request.taskResponses,
      savedAt: request.savedAt ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAggregate
    | null;

  if (!response.ok) {
    const message =
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation draft save failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as VisitDocumentationAggregate;
}

export async function submitVisitDocumentation(
  request: AuthenticatedRequestContext & { documentationRecordId: string; submittedAt?: string | null },
): Promise<VisitDocumentationAggregate> {
  const response = await fetch(apiUrl(`/api/visit-documentation/${request.documentationRecordId}/submit`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      submittedAt: request.submittedAt ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAggregate
    | null;

  if (!response.ok) {
    const message =
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Visit documentation submission failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as VisitDocumentationAggregate;
}

export async function linkVisitDocumentationPatientAttachment(
  request: AuthenticatedRequestContext & {
    documentationRecordId: string;
    patientAttachmentId: string;
    caption?: string | null;
    description?: string | null;
  },
): Promise<VisitDocumentationAttachmentLink> {
  const response = await fetch(
    apiUrl(`/api/visit-documentation/${request.documentationRecordId}/attachments/patient-links`),
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request, 'application/json'),
      body: JSON.stringify({
        patientAttachmentId: request.patientAttachmentId,
        caption: request.caption ?? null,
        description: request.description ?? null,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | VisitDocumentationAttachmentLink
    | null;

  if (!response.ok) {
    const message =
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Attachment link failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as VisitDocumentationAttachmentLink;
}

export async function unlinkVisitDocumentationAttachment(
  request: AuthenticatedRequestContext & {
    documentationRecordId: string;
    attachmentLinkId: string;
  },
): Promise<void> {
  const response = await fetch(
    apiUrl(
      `/api/visit-documentation/${request.documentationRecordId}/attachments/${request.attachmentLinkId}`,
    ),
    {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    const message =
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Attachment unlink failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }
}

export async function fetchPrintableDocumentationSummary(
  request: AuthenticatedRequestContext & { documentationRecordId: string },
): Promise<PrintableDocumentationSummary> {
  const response = await fetch(
    apiUrl(`/api/visit-documentation/${request.documentationRecordId}/printable-summary`),
    {
      method: 'GET',
      credentials: 'include',
      headers: buildAuthenticatedHeaders(request),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | PrintableDocumentationSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'error' in payload && payload.error
        ? payload.error
        : payload && 'message' in payload && payload.message
          ? payload.message
          : `Printable documentation summary failed with status ${response.status}`,
    );
  }

  return payload as PrintableDocumentationSummary;
}

export async function fetchBranchPolicies(
  request: BranchPolicyQuery,
): Promise<ConfigurationPage<BranchPolicySummary>> {
  const url = new URL(apiUrl('/api/branch-policies'), window.location.origin);
  appendOptionalSearchParams(url, {
    branchId: request.branchId && request.branchId !== 'ALL' ? request.branchId : undefined,
    policyKey: request.policyKey?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<BranchPolicySummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<BranchPolicySummary>;
}

export async function saveBranchPolicy(
  request: ManageBranchPolicyRequest,
): Promise<BranchPolicySummary> {
  const method = request.branchPolicyId ? 'PUT' : 'POST';
  const path = request.branchPolicyId
    ? `/api/branch-policies/${request.branchPolicyId}`
    : '/api/branch-policies';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      policyKey: request.policyKey,
      settingsPayloadJson: request.settingsPayloadJson || null,
      fallbackToAgencyDefault: request.fallbackToAgencyDefault,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchPolicySummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy save failed with status ${response.status}`,
    );
  }

  return payload as BranchPolicySummary;
}

export async function deactivateBranchPolicy(
  request: AuthenticatedRequestContext & { branchPolicyId: string },
): Promise<BranchPolicySummary> {
  const response = await fetch(apiUrl(`/api/branch-policies/${request.branchPolicyId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchPolicySummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy deactivation failed with status ${response.status}`,
    );
  }

  return payload as BranchPolicySummary;
}

export async function fetchAlertRules(
  request: AlertRuleQuery,
): Promise<ConfigurationPage<AlertRuleSummary>> {
  const url = new URL(apiUrl('/api/alert-rules'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    branchId: request.branchId && request.branchId !== 'ALL' ? request.branchId : undefined,
    ruleType: request.ruleType && request.ruleType !== 'ALL' ? request.ruleType : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<AlertRuleSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<AlertRuleSummary>;
}

export async function saveAlertRule(
  request: ManageAlertRuleRequest,
): Promise<AlertRuleSummary> {
  const method = request.alertRuleId ? 'PUT' : 'POST';
  const path = request.alertRuleId ? `/api/alert-rules/${request.alertRuleId}` : '/api/alert-rules';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      name: request.name,
      ruleType: request.ruleType || null,
      configPayloadJson: request.configPayloadJson,
      notifyEmail: request.notifyEmail,
      notifySms: request.notifySms,
      notifyInApp: request.notifyInApp,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AlertRuleSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule save failed with status ${response.status}`,
    );
  }

  return payload as AlertRuleSummary;
}

export async function deactivateAlertRule(
  request: AuthenticatedRequestContext & { alertRuleId: string },
): Promise<AlertRuleSummary> {
  const response = await fetch(apiUrl(`/api/alert-rules/${request.alertRuleId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AlertRuleSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule deactivation failed with status ${response.status}`,
    );
  }

  return payload as AlertRuleSummary;
}

export async function fetchMileagePaySettings(
  request: AuthenticatedRequestContext & { effectiveAt?: string },
): Promise<MileagePaySettingsResponse> {
  const url = new URL(apiUrl('/api/mileage-pay-settings'), window.location.origin);
  appendOptionalSearchParams(url, {
    effectiveAt: request.effectiveAt,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingsResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay settings request failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingsResponse;
}

export async function saveMileagePayDefault(
  request: ManageMileagePaySettingRequest,
): Promise<MileagePaySettingScope> {
  const response = await fetch(apiUrl('/api/mileage-pay-settings/default'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reimbursementStrategy: request.reimbursementStrategy,
      mileageRate: request.mileageRate,
      travelPayEnabled: request.travelPayEnabled,
      visitTypePayAdjustmentsJson: request.visitTypePayAdjustmentsJson || null,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingScope
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay default save failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingScope;
}

export async function saveMileagePayBranchOverride(
  request: ManageMileagePaySettingRequest & { branchId: string },
): Promise<MileagePaySettingScope> {
  const response = await fetch(apiUrl(`/api/mileage-pay-settings/branches/${request.branchId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reimbursementStrategy: request.reimbursementStrategy,
      mileageRate: request.mileageRate,
      travelPayEnabled: request.travelPayEnabled,
      visitTypePayAdjustmentsJson: request.visitTypePayAdjustmentsJson || null,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingScope
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay branch override save failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingScope;
}
