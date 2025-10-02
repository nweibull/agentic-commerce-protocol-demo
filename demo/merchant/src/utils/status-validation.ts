/**
 * Status transition validation utilities
 */

import { CheckoutStatus } from '../models/types';

/**
 * Valid status transitions
 * not_ready_for_payment → ready_for_payment
 * ready_for_payment → in_progress OR canceled
 * in_progress → completed OR canceled
 * any status (except completed/canceled) → canceled
 */
const VALID_TRANSITIONS: Record<CheckoutStatus, CheckoutStatus[]> = {
  not_ready_for_payment: ['ready_for_payment', 'canceled'],
  ready_for_payment: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  completed: [], // Terminal state
  canceled: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: CheckoutStatus,
  toStatus: CheckoutStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  return allowedTransitions.includes(toStatus);
}

/**
 * Check if a status is terminal (cannot be changed)
 */
export function isTerminalStatus(status: CheckoutStatus): boolean {
  return status === 'completed' || status === 'canceled';
}

/**
 * Check if a session can be updated (not in terminal state)
 */
export function canUpdateSession(status: CheckoutStatus): boolean {
  return !isTerminalStatus(status);
}

/**
 * Check if a session can be completed
 */
export function canCompleteSession(status: CheckoutStatus): boolean {
  return status === 'ready_for_payment';
}

/**
 * Check if a session can be canceled
 */
export function canCancelSession(status: CheckoutStatus): boolean {
  return status !== 'completed' && status !== 'canceled';
}

/**
 * Get error message for invalid status transition
 */
export function getStatusTransitionError(
  fromStatus: CheckoutStatus,
  toStatus: CheckoutStatus
): string {
  if (isTerminalStatus(fromStatus)) {
    return `Cannot transition from ${fromStatus} status`;
  }

  return `Invalid status transition from ${fromStatus} to ${toStatus}`;
}