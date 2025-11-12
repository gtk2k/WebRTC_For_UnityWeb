var NativeWebRTC = {
    $o: {
        signalingServerUrl: null,
        sendWidth: 0,
        sendHeight: 0,
        sendTexture: null,
        ws: null,
        texPtr: null,
        pc: null,
        video: null,
        canRead: null,
        buffer: null,
        frameBuffer: null,
        cnv: null,
        ctx: null,
        imageData: null,
        dlgOnLocalVideoTrackCreated: null,
        dlgOnRemoteVideoTrackGenerated: null
    },

    Setup: function (
        signalingServerUrlPtr,
        sendWidth,
        sendHeight,
        sendTexturePtr,
        dlgOnLocalVideoTrackCreated,
        dlgOnRemoteVideoTrackGenerated
    ) {
        console.log('=-== Setup');
        o.signalingServerUrl = UTF8ToString(signalingServerUrlPtr);
        o.sendWidth = sendWidth;
        o.sendHeight = sendHeight;
        o.sendTexture = GL.textures[sendTexturePtr];
        o.buffer = new Uint8Array(sendWidth * sendHeight * 4);
        o.dlgOnLocalVideoTrackCreated = dlgOnLocalVideoTrackCreated;
        o.dlgOnRemoteVideoTrackGenerated = dlgOnRemoteVideoTrackGenerated;
    },

    Connect__deps: ['$SignalingSendMessage', '$CreatePeer', '$CreateVideoTrack'],
    Connect: function () {
        console.log('=-== Connect');
        o.ws = new WebSocket(o.signalingServerUrl);
        o.pc = null;
        
        o.ws.onopen = function () {
            console.log('=-== SignalingServer Connected');
        };
        
        o.ws.onerror = function (error) {
            console.error('=-== WebSocket Error:', error);
        };
        
        o.ws.onclose = function () {
            console.log('=-== WebSocket Closed');
        };
        
        o.ws.onmessage = async function (evt) {
            try {
                var msg = JSON.parse(evt.data);
                
                if (o.pc === null) {
                    CreatePeer();
                }
                
                if (msg.sdp) {
                    console.log('=-== SetRemoteDescription: ' + msg.type);
                    await o.pc.setRemoteDescription(new RTCSessionDescription(msg));
                    
                    if (msg.type === 'offer') {
                        const answer = await o.pc.createAnswer();
                        await o.pc.setLocalDescription(answer);
                        SignalingSendMessage(o.pc.localDescription);
                    }
                } else if (msg.candidate) {
                    console.log('=-== Adding ICE Candidate');
                    await o.pc.addIceCandidate(new RTCIceCandidate(msg));
                }
            } catch (error) {
                console.error('=-== Error handling message:', error);
            }
        };
    },

    $SignalingSendMessage: function (msg) {
        if (o.ws && o.ws.readyState === WebSocket.OPEN) {
            var json = JSON.stringify(msg);
            o.ws.send(json);
            console.log('=-== Sent message:', msg.type);
        } else {
            console.error('=-== WebSocket not ready to send message');
        }
    },

    $CreatePeer: function () {
        console.log('=-== CreatePC');
        
        o.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
        
        o.pc.onicecandidate = function (evt) {
            if (evt.candidate) {
                console.log('=-== On ICE Candidate');
                SignalingSendMessage({
                    type: 'candidate',
                    candidate: evt.candidate.candidate,
                    sdpMid: evt.candidate.sdpMid,
                    sdpMLineIndex: evt.candidate.sdpMLineIndex
                });
            } else {
                console.log('=-== ICE Gathering Complete');
            }
        };
        
        o.pc.oniceconnectionstatechange = function () {
            console.log('=-== ICE Connection State:', o.pc.iceConnectionState);
        };
        
        o.pc.onconnectionstatechange = function () {
            console.log('=-== Connection State:', o.pc.connectionState);
        };
        
        o.pc.ontrack = function (evt) {
            console.log('=-== On Track: ' + evt.track.kind);
            
            if (evt.track.kind === 'video') {
                o.video = document.createElement('video');
                o.video.autoplay = true;
                o.video.muted = true;
                o.video.playsInline = true;
                
                o.video.onloadedmetadata = function () {
                    console.log('=-== Video metadata loaded: ' + o.video.videoWidth + 'x' + o.video.videoHeight);
                    {{{makeDynCall('vii')}}}(
                        o.dlgOnRemoteVideoTrackGenerated,
                        o.video.videoWidth,
                        o.video.videoHeight
                    );
                };
                
                o.video.onresize = function () {
                    console.log('=-== Video resized: ' + o.video.videoWidth + 'x' + o.video.videoHeight);
                    {{{makeDynCall('vii')}}}(
                        o.dlgOnRemoteVideoTrackGenerated,
                        o.video.videoWidth,
                        o.video.videoHeight
                    );
                };
                
                o.video.srcObject = new MediaStream([evt.track]);
                o.video.play().catch(function(error) {
                    console.error('=-== Video play error:', error);
                });
            }
        };
        
        CreateVideoTrack();
        {{{makeDynCall('v')}}}(o.dlgOnLocalVideoTrackCreated);
    },

    $CreateVideoTrack: function () {
        console.log('=-== CreateVideoTrack');
        
        o.cnv = document.createElement('canvas');
        o.cnv.width = o.sendWidth;
        o.cnv.height = o.sendHeight;
        o.ctx = o.cnv.getContext('2d', { alpha: false });
        o.imageData = o.ctx.createImageData(o.sendWidth, o.sendHeight);
        
        // Capture stream at specific frame rate
        var stream = o.cnv.captureStream(30); // 30 fps
        var track = stream.getVideoTracks()[0];
        
        o.pc.addTrack(track, stream);
        console.log('=-== Video track added to peer connection');
    },

    RenderLocalVideoTrack: function () {
        try {
            // Create temporary framebuffer to read texture data
            var fb = GLctx.createFramebuffer();
            GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, fb);
            GLctx.framebufferTexture2D(
                GLctx.FRAMEBUFFER,
                GLctx.COLOR_ATTACHMENT0,
                GLctx.TEXTURE_2D,
                o.sendTexture,
                0
            );
            
            // Check if framebuffer is complete
            var status = GLctx.checkFramebufferStatus(GLctx.FRAMEBUFFER);
            if (status !== GLctx.FRAMEBUFFER_COMPLETE) {
                console.error('=-== Framebuffer not complete:', status);
                GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
                GLctx.deleteFramebuffer(fb);
                return;
            }
            
            // Read pixels from texture
            GLctx.readPixels(
                0, 0,
                o.sendWidth, o.sendHeight,
                GLctx.RGBA,
                GLctx.UNSIGNED_BYTE,
                o.buffer
            );
            
            // Cleanup
            GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
            GLctx.deleteFramebuffer(fb);
            
            // Update canvas
            o.imageData.data.set(o.buffer);
            o.ctx.putImageData(o.imageData, 0, 0);
            
        } catch (error) {
            console.error('=-== RenderLocalVideoTrack error:', error);
        }
    },

    RenderRemoteVideoTrack: function (texPtr) {
        if (!o.video || o.video.readyState < 2) {
            // Video not ready yet
            return;
        }
        
        try {
            var tex = GL.textures[texPtr];
            GLctx.bindTexture(GLctx.TEXTURE_2D, tex);
            GLctx.pixelStorei(GLctx.UNPACK_FLIP_Y_WEBGL, true);
            
            // Use texSubImage2D for immutable textures
            // This avoids the GL_INVALID_OPERATION error
            GLctx.texSubImage2D(
                GLctx.TEXTURE_2D,
                0,
                0, 0,
                GLctx.RGBA,
                GLctx.UNSIGNED_BYTE,
                o.video
            );
            
            // Set texture parameters
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MAG_FILTER, GLctx.LINEAR);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, GLctx.LINEAR);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_S, GLctx.CLAMP_TO_EDGE);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_T, GLctx.CLAMP_TO_EDGE);
            
            GLctx.bindTexture(GLctx.TEXTURE_2D, null);
            
        } catch (error) {
            console.error('=-== RenderRemoteVideoTrack error:', error);
        }
    },

    Disconnect: function () {
        console.log('=-== Disconnect');
        
        if (o.pc) {
            o.pc.close();
            o.pc = null;
        }
        
        if (o.ws) {
            o.ws.close();
            o.ws = null;
        }
        
        if (o.video) {
            o.video.srcObject = null;
            o.video = null;
        }
        
        if (o.cnv) {
            var stream = o.cnv.captureStream();
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
            o.cnv = null;
        }
        
        o.ctx = null;
        o.imageData = null;
    },

    GetConnectionState: function () {
        if (!o.pc) return 0; // Disconnected
        
        switch (o.pc.connectionState) {
            case 'new': return 1;
            case 'connecting': return 2;
            case 'connected': return 3;
            case 'disconnected': return 4;
            case 'failed': return 5;
            case 'closed': return 0;
            default: return 0;
        }
    }
};

autoAddDeps(NativeWebRTC, '$o');
mergeInto(LibraryManager.library, NativeWebRTC);