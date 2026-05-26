/**
 * Amplifier-agent host-side provider container config (N3).
 *
 * Volume layout
 * -------------
 * The amplifier-agent engine persists state (session transcripts, metadata)
 * under its XDG state directory. Inside the container that resolves to:
 *
 *     /home/node/.local/state/amplifier-agent/  (= $XDG_STATE_HOME)
 *
 * On the host we materialize a per-agent-group directory under $DATA_DIR so
 * every session for the same agent group shares one state root and survives
 * container restarts:
 *
 *     $DATA_DIR/amplifier-agent/$AGENT_GROUP_ID/
 *         sessions/<sessionId>/
 *             transcript.jsonl
 *             metadata.json
 *
 * We bind-mount the host dir at the container path read-write so the engine
 * can append to transcripts and write metadata. We pre-create the host dir
 * before the spawn — if we let Docker create it on first bind, the dir is
 * owned by root and the (non-root) container user can't write to it.
 *
 * Logging
 * -------
 * AMPLIFIER_AGENT_LOG_LEVEL=info is the default verbosity for production
 * spawns. Higher levels (debug, trace) are reserved for explicit opt-in via
 * future config plumbing.
 */
import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR } from '../config.js';
import {
  registerProviderContainerConfig,
  type ProviderContainerContext,
  type ProviderContainerContribution,
} from './provider-container-registry.js';

export function buildAmplifierAgentContainerConfig(
  ctx: ProviderContainerContext,
): ProviderContainerContribution {
  const hostPath = path.join(DATA_DIR, 'amplifier-agent', ctx.agentGroupId);
  // Pre-create the host dir so the bind mount is owned by the host user, not
  // by root (which is what Docker does when the source path doesn't exist).
  fs.mkdirSync(hostPath, { recursive: true });
  return {
    env: {
      AMPLIFIER_AGENT_LOG_LEVEL: 'info',
    },
    mounts: [
      {
        hostPath,
        containerPath: '/home/node/.local/state/amplifier-agent',
        readonly: false,
      },
    ],
  };
}

registerProviderContainerConfig('amplifier-agent', buildAmplifierAgentContainerConfig);
