import React from 'react';

interface MusicInvitationModalProps {
  inviterName: string;
  onAccept: () => void;
  onDecline: () => void;
}

const MusicInvitationModal: React.FC<MusicInvitationModalProps> = ({
  inviterName,
  onAccept,
  onDecline
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Lời mời nghe nhạc</h3>
        <p className="mb-6 text-gray-700">
          <span className="font-medium">{inviterName}</span> muốn nghe nhạc cùng bạn. Khi bạn chấp nhận,
          cả hai sẽ cùng nghe và điều khiển danh sách phát nhạc.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Từ chối
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Đồng ý nghe nhạc
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicInvitationModal;
