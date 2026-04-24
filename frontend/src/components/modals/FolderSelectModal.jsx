import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { gdriveApi } from '../../utils/api';

export default function FolderSelectModal({ isOpen, onClose, onSelect, onCreate }) {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const defaultName = '해봉티켓_동기화';

    useEffect(() => {
        if (isOpen) {
            fetchFolders();
            setNewFolderName(''); // 초기화
        }
    }, [isOpen]);

    const fetchFolders = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await gdriveApi.listFolders();
            setFolders(res.data);
        } catch (err) {
            setError('폴더 목록을 불러오지 못했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        const name = newFolderName.trim() || defaultName;
        onCreate(name);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="동기화 폴더 설정">
            <div className="space-y-6">
                {/* 새 폴더 생성 섹션 */}
                <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
                        새 폴더 생성
                    </h4>
                    <div className="flex gap-2 justify-center">
                        <input 
                            className="flex-1 h-10 px-3 text-sm rounded-xl border-2 border-border focus:border-primary/50 focus:outline-none transition-all"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder={defaultName}
                        />
                        <button 
                            onClick={handleCreateClick}
                            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 whitespace-nowrap"
                        >
                            생성 및 연결
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200"></span>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">또는 기존 폴더 선택</span>
                    </div>
                </div>

                {/* 기존 폴더 목록 섹션 */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">드라이브 폴더 목록</h4>
                        <button onClick={fetchFolders} className="text-[10px] font-bold text-primary hover:underline">새로고침</button>
                    </div>
                    
                    <div className="max-h-[240px] overflow-y-auto border-2 border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                        {loading ? (
                            <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">
                                폴더 목록을 불러오는 중...
                            </div>
                        ) : error ? (
                            <div className="p-10 text-center text-sm text-red-500">
                                {error}
                            </div>
                        ) : folders.length === 0 ? (
                            <div className="p-10 text-center text-sm text-muted-foreground">
                                드라이브에 폴더가 없습니다.
                            </div>
                        ) : (
                            folders.map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => onSelect(folder)}
                                    className="w-full text-left p-4 hover:bg-white transition-colors flex items-center gap-3 group"
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform text-slate-400">📁</span>
                                    <span className="text-sm font-bold text-slate-700">{folder.name}</span>
                                    <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">연결하기</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </Modal>
    );
}
