import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, UserPlus, MessageSquare, Zap, Info } from 'lucide-react';
import { useNotificationStore } from '../store/notification.store';
import { formatDateTime } from '../utils';
import { SkeletonList } from '../components/ui/Spinner';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  assign:  { icon: <Zap className="w-3.5 h-3.5" />,         bg: 'bg-neo-yellow',  color: 'text-gray-900' },
  comment: { icon: <MessageSquare className="w-3.5 h-3.5" />, bg: 'bg-neo-lime',    color: 'text-gray-900' },
  invite:  { icon: <UserPlus className="w-3.5 h-3.5" />,     bg: 'bg-neo-pink',    color: 'text-gray-900' },
  info:    { icon: <Info className="w-3.5 h-3.5" />,         bg: 'bg-gray-200',    color: 'text-gray-600' },
};

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleClick = async (id: string, link?: string | null) => {
    await markRead(id);
    if (link) navigate(link);
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-sm btn-secondary gap-1.5">
            <CheckCheck className="w-3.5 h-3.5" /> Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList />
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-neo-yellow rounded-neo border-3 border-gray-900 flex items-center justify-center mx-auto mb-4"
               style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
            <Bell className="w-7 h-7 text-gray-900" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1 text-lg">Tidak ada notifikasi</h3>
          <p className="text-sm text-gray-500 font-medium">Semua notifikasi akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const t = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n.id, n.link)}
                className={`w-full text-left p-4 rounded-neo border-3 transition-all flex items-start gap-3.5 group
                  ${n.isRead
                    ? 'border-gray-300 bg-white hover:bg-neo-cream hover:border-gray-900'
                    : 'border-gray-900 bg-neo-yellow/20 hover:bg-neo-yellow/40'
                  }`}
                style={!n.isRead ? { boxShadow: '3px 3px 0px 0px #1a1a1a' } : {}}
              >
                <div className={`w-9 h-9 rounded-neo border-2 border-gray-900 flex items-center justify-center flex-shrink-0 ${t.bg} ${t.color}`}
                     style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>
                    {n.message}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-3 h-3 rounded bg-neo-red border-2 border-gray-900 flex-shrink-0 mt-1.5" aria-label="Belum dibaca"
                       style={{ boxShadow: '1px 1px 0px 0px #1a1a1a' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
