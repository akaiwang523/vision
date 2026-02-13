
import React, { useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { AppState, RecognitionResult, LearnedKnowledge } from './types';
import { analyzeImage } from './services/geminiService';
import { RecognitionResultDisplay } from './components/RecognitionResultDisplay';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<LearnedKnowledge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = async (base64: string, type: string, corrections?: Partial<RecognitionResult>) => {
    setAppState(corrections ? AppState.REFINING : AppState.LOADING);
    setError(null);
    try {
      const pureBase64 = base64.split(',')[1];
      const analysisResult = await analyzeImage(pureBase64, type, corrections, knowledgeBase);
      
      // 如果有當前校正，將其存入知識庫（簡單記錄物件名稱的對應）
      if (corrections && result) {
        const newKnowledge: LearnedKnowledge[] = [];
        corrections.objects?.forEach((obj, idx) => {
          if (obj.name !== result.objects[idx]?.name) {
            newKnowledge.push({
              original: result.objects[idx]?.name,
              corrected: obj.name,
              timestamp: Date.now()
            });
          }
        });
        setKnowledgeBase(prev => [...prev, ...newKnowledge].slice(-10)); // 只保留最近 10 筆學習
      }

      setResult(analysisResult);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '分析失敗');
      setAppState(AppState.ERROR);
    }
  };

  const handleRefine = (correctedData: Partial<RecognitionResult>) => {
    if (imagePreview) {
      startAnalysis(imagePreview, mimeType, correctedData);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImagePreview(dataUrl);
        startAnalysis(dataUrl, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsUsingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("無法開啟相機");
      setIsUsingCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setMimeType('image/jpeg');
      setImagePreview(dataUrl);
      setIsUsingCamera(false);
      startAnalysis(dataUrl, 'image/jpeg');
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setIsUsingCamera(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter">
            Vision AI <span className="text-blue-600">Adaptive</span>
          </h2>
          <p className="mt-3 text-gray-500 font-medium italic">「教導 AI 如何看世界」— 透過您的校正進行即時演化</p>
          
          {knowledgeBase.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                已學習 {knowledgeBase.length} 項校正特徵
              </span>
            </div>
          )}
        </div>

        {appState === AppState.IDLE && !isUsingCamera && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </div>
              <span className="font-bold text-gray-700">上傳圖片</span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
            <div onClick={startCamera} className="cursor-pointer bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/20 transition-all group">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </div>
              <span className="font-bold text-gray-700">拍照辨識</span>
            </div>
          </div>
        )}

        {isUsingCamera && (
          <div className="relative max-w-xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black mb-8">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center space-x-4">
              <button onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <div className="w-10 h-10 border-2 border-black rounded-full" />
              </button>
              <button onClick={() => setIsUsingCamera(false)} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </button>
            </div>
          </div>
        )}

        {(appState !== AppState.IDLE) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative group">
                  {imagePreview && <img src={imagePreview} alt="Preview" className="w-full rounded-2xl object-cover" />}
                  {(appState === AppState.LOADING || appState === AppState.REFINING) && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center text-white p-4">
                      <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">{appState === AppState.REFINING ? '正在吸收校正經驗' : '深度邏輯推理中'}</p>
                      <div className="scanner-line !bg-blue-400 mt-2" />
                    </div>
                  )}
                </div>
                <button onClick={reset} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-2xl transition-all">重新開始</button>
              </div>
            </div>

            <div className="lg:col-span-8">
              {error && (
                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center">
                  <p className="text-red-700 font-bold mb-4">{error}</p>
                  <button onClick={reset} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold">重試</button>
                </div>
              )}
              {result && (
                <RecognitionResultDisplay result={result} onRefine={handleRefine} isRefining={appState === AppState.REFINING} />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
