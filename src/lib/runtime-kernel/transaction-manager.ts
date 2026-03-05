import type {
  RuntimeVariableValue,
  ScriptTransactionOperation,
  ScriptTransactionState
} from "./types.ts";

export type TransactionStageFieldInput = {
  stepId: string;
  fieldName: string;
  value: RuntimeVariableValue;
  now: number;
};

export type TransactionApplyResult = {
  ok: boolean;
  lastError?: number;
  lastMessage?: string;
};

export type TransactionCommitHandlers = {
  applyField: (operation: ScriptTransactionOperation) => Promise<TransactionApplyResult>;
  commit?: () => Promise<TransactionApplyResult>;
  revert?: () => Promise<TransactionApplyResult>;
};

export type ScriptTransactionBuffer = {
  state: ScriptTransactionState;
  operations: ScriptTransactionOperation[];
};

function createTransactionId(now: number): string {
  return `txn-${Math.max(1, Math.round(now)).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createOperationId(now: number): string {
  return `txn-op-${Math.max(1, Math.round(now)).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeErrorCode(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(0, Math.round(numeric));
}

export function createTransactionBuffer(now: number): ScriptTransactionBuffer {
  const roundedNow = Math.max(1, Math.round(now));
  return {
    state: {
      id: createTransactionId(roundedNow),
      status: "active",
      startedAt: roundedNow,
      operationCount: 0,
      lastError: 0
    },
    operations: []
  };
}

export function stageFieldOperation(
  buffer: ScriptTransactionBuffer,
  input: TransactionStageFieldInput
): ScriptTransactionBuffer {
  const fieldName = input.fieldName.trim();
  if (!fieldName) {
    return {
      state: {
        ...buffer.state,
        status: "failed",
        lastError: 102,
        lastMessage: "Field name missing for staged transaction operation"
      },
      operations: [...buffer.operations]
    };
  }

  const queuedAt = Math.max(1, Math.round(input.now));
  const operation: ScriptTransactionOperation = {
    id: createOperationId(queuedAt),
    stepId: input.stepId,
    fieldName,
    value: input.value,
    queuedAt
  };
  const nextOperations = [...buffer.operations, operation];
  return {
    state: {
      ...buffer.state,
      status: "active",
      operationCount: nextOperations.length,
      lastError: 0,
      lastMessage: undefined
    },
    operations: nextOperations
  };
}

export async function commitTransactionBuffer(
  buffer: ScriptTransactionBuffer,
  handlers: TransactionCommitHandlers,
  now: number
): Promise<{ buffer: ScriptTransactionBuffer; result: TransactionApplyResult }> {
  if (buffer.state.status !== "active") {
    return {
      buffer,
      result: {
        ok: false,
        lastError: 301,
        lastMessage: "No active transaction"
      }
    };
  }

  const errors: string[] = [];
  for (const operation of buffer.operations) {
    const applyResult = await handlers.applyField(operation);
    if (!applyResult.ok) {
      const errorCode = normalizeErrorCode(applyResult.lastError);
      errors.push(
        `[${operation.fieldName}] ${applyResult.lastMessage || `Error ${errorCode}`}`
      );
      break;
    }
  }

  if (errors.length > 0) {
    if (handlers.revert) {
      await handlers.revert();
    }
    const failedState: ScriptTransactionState = {
      ...buffer.state,
      status: "failed",
      completedAt: Math.max(1, Math.round(now)),
      lastError: 1,
      lastMessage: `Transaction failed: ${errors.join(" | ")}`
    };
    return {
      buffer: {
        state: failedState,
        operations: [...buffer.operations]
      },
      result: {
        ok: false,
        lastError: failedState.lastError,
        lastMessage: failedState.lastMessage
      }
    };
  }

  if (handlers.commit) {
    const commitResult = await handlers.commit();
    if (!commitResult.ok) {
      if (handlers.revert) {
        await handlers.revert();
      }
      const errorCode = normalizeErrorCode(commitResult.lastError);
      const failedState: ScriptTransactionState = {
        ...buffer.state,
        status: "failed",
        completedAt: Math.max(1, Math.round(now)),
        lastError: errorCode,
        lastMessage: commitResult.lastMessage || `Commit failed (${errorCode})`
      };
      return {
        buffer: {
          state: failedState,
          operations: [...buffer.operations]
        },
        result: {
          ok: false,
          lastError: failedState.lastError,
          lastMessage: failedState.lastMessage
        }
      };
    }
  }

  const committedState: ScriptTransactionState = {
    ...buffer.state,
    status: "committed",
    completedAt: Math.max(1, Math.round(now)),
    lastError: 0,
    lastMessage: undefined
  };
  return {
    buffer: {
      state: committedState,
      operations: []
    },
    result: {
      ok: true,
      lastError: 0
    }
  };
}

export async function revertTransactionBuffer(
  buffer: ScriptTransactionBuffer,
  now: number,
  revert?: () => Promise<TransactionApplyResult>
): Promise<{ buffer: ScriptTransactionBuffer; result: TransactionApplyResult }> {
  if (buffer.state.status !== "active") {
    return {
      buffer,
      result: {
        ok: false,
        lastError: 301,
        lastMessage: "No active transaction"
      }
    };
  }

  if (revert) {
    const reverted = await revert();
    if (!reverted.ok) {
      const errorCode = normalizeErrorCode(reverted.lastError);
      const failedState: ScriptTransactionState = {
        ...buffer.state,
        status: "failed",
        completedAt: Math.max(1, Math.round(now)),
        lastError: errorCode,
        lastMessage: reverted.lastMessage || `Revert failed (${errorCode})`
      };
      return {
        buffer: {
          state: failedState,
          operations: [...buffer.operations]
        },
        result: {
          ok: false,
          lastError: failedState.lastError,
          lastMessage: failedState.lastMessage
        }
      };
    }
  }

  const revertedState: ScriptTransactionState = {
    ...buffer.state,
    status: "reverted",
    completedAt: Math.max(1, Math.round(now)),
    operationCount: 0,
    lastError: 0,
    lastMessage: undefined
  };
  return {
    buffer: {
      state: revertedState,
      operations: []
    },
    result: {
      ok: true,
      lastError: 0
    }
  };
}
