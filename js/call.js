// Calls Component
class CallsComponent {
    constructor(app) {
        this.app = app;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isInCall = false;
        this.isCaller = false;
        this.callType = null;
        this.isMuted = false;
        this.isVideoEnabled = true;
        this.activeCall = null;
    }

    async startCall(userId, callType) {
        try {
            this.isCaller = true;
            this.callType = callType;
            
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true
            });
            
            // Show local video
            document.getElementById('localVideo').srcObject = this.localStream;
            
            // Create call record in database
            const { data: call, error } = await this.app.supabase
                .from('calls')
                .insert({
                    caller_id: this.app.currentUser.id,
                    receiver_id: userId,
                    call_type: callType,
                    status: 'ringing'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.activeCall = call;
            
            // Show call interface
            document.getElementById('callInterface').classList.add('active');
            document.getElementById('callStatus').textContent = 'Calling...';
            document.getElementById('callerName').textContent = `Calling ${this.app.components.messages.activeChat?.name || 'User'}`;
            
            // Set up WebRTC connection
            await this.setupPeerConnection();
            
        } catch (error) {
            console.error('Error starting call:', error);
            Utils.showError('Failed to start call');
        }
    }

    async handleIncomingCall(callData) {
        const { data: caller } = await this.app.supabase
            .from('profiles')
            .select('*')
            .eq('id', callData.caller_id)
            .single();

        if (caller) {
            document.getElementById('incomingCallName').textContent = caller.name;
            document.getElementById('incomingCallAvatar').src = caller.avatar;
            document.getElementById('incomingCallType').textContent = 
                callData.call_type === 'video' ? 'Video Call' : 'Voice Call';
            
            this.activeCall = callData;
            document.getElementById('incomingCallModal').classList.add('active');
        }
    }

    async acceptCall() {
        try {
            document.getElementById('incomingCallModal').classList.remove('active');
            
            this.isCaller = false;
            this.callType = this.activeCall.call_type;
            
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: this.callType === 'video',
                audio: true
            });
            
            // Show local video
            document.getElementById('localVideo').srcObject = this.localStream;
            
            // Update call status
            await this.app.supabase
                .from('calls')
                .update({ status: 'active' })
                .eq('id', this.activeCall.id);
            
            // Show call interface
            document.getElementById('callInterface').classList.add('active');
            document.getElementById('callStatus').textContent = 'Connected';
            document.getElementById('callerName').textContent = `In call with ${this.activeCall.caller_name}`;
            
            // Set up WebRTC connection
            await this.setupPeerConnection();
            
        } catch (error) {
            console.error('Error accepting call:', error);
            Utils.showError('Failed to accept call');
        }
    }

    async endCall() {
        if (this.activeCall) {
            await this.app.supabase
                .from('calls')
                .update({ status: 'ended' })
                .eq('id', this.activeCall.id);
        }
        
        this.cleanupCall();
    }

    cleanupCall() {
        // Stop media streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Hide call interface
        document.getElementById('callInterface').classList.remove('active');
        document.getElementById('incomingCallModal').classList.remove('active');
        
        this.activeCall = null;
        this.isInCall = false;
        this.isCaller = false;
        this.callType = null;
        this.isMuted = false;
        this.isVideoEnabled = true;
    }

    async setupPeerConnection() {
        try {
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };
            
            this.peerConnection = new RTCPeerConnection(configuration);
            
            // Add local stream to connection
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }
            
            // Handle incoming stream
            this.peerConnection.ontrack = (event) => {
                this.remoteStream = event.streams[0];
                document.getElementById('remoteVideo').srcObject = this.remoteStream;
            };
            
            // Create and set local description
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('WebRTC offer created');
            
        } catch (error) {
            console.error('Error setting up WebRTC:', error);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            this.isMuted = !this.isMuted;
            document.getElementById('muteBtn').innerHTML = this.isMuted ? 
                '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            this.isVideoEnabled = !this.isVideoEnabled;
            document.getElementById('videoToggleBtn').innerHTML = this.isVideoEnabled ? 
                '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        }
    }

    setupEventListeners() {
        // Call controls
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('acceptCallBtn').addEventListener('click', () => this.acceptCall());
        document.getElementById('declineCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('videoToggleBtn').addEventListener('click', () => this.toggleVideo());
    }
}