import { Button, Heading, Input } from '../ui/primitives.js';
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
                        <Heading as="h4" variant="folderSetup">해봉티켓 전용 폴더 만들기</Heading>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            해봉티켓이 직접 만든 폴더와 그 안에 백업한 파일만 관리합니다.
                            드라이브의 다른 개인 파일에는 접근하지 않습니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            variant="folder"
                            value={folderName}
                            onChange={(event) => setFolderName(event.target.value)}
                            placeholder={defaultName}
                            disabled={loading}
                        />
                        <Button
                            onClick={handleCreateClick}
                            disabled={loading}
                            variant="createFolder"
                        >
                            {loading ? '설정 중...' : '생성 및 연결'}
                        </Button>
                    </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    나중에 사용자가 직접 선택한 Drive 파일을 가져오는 기능은 Google Picker 방식으로 추가할 수 있습니다.
                </p>

                <div className="flex justify-end">
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        variant="cancelFolder"
                    >
                        닫기
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
