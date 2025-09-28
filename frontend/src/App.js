import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

// --- Reusable SVG Icons ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
const VideoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>);
const AudioIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19.5V4.5M8 10.5l-4 4 4 4M16 10.5l4 4-4 4"></path></svg>);

// --- Spinner Component ---
const Spinner = () => (
    <svg className="spinner" viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
    </svg>
);

// --- Modal Components ---
const TeamModal = ({ onClose }) => ( <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>&times;</button><h2>Our Team</h2><div className="team-grid"><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=BK" alt="Bhuvan Kumar S G"/><h3>Bhuvan Kumar S G</h3><p>1BM22CD018</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SD" alt="S Danush"/><h3>S Danush</h3><p>1BM22CD052</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SA" alt="Srujana A Rao"/><h3>Srujana A Rao</h3><p>1BM22CD062</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SBR" alt="Dr. Shambhavi B R"/><h3>Dr. Shambhavi B R</h3><p>Team Guide</p></div></div></div></div> );
const HowItWorksModal = ({ onClose }) => ( <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>&times;</button><h2>How It Works</h2><div className="how-it-works-content"><h4>Step 1: Upload Your Source Video</h4><p>Start by uploading the primary video file you want to modify. This will be the visual base for your new content.</p><h4>Step 2: Provide the Audio Source</h4><p>Upload a sample audio file. Our AI will analyze the voice characteristics to generate new audio in the same voice.</p><h4>Step 3: Enter Your Transcript</h4><p>Provide the text script that you want the person in the video to say. The AI will generate audio from this script and sync the lip movements in the video.</p><h4>Step 4: Generate!</h4><p>Click the generate button and let our AI do the magic. In a few moments, you'll have a new video with perfectly synced audio and visuals.</p></div></div></div> );

// --- Landing Page Component ---
const LandingPage = ({ onGetStarted }) => ( <div className="hero-section"><h1>Transform your content with <span className="highlight">DeepSync</span></h1><p>Go beyond simple sync. Clone a person's likeness and voice, creating a reusable digital avatar. Generate infinite new video content on demand, perfectly animated and synced to your custom scripts.</p><button className="cta-button" onClick={onGetStarted}>Let's Get Started &rarr;</button><div className="features-grid"><div className="feature-card"><div className="feature-icon">📝</div><h3>AI-Powered Sync</h3><p>Our advanced AI analyzes your video to build a photorealistic digital clone. This captures the person's unique likeness, creating a reusable asset for all future content.</p></div><div className="feature-card"><div className="feature-icon">🎬</div><h3>Script Driven Animation</h3><p>Animate your digital avatar with just a script. Our technology generates a natural voice and precise facial movements, transforming your text into a complete, ready-to-use video performance.</p></div><div className="feature-card"><div className="feature-icon">⏱️</div><h3>Hassle-Free Video Generation</h3><p>Simple, intuitive process that delivers professional results without the complexity of traditional video editing.</p></div></div></div> );

// --- Reusable DropZone Component ---
const DropZone = ({ onFileSelect, accept, title, supportedFormats, selectedFile }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const handleClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="upload-box">
            <h4>{title}</h4>
            <div 
                className={`drop-zone ${isDragging ? 'active' : ''}`}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={accept}
                    style={{ display: 'none' }}
                />
                {selectedFile ? (
                    <div className="file-info">
                        <p>{selectedFile.name}</p>
                        <span>File selected. Click to replace.</span>
                    </div>
                ) : (
                    <>
                        <UploadIcon />
                        <p>Click to upload or drag and drop</p>
                        <span>Supports {supportedFormats}</span>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Asset Library Item Component ---
const AssetItem = ({ file }) => {
    const isVideo = file.type.startsWith('video/');
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    return (
        <div className="asset-item">
            <div className="asset-icon">{isVideo ? <VideoIcon /> : <AudioIcon />}</div>
            <div className="asset-details">
                <span className="asset-name">{file.name}</span>
                <span className="asset-size">{formatFileSize(file.size)}</span>
            </div>
        </div>
    );
};

// --- UploaderPage Component ---
const UploaderPage = ({ onGenerateStart, onGenerateFinish }) => {
    const [videoFile, setVideoFile] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [script, setScript] = useState("");
    const [isChecking, setIsChecking] = useState(false);

    const isGenerateDisabled = !videoFile || !audioFile || !script.trim();

    const handleGenerate = async () => {
        if (isGenerateDisabled) {
            alert("Please upload a video, an audio file, and enter a script before generating.");
            return;
        }

        setIsChecking(true);

        const backendUrl = "http://localhost:8000/api";
        const endpoints = [
            { name: 'API Check', url: `${backendUrl}/ai-check` },
            { name: 'Audio Gen', url: `${backendUrl}/audio-gen` },
            { name: 'Video Gen', url: `${backendUrl}/video-gen` }
        ];

        let statusReport = "API Connection Status:\n\n";
        let allConnected = true;

        try {
            const results = await Promise.allSettled(
                endpoints.map(ep => fetch(ep.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                }))
            );

            results.forEach((result, index) => {
                const endpointName = endpoints[index].name;
                if (result.status === 'fulfilled' && result.value.ok) {
                    statusReport += `✅ ${endpointName}: Connected Successfully\n`;
                } else {
                    statusReport += `❌ ${endpointName}: Connection Failed\n`;
                    allConnected = false;
                }
            });

        } catch (error) {
            statusReport += "An unexpected error occurred while checking APIs.";
            allConnected = false;
            console.error("API check error:", error);
        } finally {
            setIsChecking(false);
            alert(statusReport);

            if (allConnected) {
                console.log("All APIs connected. Starting generation process...");
                console.log("Video:", videoFile.name);
                console.log("Audio:", audioFile.name);
                console.log("Script:", script);
                
                onGenerateStart();

                setTimeout(() => {
                    onGenerateFinish();
                }, 5000); 
            }
        }
    };
    
    const uploadedAssets = [videoFile, audioFile].filter(Boolean);

    return (
        <div className="uploader-section">
            <div className="uploader-header">
                <h2>Create Your Video</h2>
                <p>Upload your content and let our AI create perfectly synchronized videos</p>
            </div>
            <div className="uploader-grid">
                <div className="upload-column">
                    <DropZone 
                        onFileSelect={setVideoFile} 
                        accept="video/mp4,video/mov" 
                        title="1. Upload Video" 
                        supportedFormats="MP4, MOV"
                        selectedFile={videoFile}
                    />
                    <DropZone 
                        onFileSelect={setAudioFile} 
                        accept="audio/mpeg,audio/wav" 
                        title="2. Upload Audio" 
                        supportedFormats="MP3, WAV"
                        selectedFile={audioFile}
                    />
                    <div className="upload-box">
                        <h4>3. Script</h4>
                        <textarea 
                            className="script-textarea" 
                            placeholder="Enter your script here..."
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                        />
                        <p className="script-description">Write the script that will guide the AI synchronization process</p>
                    </div>
                    <button 
                        className="generate-button" 
                        onClick={handleGenerate} 
                        disabled={isGenerateDisabled || isChecking}
                    >
                        {isChecking ? <Spinner /> : 'Generate Video'}
                    </button>
                </div>
                <div className="library-column">
                    <div className="asset-library">
                        <h4>Your Asset Library</h4>
                        {uploadedAssets.length > 0 ? (
                            <div className="asset-list">
                                {uploadedAssets.map(file => <AssetItem key={file.name + file.size} file={file} />)}
                            </div>
                        ) : (
                            <p className="empty-library-text">Your uploaded video and audio files will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Processing Page Component ---
const ProcessingPage = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 40); 

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="processing-page-container">
            <div className="processing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
            </div>
            <h2>Processing your video...</h2>
            <p>AI analysis and generates content according to your script.</p>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <span>{progress}% complete</span>
        </div>
    );
};

// --- Results Page Component ---
const ResultsPage = ({ onRestart }) => {
    const handleDownload = () => {
        const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
        const fileName = 'deepsync_generated_video.mp4';

        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="results-page-container">
            <h2>Your Generated Video</h2>
            <div className="results-grid">
                <div className="video-player-mockup">
                    <div className="play-button-mockup">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                    </div>
                    <p>Generated Video Ready</p>
                </div>
                <div className="details-and-actions">
                    <div className="video-details">
                        <h4>Video Details</h4>
                        <div className="details-grid">
                            <span>File Size:</span><strong>24.5 MB</strong>
                            <span>Format:</span><strong>MP4</strong>
                            <span>Duration:</span><strong>01:32</strong>
                            <span>Processing Time:</span><strong>4m 15s</strong>
                        </div>
                    </div>
                    <div className="action-buttons">
                        <button onClick={handleDownload} className="action-button download-button">
                            Download Video
                        </button>
                        <button onClick={onRestart} className="action-button create-another-button">
                            Create Another
                        </button>
                    </div>
                    <div className="note-box">
                        <strong>Note:</strong> The maximum duration for generated videos is 1 minute.
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Footer Component ---
const Footer = () => (
    <footer className="footer">
        <p>&copy; {new Date().getFullYear()} DeepSync. All Rights Reserved.</p>
    </footer>
);

function App() {
    const [page, setPage] = useState('landing');
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

    const handleGenerateStart = () => setPage('processing');
    const handleGenerateFinish = () => setPage('results');
    const handleRestart = () => setPage('uploader');

    return (
        <div className="app-container">
            <div className="stars-container">
                <div id="stars1"></div>
                <div id="stars2"></div>
                <div id="stars3"></div>
            </div>

            {showTeamModal && <TeamModal onClose={() => setShowTeamModal(false)} />}
            {showHowItWorksModal && <HowItWorksModal onClose={() => setShowHowItWorksModal(false)} />}

            <header className="navbar">
                <div className="logo" onClick={() => setPage('landing')} style={{cursor: 'pointer'}}>
                    <img src="/nav.png" alt="DeepSync" className="logo-image" />
                </div>
                <nav className="nav-links">
                    <button className="nav-button" onClick={() => setShowHowItWorksModal(true)}>How it Works</button>
                    <button className="nav-button" onClick={() => setShowTeamModal(true)}>Our Team</button>
                </nav>
            </header>
            
            <main key={page} className="page-content">
                {page === 'landing' && <LandingPage onGetStarted={() => setPage('uploader')} />}
                {page === 'uploader' && <UploaderPage onGenerateStart={handleGenerateStart} onGenerateFinish={handleGenerateFinish} />}
                {page === 'processing' && <ProcessingPage />}
                {page === 'results' && <ResultsPage onRestart={handleRestart} />}
            </main>

            <Footer />
        </div>
    );
}

export default App;