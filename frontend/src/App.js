import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

// --- IndexedDB Asset Database ---
// We define this outside the React component so it's a stable utility
const assetDB = {
    db: null,
    dbName: 'DeepSyncAssetDB',
    storeName: 'assets',

    /**
     * Initializes the IndexedDB database.
     */
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve(this.db);
            }

            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    // Use 'id' (which will be the file name) as the key
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("Database initialized successfully");
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Adds an asset (File object) to the database.
     * @param {File} file - The file to save.
     * @param {string} type - 'video' or 'audio'.
     */
    addAsset: function(file, type) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject("DB not initialized");
            }
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            // We store the File object directly. IndexedDB supports this.
            // We use file.name as a unique ID.
            const assetRecord = {
                id: file.name,
                file: file,
                type: type,
                size: file.size,
                lastModified: file.lastModified
            };

            const request = store.put(assetRecord);

            request.onsuccess = () => {
                console.log(`Asset ${file.name} saved.`);
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error("Error adding asset:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Retrieves a single asset (File object) by its ID (file name).
     * @param {string} id - The file name (key) of the asset.
     */
    getAsset: function(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject("DB not initialized");
            }
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = (event) => {
                if (event.target.result) {
                    // We return the actual File object
                    resolve(event.target.result.file);
                } else {
                    reject("Asset not found");
                }
            };
            request.onerror = (event) => {
                console.error("Error getting asset:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Retrieves all saved assets from the database.
     */
    getAssets: function() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject("DB not initialized");
            }
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                // Return the metadata, not the full files, for list display
                const assets = event.target.result.map(record => ({
                    id: record.id,
                    type: record.type,
                    size: record.size
                }));
                resolve(assets);
            };
            request.onerror = (event) => {
                console.error("Error getting all assets:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Deletes an asset by its ID (file name).
     * @param {string} id - The file name (key) of the asset.
     */
    deleteAsset: function(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject("DB not initialized");
            }
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`Asset ${id} deleted.`);
                resolve();
            };
            request.onerror = (event) => {
                console.error("Error deleting asset:", event.target.error);
                reject(event.target.error);
            };
        });
    }
};

// --- Reusable SVG Icons ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
const VideoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>);
const AudioIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19.5V4.5M8 10.5l-4 4 4 4M16 10.5l4 4-4 4"></path></svg>);
const FileTextIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>);

// --- Icons for Choice Page ---
const CloneAudioIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>);
const CreateVideoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="3" x2="9" y2="9"></line><path d="m10 14 2 2 4-4"></path></svg>);

