type ConnectionState = 'connected' | 'polling' | 'disconnected';

interface ConnectionStatusProps {
  state: ConnectionState;
}

const stateConfig: Record<ConnectionState, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: 'Live' },
  polling: { color: 'bg-yellow-500', label: 'Syncing' },
  disconnected: { color: 'bg-red-500', label: 'Offline' },
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`inline-block w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.label}</span>
    </div>
  );
}
