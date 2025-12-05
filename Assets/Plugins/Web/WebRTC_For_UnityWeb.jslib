var WebRTC_For_UnityWeb = {
    $webrtcfuw_pluginObjects: {
        device: null,
        signalingServerUrl: null,
        sendWidth: 0,
        sendHeight: 0,
        sendFPS: 0,
        sendTexture: null,
        ws: null,
        pc: null,
        video: null,
        buffer: null,
        cnv: null,
        ctx: null,
        imageData: null,
        dlgOnLocalVideoTrackCreated: null,
        dlgOnRemoteVideoTrackGenerated: null,
        isLocalTrackRendering: false
    },

    WebRtcForUnityWebSetup: function (
        isWebGPU,
        signalingServerUrlPtr,
        sendWidth,
        sendHeight,
        sendFPS,
        sendTexturePtr,
        dlgOnLocalVideoTrackCreated,
        dlgOnRemoteVideoTrackGenerated
    ) {
        console.log('=-== Setup webgpu' + isWebGPU);
        webrtcfuw_pluginObjects.signalingServerUrl = UTF8ToString(signalingServerUrlPtr);
        webrtcfuw_pluginObjects.sendWidth = sendWidth;
        webrtcfuw_pluginObjects.sendHeight = sendHeight;
        webrtcfuw_pluginObjects.sendFPS = !!sendFPS ? sendFPS : 30;
        webrtcfuw_pluginObjects.dlgOnLocalVideoTrackCreated = dlgOnLocalVideoTrackCreated;
        webrtcfuw_pluginObjects.dlgOnRemoteVideoTrackGenerated = dlgOnRemoteVideoTrackGenerated;
        if (!!isWebGPU) {
            webrtcfuw_pluginObjects.sendTexture = wgpu[sendTexturePtr];
            webrtcfuw_pluginObjects.device = Module.WebGPU.device;
        } else {
            webrtcfuw_pluginObjects.sendTexture = GL.textures[sendTexturePtr];
            webrtcfuw_pluginObjects.buffer = new Uint8Array(sendWidth * sendHeight * 4);
        }
    },

    WebRtcForUnityWebConnect__deps: [
        '$WebRtcForUnityWebSignalingSendMessage',
        '$WebRtcForUnityWebCreatePeer',
        '$WebRtcForUnityWebWebGpuCreateVideoTrack'
    ],
    WebRtcForUnityWebConnect: function () {
        console.log('=-== Connect');
        webrtcfuw_pluginObjects.ws = new WebSocket(webrtcfuw_pluginObjects.signalingServerUrl);
        webrtcfuw_pluginObjects.pc = null;

        webrtcfuw_pluginObjects.ws.onopen = function () {
            console.log('=-== SignalingServer Connected');
        };

        webrtcfuw_pluginObjects.ws.onerror = function (error) {
            console.error('=-== WebSocket Error:', error);
        };

        webrtcfuw_pluginObjects.ws.onclose = function () {
            console.log('=-== WebSocket Closed');
        };

        webrtcfuw_pluginObjects.ws.onmessage = async function (evt) {
            try {
                var msg = JSON.parse(evt.data);

                if (webrtcfuw_pluginObjects.pc === null) {
                    WebRtcForUnityWebCreatePeer();
                }

                if (msg.sdp) {
                    console.log('=-== SetRemoteDescription: ' + msg.type);
                    await webrtcfuw_pluginObjects.pc.setRemoteDescription(new RTCSessionDescription(msg));

                    if (msg.type === 'offer') {
                        const answer = await webrtcfuw_pluginObjects.pc.createAnswer();
                        await webrtcfuw_pluginObjects.pc.setLocalDescription(answer);
                        WebRtcForUnityWebSignalingSendMessage(webrtcfuw_pluginObjects.pc.localDescription);
                    }
                } else if (msg.candidate) {
                    console.log('=-== Adding ICE Candidate');
                    await webrtcfuw_pluginObjects.pc.addIceCandidate(new RTCIceCandidate(msg));
                }
            } catch (error) {
                console.error('=-== Error handling message:', error);
            }
        };
    },

    $WebRtcForUnityWebSignalingSendMessage: function (msg) {
        if (
            webrtcfuw_pluginObjects.ws &&
            webrtcfuw_pluginObjects.ws.readyState === WebSocket.OPEN
        ) {
            var json = JSON.stringify(msg);
            webrtcfuw_pluginObjects.ws.send(json);
            console.log('=-== Sent message:', msg.type);
        } else {
            console.error('=-== WebSocket not ready to send message');
        }
    },

    $WebRtcForUnityWebCreatePeer: function () {
        console.log('=-== CreatePC');

        webrtcfuw_pluginObjects.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });

        webrtcfuw_pluginObjects.pc.onicecandidate = function (evt) {
            if (evt.candidate) {
                console.log('=-== webrtcfuw_pluginObjects. ICE Candidate');
                WebRtcForUnityWebSignalingSendMessage({
                    type: 'candidate',
                    candidate: evt.candidate.candidate,
                    sdpMid: evt.candidate.sdpMid,
                    sdpMLineIndex: evt.candidate.sdpMLineIndex
                });
            } else {
                console.log('=-== ICE Gathering Complete');
            }
        };

        webrtcfuw_pluginObjects.pc.oniceconnectionstatechange = function () {
            console.log('=-== ICE Connection State:', webrtcfuw_pluginObjects.pc.iceConnectionState);
        };

        webrtcfuw_pluginObjects.pc.onconnectionstatechange = function () {
            console.log('=-== Connection State:', webrtcfuw_pluginObjects.pc.connectionState);
        };

        webrtcfuw_pluginObjects.pc.ontrack = function (evt) {
            console.log('=-== webrtcfuw_pluginObjects. Track: ' + evt.track.kind);

            if (evt.track.kind === 'video') {
                webrtcfuw_pluginObjects.video = document.createElement('video');
                webrtcfuw_pluginObjects.video.autoplay = true;
                webrtcfuw_pluginObjects.video.muted = true;
                webrtcfuw_pluginObjects.video.playsInline = true;

                webrtcfuw_pluginObjects.video.onloadedmetadata = function () {
                    console.log('=-== Video metadata loaded: ' + this.videoWidth + 'x' + this.videoHeight);
                    {{{makeDynCall('vii', 'webrtcfuw_pluginObjects.dlgOnRemoteVideoTrackGenerated')}}}(
                        webrtcfuw_pluginObjects.video.videoWidth,
                        webrtcfuw_pluginObjects.video.videoHeight
                    );
                };
                webrtcfuw_pluginObjects.video.onresize = function () {
                    console.log('=-== Video resized: ' + this.videoWidth + 'x' + this.videoHeight);
                    {{{makeDynCall('vii', 'webrtcfuw_pluginObjects.dlgOnRemoteVideoTrackGenerated')}}}(
                        webrtcfuw_pluginObjects.video.videoWidth,
                        webrtcfuw_pluginObjects.video.videoHeight
                    );
                };

                webrtcfuw_pluginObjects.video.srcObject = new MediaStream([evt.track]);
                webrtcfuw_pluginObjects.video.play().catch(function (error) {
                    console.error('=-== Video play error:', error);
                });
            }
        };

        WebRtcForUnityWebWebGpuCreateVideoTrack();
        {{{makeDynCall('v', 'webrtcfuw_pluginObjects.dlgOnLocalVideoTrackCreated')}}}();
        console.log('=-== dlgOnLocalVideoTrackCreated called');
    },

    $WebRtcForUnityWebWebGpuCreateVideoTrack: function () {
        console.log('=-== CreateVideoTrack');

        var cnv = document.createElement('canvas');
        cnv.width = webrtcfuw_pluginObjects.sendWidth;
        cnv.height = webrtcfuw_pluginObjects.sendHeight;
        var ctx = cnv.getContext('2d', { alpha: false });
        var imageData = ctx.createImageData(cnv.width, cnv.height);
        webrtcfuw_pluginObjects.cnv = cnv;
        webrtcfuw_pluginObjects.ctx = ctx;
        webrtcfuw_pluginObjects.imageData = imageData;

        // Capture stream at specific frame rate
        var stream = webrtcfuw_pluginObjects.cnv.captureStream(webrtcfuw_pluginObjects.sendFPS); // 30 fps
        var track = stream.getVideoTracks()[0];
        webrtcfuw_pluginObjects.pc.addTrack(track, stream);
        console.log('=-== Video track added to peer connection');
    },

    WebRtcForUnityWebRenderLocalVideoTrackWebGL: function () {
        try {
            // Create temporary framebuffer to read texture data
            var fb = GLctx.createFramebuffer();
            GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, fb);
            GLctx.framebufferTexture2D(
                GLctx.FRAMEBUFFER,
                GLctx.COLOR_ATTACHMENT0,
                GLctx.TEXTURE_2D,
                webrtcfuw_pluginObjects.sendTexture,
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
                webrtcfuw_pluginObjects.sendWidth, webrtcfuw_pluginObjects.sendHeight,
                GLctx.RGBA,
                GLctx.UNSIGNED_BYTE,
                webrtcfuw_pluginObjects.buffer
            );

            // Cleanup
            GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
            GLctx.deleteFramebuffer(fb);

            // Update canvas
            webrtcfuw_pluginObjects.imageData.data.set(webrtcfuw_pluginObjects.buffer);
            webrtcfuw_pluginObjects.ctx.putImageData(webrtcfuw_pluginObjects.imageData, 0, 0);

        } catch (error) {
            console.error('=-== RenderLocalVideoTrack error:', error);
        }
    },

    WebRtcForUnityWebRenderRemoteVideoTrackWebGL: function (texPtr) {
        if (!webrtcfuw_pluginObjects.video || webrtcfuw_pluginObjects.video.readyState < 2) {
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
                webrtcfuw_pluginObjects.video
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

    WebRtcForUnityWebRenderLocalVideoTrackWebGPU: function () {
        try {
            if (webrtcfuw_pluginObjects.isLocalTrackRendering) {
                console.log('=-== Skip Frame Rendering of LocalVideoTrack');
                return;
            }
            webrtcfuw_pluginObjects.isLocalTrackRendering = true;

            // Create Buffer
            webrtcfuw_pluginObjects.buffer = webrtcfuw_pluginObjects.device.createBuffer({
                size: webrtcfuw_pluginObjects.sendWidth * webrtcfuw_pluginObjects.sendHeight * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            // Create copyTextureToBuffer Command
            var commandEncoder = webrtcfuw_pluginObjects.device.createCommandEncoder();
            commandEncoder.copyTextureToBuffer(
                { texture: webrtcfuw_pluginObjects.sendTexture },
                {
                    buffer: webrtcfuw_pluginObjects.buffer,
                    bytesPerRow: webrtcfuw_pluginObjects.sendWidth * 4
                },
                {
                    width: webrtcfuw_pluginObjects.sendWidth,
                    height: webrtcfuw_pluginObjects.sendHeight
                }
            );

            // Submit Command
            webrtcfuw_pluginObjects.device.queue.submit([commandEncoder.finish()]);
            webrtcfuw_pluginObjects.buffer.mapAsync(GPUMapMode.READ).then(function () {
                var arrayBuffer = webrtcfuw_pluginObjects.buffer.getMappedRange();

                // Render to Streaming Canvas
                webrtcfuw_pluginObjects.imageData.data.set(new Uint8ClampedArray(arrayBuffer));
                webrtcfuw_pluginObjects.ctx.putImageData(webrtcfuw_pluginObjects.imageData, 0, 0);

                // Relase Buffer
                webrtcfuw_pluginObjects.buffer.unmap();
                webrtcfuw_pluginObjects.buffer.destroy();
                webrtcfuw_pluginObjects.buffer = null;
                arrayBuffer = null;

                webrtcfuw_pluginObjects.isLocalTrackRendering = false;
            });
        } catch (error) {
            console.error('=-== RenderLocalVideoTrack error:', error);
        }
    },

    WebRtcForUnityWebRenderRemoteVideoTrackWebGPU: function (texPtr) {
        if (!webrtcfuw_pluginObjects.video || webrtcfuw_pluginObjects.video.readyState < 2) {
            // Video not ready yet
            return;
        }

        try {
            var texture = wgpu[texPtr];
            // Rendering video to texture
            webrtcfuw_pluginObjects.device.queue.copyExternalImageToTexture(
                {
                    source: webrtcfuw_pluginObjects.video,
                    flipY: true
                },
                { texture },
                {
                    width: webrtcfuw_pluginObjects.video.videoWidth,
                    height: webrtcfuw_pluginObjects.video.videoHeight
                },
            );
        } catch (error) {
            console.error('=-== RenderRemoteVideoTrack error:', error);
        }
    },

    WebRtcForUnityWebDisconnect: function () {
        console.log('=-== Disconnect');
        var pc = webrtcfuw_pluginObjects.pc;
        var ws = webrtcfuw_pluginObjects.ws;
        var video = webrtcfuw_pluginObjects.video;
        var cnv = webrtcfuw_pluginObjects.cnv;

        if (pc) {
            pc.close();
            pc = null;
        }

        if (ws) {
            ws.close();
            ws = null;
        }

        if (video) {
            video.onloadedmetadata = null;
            video.onresize = null;
            video.srcObject = null;
            video = null;
        }

        if (cnv) {
            var stream = cnv.captureStream();
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            cnv = null;
        }

        webrtcfuw_pluginObjects.device = null;
        webrtcfuw_pluginObjects.pc = null;
        webrtcfuw_pluginObjects.ws = null;
        webrtcfuw_pluginObjects.video = null;
        webrtcfuw_pluginObjects.cnv = null;
        webrtcfuw_pluginObjects.ctx = null;
        webrtcfuw_pluginObjects.imageData = null;
    },

    WebRtcForUnityWebGetConnectionState: function () {
        if (!webrtcfuw_pluginObjects.pc) return 0; // Disconnected

        switch (webrtcfuw_pluginObjects.pc.connectionState) {
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

autoAddDeps(WebRTC_For_UnityWeb, '$webrtcfuw_pluginObjects');
mergeInto(LibraryManager.library, WebRTC_For_UnityWeb);