// --- Processing Icons ---
const CameraIconProcessing = () => (<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>);
const MicIconProcessing = () => (<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v3a7 7 0 0 1-14 0v-3"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>);

// --- Spinner Component ---
const Spinner = () => (
    <svg className="spinner" viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
    </svg>
);

// --- Modal Components ---
const TeamModal = ({ onClose }) => ( <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>&times;</button><h2>Our Team</h2><div className="team-grid"><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=BK" alt="Bhuvan Kumar S G"/><h3>Bhuvan Kumar S G</h3><p>1BM22CD018</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SD" alt="S Danush"/><h3>S Danush</h3><p>1BM22CD052</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SA" alt="Srujana A Rao"/><h3>Srujana A Rao</h3><p>1BM22CD062</p></div><div className="team-member"><img src="https://placehold.co/100x100/607d8b/ffffff?text=SBR" alt="Dr. Shambhavi B R"/><h3>Dr. Shambhavi B R</h3><p>Team Guide</p></div></div></div></div> );
const HowItWorksModal = ({ onClose }) => ( <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>&times;</button><h2>How It Works</h2><div className="how-it-works-content"><h4>Step 1: Upload Your Source Video</h4><p>Start by uploading the primary video file you want to modify. This will be the visual base for your new content.</p><h4>Step 2: Provide the Audio Source</h4><p>Upload a sample audio file. Our AI will analyze the voice characteristics to generate new audio in the same voice.</p><h4>Step 3: Enter Your Script</h4><p>Provide the text script that you want the person in the video to say. The AI will generate audio from this script and sync the lip movements in the video.</p><h4>Step 4: Generate!</h4><p>Click the generate button and let our AI do the magic. In a few moments, you'll have a new video with perfectly synced audio and visuals.</p></div></div></div> );

// --- Landing Page Component ---
const LandingPage = ({ onGetStarted }) => ( <div className="hero-section"><h1>Transform your content with <span className="highlight">DeepSync</span></h1><p>Go beyond simple sync. Clone a person's likeness and voice, creating a reusable digital avatar. Generate infinite new video content on demand, perfectly animated and synced to your custom scripts.</p><button className="cta-button" onClick={onGetStarted}>Let's Get Started &rarr;</button><div className="features-grid"><div className="feature-card"><div className="feature-icon">📝</div><h3>AI-Powered Sync</h3><p>Our advanced AI analyzes your video to build a photorealistic digital clone. This captures the person's unique likeness, creating a reusable asset for all future content.</p></div><div className="feature-card"><div className="feature-icon">🎬</div><h3>Script Driven Animation</h3><p>Animate your digital avatar with just a script. Our technology generates a natural voice and precise facial movements, transforming your text into a complete, ready-to-use video performance.</p></div><div className="feature-card"><div className="feature-icon">⏱️</div><h3>Hassle-Free Video Generation</h3><p>Simple, intuitive process that delivers professional results without the complexity of traditional video editing.</p></div></div></div> );

// --- MODIFIED Choice Page Component ---
const ChoicePage = ({ onNavigate }) => (
    <div className="choice-section">
        <div className="choice-header">
            <h2>Choose Your Path</h2>
            <p>What would you like to create today?</p>
        </div>
        <div className="choice-grid">
            <div className="choice-card" onClick={() => onNavigate('cloneAudio')}>
                <div className="choice-card-icon">
                    <CloneAudioIcon />
                </div>
                <h3>Clone Your Own Audio</h3>
                {/* MODIFIED: "transcript" to "script" */}
                <p>Upload an audio sample and script to create a reusable voice clone.</p>
            </div>
            <div className="choice-card" onClick={() => onNavigate('createVideo')}>
                <div className="choice-card-icon">
                    <CreateVideoIcon />
                </div>
                <h3>Create the Video</h3>
                <p>Upload a video and script to generate a new, synchronized video.</p>
            </div>
        </div>
    </div>
);

// --- MODIFIED Reusable DropZone Component ---
const DropZone = ({ onFileSelect, accept, title, supportedFormats, selectedFile, showSaveToggle, isSaveChecked, onSaveToggle }) => {
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
            {/* --- NEW: Save to Library Toggle --- */}
            {showSaveToggle && (
                <div className="save-toggle-wrap">
                    <label htmlFor={`save-${title}`}>Save to Library</label>
                    <label className="toggle-switch">
                        <input type="checkbox" id={`save-${title}`} checked={isSaveChecked} onChange={(e) => onSaveToggle(e.target.checked)} />
                        <span className="slider"></span>
                    </label>
                </div>
            )}
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

// --- MODIFIED Asset Library Item Component ---
// Now accepts data from DB or from state, and action buttons
const AssetItem = ({ asset, onUse, onDelete }) => {
    const isVideo = asset.type.startsWith('video/');
    const isAudio = asset.type.startsWith('audio/');
    
    // Use asset.id (file name) for DB assets, asset.name for state assets
    const name = asset.id || asset.name;

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const getIcon = () => {
        if (isVideo) return <VideoIcon />;
        if (isAudio) return <AudioIcon />;
        return <FileTextIcon />; // Default
    };

    return (
        <div className="asset-item">
            <div className="asset-icon">{getIcon()}</div>
            <div className="asset-details">
                <span className="asset-name" title={name}>{name}</span>
                <span className="asset-size">{formatFileSize(asset.size)}</span>
            </div>
            {/* --- NEW: Action buttons for DB assets --- */}
            <div className="asset-actions">
                {onUse && <button className="asset-btn use" onClick={() => onUse(asset)}>Use</button>}
                {onDelete && <button className="asset-btn delete" onClick={() => onDelete(asset.id)}>Delete</button>}
            </div>
        </div>
    );
};

// --- MODIFIED UploaderPage Component (with DB logic) ---
const UploaderPage = ({ onGenerateStart, onGenerateFinish, mode = 'createVideo' }) => {
    const [videoFile, setVideoFile] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [script, setScript] = useState("");
    const [isChecking, setIsChecking] = useState(false);

    // --- NEW State for DB ---
    const [savedAssets, setSavedAssets] = useState([]);
    const [saveVideo, setSaveVideo] = useState(false);
    const [saveAudio, setSaveAudio] = useState(false);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);

    // --- NEW: Load assets from DB on component mount ---
    useEffect(() => {
        async function initAndLoad() {
            try {
                await assetDB.init();
                await loadAssets();
            } catch (error) {
                console.error("Failed to init or load assets:", error);
            }
        }
        initAndLoad();
    }, []);

    /**
     * Fetches the list of saved assets from IndexedDB.
     */
    const loadAssets = async () => {
        setIsLoadingAssets(true);
        try {
            const assets = await assetDB.getAssets();
            setSavedAssets(assets);
        } catch (error) {
            console.error("Could not load assets:", error);
        } finally {
            setIsLoadingAssets(false);
        }
    };

    /**
     * Handles using a saved asset from the library.
     * @param {object} asset - The asset metadata { id, type, size }.
     */
    const handleUseAsset = async (asset) => {
        console.log(`Using asset: ${asset.id}`);
        try {
            const file = await assetDB.getAsset(asset.id);
            if (asset.type === 'video') {
                setVideoFile(file);
            } else if (asset.type === 'audio') {
                setAudioFile(file);
            }
        } catch (error) {
            console.error("Could not load file from DB:", error);
            alert("Error: Could not retrieve asset file.");
        }
    };

    /**
     * Handles deleting a saved asset from the library.
     * @param {string} assetId - The ID (file name) of the asset to delete.
     */
    const handleDeleteAsset = async (assetId) => {
        console.log(`Deleting asset: ${assetId}`);
        // No alert, just delete
        try {
            await assetDB.deleteAsset(assetId);
            // Refresh the asset list
            await loadAssets();
        } catch (error) {
            console.error("Could not delete asset:", error);
            alert("Error: Could not delete asset.");
        }
    };

    // MODIFIED: Validation logic
    const isGenerateDisabled = mode === 'createVideo'
        ? (!videoFile || !script.trim())
        : (!audioFile || !script.trim());

    const handleGenerate = async () => {
        if (isGenerateDisabled) {
            if (mode === 'createVideo') {
                alert("Please upload a video and enter a script before generating.");
            } else {
                // MODIFIED: "transcript" to "script"
                alert("Please upload an audio file and enter a script before generating.");
            }
            return;
        }

        setIsChecking(true);
        
        // --- NEW: Save files to DB if toggled ---
        try {
            if (mode === 'createVideo' && saveVideo && videoFile) {
                await assetDB.addAsset(videoFile, 'video');
            }
            if (saveAudio && audioFile) {
                await assetDB.addAsset(audioFile, 'audio');
            }
            // Refresh library after saving
            if ((saveVideo && videoFile) || (saveAudio && audioFile)) {
                await loadAssets();
            }
        } catch (error) {
            console.error("Failed to save asset to DB:", error);
            // Don't block generation, just log the error
        }

        // --- API Check (unchanged) ---
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
                if (mode === 'createVideo') {
                    console.log("Mode: Create Video");
                    // ... logs
                } else {
                    console.log("Mode: Clone Audio");
                    // ... logs
                }
                
                onGenerateStart(mode);

                setTimeout(() => {
                    onGenerateFinish();
                }, 5000); 
            }
        }
    };
    
    // "Currently Uploaded" assets (from state)
    const currentUploadedAssets = [videoFile, audioFile].filter(Boolean);

    // Filter saved assets for display
    const savedVideoAssets = savedAssets.filter(a => a.type === 'video');
    const savedAudioAssets = savedAssets.filter(a => a.type ==='audio');

    return (
        <div className="uploader-section">
            <div className="uploader-header">
                {mode === 'createVideo' ? (
                    <>
                        <h2>Create Your Video</h2>
                        <p>Upload your content and let our AI create perfectly synchronized videos</p>
                    </>
                ) : (
                    <>
                        <h2>Clone Your Audio</h2>
                        {/* MODIFIED: "transcript" to "script" */}
                        <p>Upload an audio sample and its matching script to create a voice clone</p>
                    </>
                )}
            </div>
            <div className="uploader-grid">
                <div className="upload-column">
                    
                    {mode === 'createVideo' && (
                        <DropZone 
                            onFileSelect={setVideoFile} 
                            accept="video/mp4,video/mov" 
                            title="1. Upload Video (Required)" 
                            supportedFormats="MP4, MOV"
                            selectedFile={videoFile}
                            // --- NEW Props ---
                            showSaveToggle={true}
                            isSaveChecked={saveVideo}
                            onSaveToggle={setSaveVideo}
                        />
                    )}

                    <DropZone 
                        onFileSelect={setAudioFile} 
                        accept="audio/mpeg,audio/wav" 
                        title={mode === 'createVideo' ? "2. Upload Audio (Optional)" : "1. Upload Audio (Required)"} 
                        supportedFormats="MP3, WAV"
                        selectedFile={audioFile}
                        // --- NEW Props ---
                        showSaveToggle={true}
                        isSaveChecked={saveAudio}
                        onSaveToggle={setSaveAudio}
                    />
                    
                    {mode === 'cloneAudio' && (
                        <div className="upload-box">
                            {/* MODIFIED: "Transcript" to "Script" */}
                            <h4>2. Script (Required)</h4>
                            <textarea 
                                className="script-textarea" 
                                placeholder="Enter your audio script here..."
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                            />
                            {/* MODIFIED: "transcript" to "script" */}
                            <p className="script-description">Paste or type the exact script for the audio file.</p>
                        </div>
                    )}

                    {mode === 'createVideo' && (
                        <div className="upload-box">
                            <h4>3. Script (Required)</h4>
                            <textarea 
                                className="script-textarea" 
                                placeholder="Enter your script here..."
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                            />
                            <p className="script-description">Write the script that will guide the AI synchronization process</p>
                        </div>
                    )}
                    
                    <button 
                        className="generate-button" 
                        onClick={handleGenerate} 
                        disabled={isGenerateDisabled || isChecking}
                    >
                        {isChecking ? <Spinner /> : (mode === 'createVideo' ? 'Generate Video' : 'Clone Audio')}
                    </button>
                </div>
                
                {/* --- MODIFIED: Asset Library Column --- */}
                <div className="library-column">
                    <div className="asset-library">
                        {/* Section 1: Current Uploads */}
                        <h4 className="library-heading">Current Session</h4>
                        {currentUploadedAssets.length > 0 ? (
                            <div className="asset-list">
                                {currentUploadedAssets.map(file => <AssetItem key={file.name + file.size} asset={file} />)}
                            </div>
                        ) : (
                            <p className="empty-library-text">Your uploaded files for this session will appear here.</p>
                        )}
                        
                        {/* Section 2: Saved Videos */}
                        <h4 className="library-heading">Saved Videos</h4>
                        {isLoadingAssets ? <Spinner /> : savedVideoAssets.length > 0 ? (
                            <div className="asset-list">
                                {savedVideoAssets.map(asset => (
                                    <AssetItem 
                                        key={asset.id} 
                                        asset={asset} 
                                        onUse={handleUseAsset} 
                                        onDelete={handleDeleteAsset} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="empty-library-text">No saved videos.</p>
                        )}

                        {/* Section 3: Saved Audio */}
                        <h4 className="library-heading">Saved Audio</h4>
                        {isLoadingAssets ? <Spinner /> : savedAudioAssets.length > 0 ? (
                            <div className="asset-list">
                                {savedAudioAssets.map(asset => (
                                    <AssetItem 
                                        key={asset.id} 
                                        asset={asset} 
                                        onUse={handleUseAsset} 
                                        onDelete={handleDeleteAsset} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="empty-library-text">No saved audio files.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODIFIED Processing Page Component ---
const ProcessingPage = ({ processType = 'createVideo' }) => {
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

    const isVideo = processType === 'createVideo';
    const title = isVideo ? 'Processing your video...' : 'Cloning your audio...';
    // MODIFIED: "transcript" to "script"
    const subtitle = isVideo
        ? 'AI analysis and generates content according to your script.'
        : 'Our AI is analyzing your audio sample and script...';

    return (
        <div className="processing-page-container">
            <div className="processing-icon">
                {isVideo ? <CameraIconProcessing /> : <MicIconProcessing />}
            </div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <span>{progress}% complete</span>
        </div>
    );
};

// --- MODIFIED Results Page Component ---
const ResultsPage = ({ onRestart, resultType = 'createVideo' }) => {
    
    const handleDownload = () => {
        const isVideo = resultType === 'createVideo';
        const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
        const audioUrl = 'https://www.w3schools.com/tags/horse.mp3';
        
        const fileUrl = isVideo ? videoUrl : audioUrl;
        const fileName = isVideo ? 'deepsync_generated_video.mp4' : 'deepsync_cloned_audio.mp3';

        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const isVideoResult = resultType === 'createVideo';

    return (
        <div className="results-page-container">
            <h2>{isVideoResult ? 'Your Generated Video' : 'Your Cloned Audio'}</h2>
            <div className="results-grid">
                
                {isVideoResult ? (
                    <div className="video-player-mockup">
                        <div className="play-button-mockup">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                        </div>
                        <p>Generated Video Ready</p>
                    </div>
                ) : (
                    <div className="audio-player-mockup">
                        <div className="play-button-mockup">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                        </div>
                        <p>Cloned Audio Ready</p>
                    </div>
                )}
                
                <div className="details-and-actions">
                    <div className="video-details">
                        <h4>{isVideoResult ? 'Video Details' : 'Audio Details'}</h4>
                        <div className="details-grid">
                            <span>File Size:</span><strong>{isVideoResult ? '24.5 MB' : '4.2 MB'}</strong>
                            <span>Format:</span><strong>{isVideoResult ? 'MP4' : 'MP3'}</strong>
                            <span>Duration:</span><strong>{isVideoResult ? '01:32' : '01:32'}</strong>
                            <span>Processing Time:</span><strong>{isVideoResult ? '4m 15s' : '1m 20s'}</strong>
                        </div>
                    </div>
                    <div className="action-buttons">
                        <button onClick={handleDownload} className="action-button download-button">
                            {isVideoResult ? 'Download Video' : 'Download Audio'}
                        </button>
                        {/* MODIFIED: onClick passes resultType to onRestart */}
                        <button onClick={() => onRestart(resultType)} className="action-button create-another-button">
                            Create Another
                        </button>
                    </div>
                    <div className="note-box">
                        <strong>Note:</strong> The maximum duration for generated content is 1 minute.
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

// --- MODIFIED App Component (handles routing) ---
function App() {
    const [page, setPage] = useState('landing');
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
    const [processType, setProcessType] = useState('createVideo'); // 'createVideo' or 'cloneAudio'

    // This now receives 'createVideo' or 'cloneAudio'
    const handleGenerateStart = (type) => {
        setProcessType(type); 
        setPage('processing');
    };
    
    const handleGenerateFinish = () => setPage('results');
    
    // MODIFIED: This now routes to the correct uploader page
    const handleRestart = (type) => {
        if (type === 'createVideo') {
            setPage('createVideo');
        } else if (type === 'cloneAudio') {
            setPage('cloneAudio');
        } else {
            setPage('choice'); // Fallback
        }
    };
    
    const handleLogoClick = () => setPage('landing');

    return (
        <div className="app-container">
            <div className="background-aurora"></div>
            <div className="stars-container">
                <div id="stars1"></div>
                <div id="stars2"></div>
                <div id="stars3"></div>
            </div>

            {showTeamModal && <TeamModal onClose={() => setShowTeamModal(false)} />}
            {showHowItWorksModal && <HowItWorksModal onClose={() => setShowHowItWorksModal(false)} />}

            <header className="navbar">
                <div className="logo" onClick={handleLogoClick} style={{cursor: 'pointer'}}>
                    <img src="/nav.png" alt="DeepSync" className="logo-image" />
                </div>
                <nav className="nav-links">
                    <button className="nav-button" onClick={() => setShowHowItWorksModal(true)}>How it Works</button>
                    <button className="nav-button" onClick={() => setShowTeamModal(true)}>Our Team</button>
                </nav>
            </header>
            
            <main key={page} className="page-content">
                {page === 'landing' && <LandingPage onGetStarted={() => setPage('choice')} />}
                {page === 'choice' && <ChoicePage onNavigate={setPage} />}
                
                {page === 'cloneAudio' && <UploaderPage mode="cloneAudio" onGenerateStart={handleGenerateStart} onGenerateFinish={handleGenerateFinish} />}
                {page === 'createVideo' && <UploaderPage mode="createVideo" onGenerateStart={handleGenerateStart} onGenerateFinish={handleGenerateFinish} />}
                
                {page === 'processing' && <ProcessingPage processType={processType} />}
                
                {page === 'results' && <ResultsPage onRestart={handleRestart} resultType={processType} />}
            </main>

            <Footer />
        </div>
    );
}

export default App;

