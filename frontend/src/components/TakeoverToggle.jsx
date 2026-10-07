import { useState } from 'react';
import { api } from '../api/client';

export default function TakeoverToggle({ lead, onToggleSuccess }) {
  const [updating, setUpdating] = useState(false);
  const isHumanTakeover = Boolean(lead?.humanTakeover);

  const handleToggle = async () => {
    if (!lead?._id || updating) return;

    setUpdating(true);
    const newTakeoverState = !isHumanTakeover;

    try {
      const updatedLead = await api.updateTakeover(lead._id, newTakeoverState);
      if (onToggleSuccess) {
        onToggleSuccess(updatedLead);
      }
    } catch (err) {
      console.error('Failed to update human takeover:', err);
      alert(`Could not update AI status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="takeover-control">
      <button
        type="button"
        className={`takeover-btn ${!isHumanTakeover ? 'ai-on' : 'ai-off'}`}
        onClick={handleToggle}
        disabled={updating}
        title={!isHumanTakeover ? 'Click to pause AI and take over' : 'Click to re-enable AI response'}
      >
        {updating ? (
          <span className="spinner" style={{ width: 12, height: 12 }}></span>
        ) : !isHumanTakeover ? (
          <>
            <span>🤖</span>
            <span>AI: ON ●</span>
          </>
        ) : (
          <>
            <span>👤</span>
            <span>AI: OFF ○</span>
          </>
        )}
      </button>
    </div>
  );
}
