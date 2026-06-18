import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiXCircle, FiActivity, FiDatabase } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ServerStatusBadge = ({ apiUrl = '/api/health', refreshInterval = 30000 }) => {
  const [health, setHealth] = useState({
    status: 'unknown',
    database: 'unknown',
    timestamp: null,
    uptime: 0,
    uptimeFormatted: '',
    databaseLatency: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchHealth = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
      setError(null);
      setLastCheck(new Date());
    } catch (err) {
      setError(err.message);
      setHealth((prev) => ({ ...prev, status: 'error', database: 'disconnected' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [apiUrl, refreshInterval]);

  const getStatusColor = () => {
    if (loading) return 'bg-gray-400';
    if (error || health.status === 'error') return 'bg-red-500';
    if (health.status === 'degraded') return 'bg-yellow-500';
    if (health.status === 'ok' && health.database === 'connected') return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusIcon = () => {
    if (loading) return null;
    if (error || health.status === 'error') return <FiXCircle className="w-4 h-4" />;
    if (health.status === 'degraded') return <FiAlertCircle className="w-4 h-4" />;
    if (health.status === 'ok' && health.database === 'connected') return <FiCheckCircle className="w-4 h-4" />;
    return null;
  };

  const getTimeSinceLastCheck = () => {
    if (!lastCheck) return 'Nunca';
    const seconds = Math.floor((new Date() - lastCheck) / 1000);
    if (seconds < 60) return `Hace ${seconds}s`;
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    return `Hace ${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Status Badge */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTooltip(!showTooltip)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${getStatusColor()} text-white font-medium text-sm transition-colors duration-300`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={health.status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {getStatusIcon()}
            </motion.div>
          </AnimatePresence>
          <span className="hidden sm:inline">
            {loading ? 'Verificando...' : health.status === 'ok' ? 'Sistema OK' : health.status === 'degraded' ? 'Degradado' : 'Error'}
          </span>
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-2 w-72 bg-gray-900 text-white rounded-lg shadow-xl p-4 text-sm"
            >
              <div className="space-y-3">
                {/* Server Status */}
                <div className="flex items-center gap-2">
                  <FiActivity className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">Servidor:</span>
                  <span className={`ml-auto ${health.status === 'ok' ? 'text-green-400' : health.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {health.status === 'ok' ? 'Activo' : health.status === 'degraded' ? 'Degradado' : 'Error'}
                  </span>
                </div>

                {/* Database Status */}
                <div className="flex items-center gap-2">
                  <FiDatabase className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Base de datos:</span>
                  <span className={`ml-auto ${health.database === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {health.database === 'connected' ? 'Conectada' : 'Desconectada'}
                  </span>
                </div>

                {/* Uptime */}
                {health.uptime > 0 && (
                  <div className="flex items-center gap-2">
                    <FiActivity className="w-4 h-4 text-green-400" />
                    <span className="font-medium">Tiempo activo:</span>
                    <span className="ml-auto text-gray-300">{health.uptimeFormatted}</span>
                  </div>
                )}

                {/* Database Latency */}
                {health.databaseLatency !== null && (
                  <div className="flex items-center gap-2">
                    <FiDatabase className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium">Latencia DB:</span>
                    <span className={`ml-auto ${health.databaseLatency < 100 ? 'text-green-400' : health.databaseLatency < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {health.databaseLatency}ms
                    </span>
                  </div>
                )}

                {/* Last Check */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-xs">Última comprobación:</span>
                  <span className="ml-auto text-gray-400 text-xs">{getTimeSinceLastCheck()}</span>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchHealth();
                  }}
                  disabled={loading}
                  className="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs font-medium transition-colors"
                >
                  {loading ? 'Actualizando...' : 'Actualizar ahora'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ServerStatusBadge;
