import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  Check,
  X,
  Shield
} from 'lucide-react';
import { connect, Room, RemoteParticipant } from 'twilio-video';
import type { RemoteTrack } from 'twilio-video';
import consultationService from '../../../services/consultation';
import type { ConsultationStatusResponse } from '../../../services/consultation';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

type ErrorType = 'unauthorized' | 'not_found' | 'forbidden' | 'network' | 'general' | null;

interface DeviceStatus {
  camera: 'checking' | 'granted' | 'denied' | 'error';
  microphone: 'checking' | 'granted' | 'denied' | 'error';
}

export default function ConsultationRoomPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  // State
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [consultationStatus, setConsultationStatus] = useState<ConsultationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  
  // Device preview state
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ camera: 'checking', microphone: 'checking' });
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  // Media controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Remote participant state
  const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(false);

  const isDoctor = user?.role === 'doctor';

  // Helper to classify error type
  const classifyError = (err: unknown): { message: string; type: ErrorType } => {
    const error = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.message || 'An error occurred';
    
    if (status === 401) {
      return { message: 'Your session has expired. Please login again.', type: 'unauthorized' };
    } else if (status === 403) {
      return { message: 'You do not have permission to access this consultation.', type: 'forbidden' };
    } else if (status === 404) {
      return { message: 'Consultation not found.', type: 'not_found' };
    } else if (!navigator.onLine || error.message?.includes('Network')) {
      return { message: 'Network error. Please check your connection.', type: 'network' };
    }
    return { message: detail, type: 'general' };
  };

  // Fetch consultation status - runs on mount and is stable
  useEffect(() => {
    const loadStatus = async () => {
      if (!appointmentId) return;
      
      try {
        const status = await consultationService.getConsultationStatus(parseInt(appointmentId));
        setConsultationStatus(status);
        setRemainingTime(status.remaining_seconds);
        setError(null);
        setErrorType(null);
        
        if (status.status === 'in_progress') {
          setElapsedTime(status.elapsed_seconds);
        }
      } catch (err: unknown) {
        const { message, type } = classifyError(err);
        setError(message);
        setErrorType(type);
      }
    };
    
    loadStatus();
  }, [appointmentId]);

  // Initialize device preview in waiting room
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const initDevicePreview = async () => {
      // Check camera using native getUserMedia for preview
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
        
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setPreviewStream(stream);
        setDeviceStatus({ camera: 'granted', microphone: 'granted' });
      } catch (err) {
        console.error('Failed to get media devices:', err);
        // Try just video
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          
          if (cancelled) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          setPreviewStream(stream);
          setDeviceStatus(prev => ({ ...prev, camera: 'granted' }));
        } catch {
          setDeviceStatus(prev => ({ ...prev, camera: 'denied' }));
        }
        
        // Try just audio
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!cancelled) {
            // We just need to verify audio works, don't need to keep this stream
            audioStream.getTracks().forEach(track => track.stop());
            setDeviceStatus(prev => ({ ...prev, microphone: 'granted' }));
          } else {
            audioStream.getTracks().forEach(track => track.stop());
          }
        } catch {
          setDeviceStatus(prev => ({ ...prev, microphone: 'denied' }));
        }
      }
    };
    
    if (connectionState === 'disconnected') {
      initDevicePreview();
    }
    
    // Cleanup on unmount or when connectionState changes
    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [connectionState]);

  // Attach preview stream to video element
  useEffect(() => {
    console.log('Preview stream effect:', { 
      hasStream: !!previewStream, 
      hasRef: !!previewVideoRef.current,
      streamTracks: previewStream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
    });
    
    if (previewVideoRef.current && previewStream) {
      const videoElement = previewVideoRef.current;
      videoElement.srcObject = previewStream;
      
      // Ensure video plays
      videoElement.play().catch(err => {
        console.error('Failed to play video:', err);
      });
    }
  }, [previewStream]);

  // Fetch status callback for use in other places

  // Fetch status callback for use in other places
  const fetchStatus = useCallback(async () => {
    if (!appointmentId) return;
    
    try {
      const status = await consultationService.getConsultationStatus(parseInt(appointmentId));
      setConsultationStatus(status);
      setRemainingTime(status.remaining_seconds);
      setError(null);
      setErrorType(null);
      
      if (status.status === 'in_progress') {
        setElapsedTime(status.elapsed_seconds);
      }
    } catch (err: unknown) {
      const { message, type } = classifyError(err);
      setError(message);
      setErrorType(type);
    }
  }, [appointmentId]);

  // Handle login redirect
  const handleLoginRedirect = () => {
    logout();
    navigate('/login');
  };

  // Go back based on role
  const handleGoBack = () => {
    // Stop preview stream before navigating
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    
    if (user?.role === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/appointments');
    }
  };

  // Timer effect
  useEffect(() => {
    if (connectionState === 'connected' && consultationStatus?.status === 'in_progress') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [connectionState, consultationStatus?.status]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle remote participant tracks
  const handleTrackSubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video' && remoteVideoRef.current && 'attach' in track) {
      const videoElement = track.attach();
      remoteVideoRef.current.srcObject = videoElement.srcObject;
      setIsRemoteVideoEnabled(true);
    } else if (track.kind === 'audio' && 'attach' in track) {
      track.attach();
    }
  }, []);

  const handleTrackUnsubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video') {
      setIsRemoteVideoEnabled(false);
    }
    if ('detach' in track) {
      track.detach();
    }
  }, []);

  // Handle participant connection
  const handleParticipantConnected = useCallback((participant: RemoteParticipant) => {
    setRemoteParticipant(participant);
    
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed && publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });
    
    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
  }, [handleTrackSubscribed, handleTrackUnsubscribed]);

  const handleParticipantDisconnected = useCallback(() => {
    setRemoteParticipant(null);
    setIsRemoteVideoEnabled(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // Connect to room
  const connectToRoom = useCallback(async () => {
    if (!appointmentId) return;
    
    setConnectionState('connecting');
    setError(null);
    
    try {
      // Get token
      const token = await consultationService.getJoinToken(parseInt(appointmentId));
      
      // Check if we're in dev mode (mock token)
      if (token.token.startsWith('dev_token_')) {
        console.log('Dev mode: Simulating room connection');
        setConnectionState('connected');
        
        // In dev mode, keep using the preview stream as local video
        if (previewStream && localVideoRef.current) {
          localVideoRef.current.srcObject = previewStream;
        }
        
        // Fetch updated status
        await fetchStatus();
        return;
      }
      
      // Connect to Twilio room (production mode)
      const twilioRoom = await connect(token.token, {
        name: token.room_name,
        audio: true,
        video: { width: 640, height: 480 },
        dominantSpeaker: true,
        networkQuality: { local: 1, remote: 1 },
      });
      
      setRoom(twilioRoom);
      setConnectionState('connected');
      
      // Attach local video
      const localParticipant = twilioRoom.localParticipant;
      localParticipant.videoTracks.forEach(publication => {
        if (publication.track && localVideoRef.current) {
          const videoElement = publication.track.attach();
          localVideoRef.current.srcObject = videoElement.srcObject;
        }
      });
      
      // Handle existing participants
      twilioRoom.participants.forEach(handleParticipantConnected);
      
      // Handle new participants
      twilioRoom.on('participantConnected', handleParticipantConnected);
      twilioRoom.on('participantDisconnected', handleParticipantDisconnected);
      
      // Handle room events
      twilioRoom.on('disconnected', (_room, error) => {
        if (error) {
          console.error('Disconnected with error:', error);
          setConnectionState('failed');
          setError(`Disconnected: ${error.message}`);
        } else {
          setConnectionState('disconnected');
        }
      });
      
      twilioRoom.on('reconnecting', () => {
        setConnectionState('reconnecting');
      });
      
      twilioRoom.on('reconnected', () => {
        setConnectionState('connected');
      });
      
      // Fetch updated status
      await fetchStatus();
      
      // Stop preview stream when entering room (camera is now managed by Twilio)
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
      
    } catch (err: unknown) {
      console.error('Failed to connect:', err);
      setConnectionState('failed');
      const { message, type } = classifyError(err);
      setError(message);
      setErrorType(type);
    }
  }, [appointmentId, handleParticipantConnected, handleParticipantDisconnected, fetchStatus, previewStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (room) {
      room.localParticipant.videoTracks.forEach(publication => {
        if (publication.track) {
          if (isVideoEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [room, isVideoEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (room) {
      room.localParticipant.audioTracks.forEach(publication => {
        if (publication.track) {
          if (isAudioEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [room, isAudioEnabled]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerEnabled;
      setIsSpeakerEnabled(!isSpeakerEnabled);
    }
  }, [isSpeakerEnabled]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Start consultation (doctor only)
  const handleStartConsultation = async () => {
    if (!appointmentId) return;
    
    try {
      await consultationService.startConsultation(parseInt(appointmentId));
      await fetchStatus();
    } catch (err: unknown) {
      const { message, type } = classifyError(err);
      setError(message);
      setErrorType(type);
      
      // Handle unauthorized - redirect to login
      if (type === 'unauthorized') {
        setTimeout(() => handleLoginRedirect(), 2000);
      }
    }
  };

  // End consultation (doctor only)
  const handleEndConsultation = async () => {
    if (!appointmentId || !confirm('Are you sure you want to end this consultation?')) return;
    
    try {
      // Disconnect from room
      if (room) {
        room.disconnect();
      }
      
      // End consultation on backend
      await consultationService.endConsultation(parseInt(appointmentId));
      
      // Navigate to summary
      navigate(`/consultation/${appointmentId}/summary`);
    } catch (err: unknown) {
      const { message, type } = classifyError(err);
      setError(message);
      setErrorType(type);
      
      // Handle unauthorized - redirect to login
      if (type === 'unauthorized') {
        setTimeout(() => handleLoginRedirect(), 2000);
      }
    }
  };

  // Leave room
  const handleLeaveRoom = useCallback(() => {
    if (room) {
      room.disconnect();
    }
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    setRoom(null);
    setConnectionState('disconnected');
    
    // Navigate based on role
    if (isDoctor) {
      navigate('/doctor/dashboard');
    } else {
      navigate('/appointments');
    }
  }, [room, previewStream, isDoctor, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [room, previewStream]);

  // Error state with proper handling
  if (error && errorType && !consultationStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            {errorType === 'unauthorized' ? (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-yellow-600" />
              </div>
            ) : errorType === 'forbidden' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
            ) : errorType === 'not_found' ? (
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-slate-400" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {errorType === 'unauthorized' && 'Session Expired'}
              {errorType === 'forbidden' && 'Access Denied'}
              {errorType === 'not_found' && 'Consultation Not Found'}
              {errorType === 'network' && 'Connection Error'}
              {errorType === 'general' && 'Error'}
            </h1>
            <p className="text-slate-600">{error}</p>
          </div>
          
          <div className="space-y-3">
            {errorType === 'unauthorized' ? (
              <Button fullWidth onClick={handleLoginRedirect}>
                Go to Login
              </Button>
            ) : errorType === 'forbidden' ? (
              <Button fullWidth onClick={handleGoBack}>
                Back to Appointments
              </Button>
            ) : (
              <>
                <Button fullWidth onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <button
                  onClick={handleGoBack}
                  className="w-full py-3 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Back to Appointments
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!consultationStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading consultation...</p>
        </div>
      </div>
    );
  }

  // Render waiting room if not connected
  if (connectionState === 'disconnected' || connectionState === 'connecting') {
    const isConnecting = connectionState === 'connecting';
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-linear-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Video Consultation</h1>
            <p className="text-slate-600 mt-2">
              {isDoctor ? consultationStatus.patient.name : consultationStatus.doctor.name}
            </p>
          </div>

          {/* Device Preview */}
          <div className="bg-slate-800 rounded-xl overflow-hidden mb-6 aspect-video relative">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${deviceStatus.camera === 'granted' ? 'block' : 'hidden'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            {deviceStatus.camera !== 'granted' && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    {deviceStatus.camera === 'checking' ? 'Checking camera...' :
                     deviceStatus.camera === 'denied' ? 'Camera access denied' : 'Camera error'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Settings button */}
            <button
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          {/* Device Status Checks */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">Camera</span>
              </div>
              <div className="flex items-center gap-1">
                {deviceStatus.camera === 'granted' ? (
                  <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600 font-medium">Ready</span></>
                ) : deviceStatus.camera === 'checking' ? (
                  <span className="text-slate-500">Checking...</span>
                ) : (
                  <><X className="w-4 h-4 text-red-500" /><span className="text-red-600 font-medium">Denied</span></>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">Microphone</span>
              </div>
              <div className="flex items-center gap-1">
                {deviceStatus.microphone === 'granted' ? (
                  <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600 font-medium">Ready</span></>
                ) : deviceStatus.microphone === 'checking' ? (
                  <span className="text-slate-500">Checking...</span>
                ) : (
                  <><X className="w-4 h-4 text-red-500" /><span className="text-red-600 font-medium">Denied</span></>
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-200 my-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">With</span>
              <span className="font-medium">
                {isDoctor ? consultationStatus.patient.name : consultationStatus.doctor.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Scheduled</span>
              <span className="font-medium">
                {new Date(consultationStatus.scheduled_date).toLocaleDateString()} at{' '}
                {consultationStatus.scheduled_time}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Duration</span>
              <span className="font-medium">{consultationStatus.duration} minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Status</span>
              <span className={`font-medium capitalize ${
                consultationStatus.status === 'in_progress' ? 'text-green-600' :
                consultationStatus.status === 'confirmed' ? 'text-cyan-600' :
                'text-slate-600'
              }`}>
                {consultationStatus.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {consultationStatus.can_join ? (
              <>
                {isDoctor && consultationStatus.status !== 'in_progress' && (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleStartConsultation}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Start Consultation
                  </Button>
                )}
                
                <Button
                  fullWidth
                  size="lg"
                  onClick={connectToRoom}
                  disabled={isConnecting}
                >
                  <Video className="w-5 h-5 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Join Room'}
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">
                  Room opens in {Math.ceil(consultationStatus.time_until_start_seconds / 60)} minutes
                </p>
              </div>
            )}
            
            <button
              onClick={handleGoBack}
              className="w-full py-3 text-slate-600 hover:text-slate-900 font-medium"
            >
              Go Back
            </button>
          </div>
          
          {/* Device permission tip */}
          {(deviceStatus.camera === 'denied' || deviceStatus.microphone === 'denied') && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm">
                <strong>Tip:</strong> To enable camera/microphone, click the camera icon in your browser's address bar and allow permissions.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main consultation room
  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-slate-900 flex flex-col"
    >
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' :
              connectionState === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-white text-sm capitalize">{connectionState}</span>
          </div>
          
          {remoteParticipant && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Users className="w-4 h-4" />
              <span>2 participants</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4 text-slate-300" />
            <span className="text-white font-mono text-sm">
              {formatTime(elapsedTime)}
            </span>
            {remainingTime > 0 && remainingTime < 300 && (
              <span className="text-yellow-400 text-xs">
                ({formatTime(remainingTime)} left)
              </span>
            )}
          </div>
          
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-1 relative p-4">
        {/* Remote Video (Main) */}
        <div className="absolute inset-4 bg-slate-800 rounded-2xl overflow-hidden">
          {remoteParticipant && isRemoteVideoEnabled ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl text-white font-bold">
                  {(isDoctor ? consultationStatus?.patient.name : consultationStatus?.doctor.name)?.[0] || '?'}
                </span>
              </div>
              <p className="text-slate-400">
                {remoteParticipant ? 'Camera is off' : 'Waiting for participant...'}
              </p>
            </div>
          )}
          
          {/* Remote participant name */}
          {remoteParticipant && (
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 rounded-full">
              <span className="text-white text-sm">
                {isDoctor ? consultationStatus?.patient.name : consultationStatus?.doctor.name}
              </span>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-8 right-8 w-48 h-36 bg-slate-700 rounded-xl overflow-hidden shadow-lg border-2 border-slate-600">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-slate-500" />
            </div>
          )}
          
          {/* Your name */}
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded">
            <span className="text-white text-xs">You</span>
          </div>
        </div>

        {/* Connection Error */}
        {connectionState === 'failed' && (
          <div className="absolute inset-4 bg-slate-800/90 rounded-2xl flex flex-col items-center justify-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-white text-xl font-semibold mb-2">Connection Lost</h3>
            <p className="text-slate-400 mb-6">{error || 'Failed to connect to the video room'}</p>
            <Button onClick={connectToRoom}>
              <RefreshCw className="w-5 h-5 mr-2" />
              Reconnect
            </Button>
          </div>
        )}

        {/* Reconnecting overlay */}
        {connectionState === 'reconnecting' && (
          <div className="absolute inset-4 bg-slate-800/80 rounded-2xl flex flex-col items-center justify-center">
            <RefreshCw className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
            <p className="text-white text-lg">Reconnecting...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mic */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isVideoEnabled 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isSpeakerEnabled 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            {isSpeakerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* End Call */}
          {isDoctor ? (
            <button
              onClick={handleEndConsultation}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handleLeaveRoom}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="flex items-center justify-center mt-4 text-slate-400 text-sm">
          {isDoctor ? (
            <span>As the doctor, you control when to end this consultation</span>
          ) : (
            <span>The doctor will end the consultation when complete</span>
          )}
        </div>
      </div>
    </div>
  );
}
