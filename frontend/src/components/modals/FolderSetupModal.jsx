import { useState } from 'react';
import Modal from '../ui/Modal';

export default function FolderSetupModal({ isOpen, onClose, onCreate, loading = false }) {
    const defaultName = '해봉티켓_동기화';
    const [folderName, setFolderName] = useState('');

    const handleCreateClick = () => {
        onCreate(folderName.trim() || defaultName);
        setFolderName('');
    };

    const handleClose = () => {
        setFolderName('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Google Drive 전용 폴더 설정">
            <div className="space-y-5">
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-foreground">해봉티켓 전용 폴더 만들기</h4>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            해봉티켓이 직접 만든 폴더와 그 안에 백업한 파일만 관리합니다.
                            드라이브의 다른 개인 파일에는 접근하지 않습니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="h-10 flex-1 rounded-xl border-2 border-border px-3 text-sm transition-all focus:border-primary/50 focus:outline-none"
                            value={folderName}
                            onChange={(event) => setFolderName(event.target.value)}
                            placeholder={defaultName}
                            disabled={loading}
                        />
                        <button
                            onClick={handleCreateClick}
                            disabled={loading}
                            className="whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? '설정 중...' : '생성 및 연결'}
                        </button>
                    </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    나중에 사용자가 직접 선택한 Drive 파일을 가져오는 기능은 Google Picker 방식으로 추가할 수 있습니다.
                </p>

                <div className="flex justify-end">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </Modal>
    );
}
