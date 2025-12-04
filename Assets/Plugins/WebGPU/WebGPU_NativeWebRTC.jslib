var WebGpuNativeWebRTC = {
    $webgpu_o: {
        device: null,
        objects: null,
        signalingServerUrl: null,
        sendWidth: 0,
        sendHeight: 0,
        sendFPS: 30,
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
        remoteVideoTexture: null,
        imageData: null,
        dlgOnLocalVideoTrackCreated: null,
        dlgOnRemoteVideoTrackGenerated: null,
        isLocalTrackRendering: false
    },

    WebGpuSetup: function (
        signalingServerUrlPtr,
        sendWidth,
        sendHeight,
        sendFPS,
        sendTexturePtr,
        dlgOnLocalVideoTrackCreated,
        dlgOnRemoteVideoTrackGenerated
    ) {
        console.log('=-== Setup: videoFPS' + sendFPS);
        webgpu_o.device = Module.WebGPU.device;
        webgpu_o.objects = Module.WebGPU.device.derivedObjects;
        webgpu_o.signalingServerUrl = UTF8ToString(signalingServerUrlPtr);
        webgpu_o.sendWidth = sendWidth;
        webgpu_o.sendHeight = sendHeight;
        webgpu_o.sendFPS = !!sendFPS ? sendFPS : 30;
        webgpu_o.sendTexture = webgpu_o.device.derivedObjects.get(sendTexturePtr);
        // webgpu_o.buffer = webgpu_o.device.createBuffer({
        //     size: sendWidth * sendHeight * 4,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });
        webgpu_o.dlgOnLocalVideoTrackCreated = dlgOnLocalVideoTrackCreated;
        webgpu_o.dlgOnRemoteVideoTrackGenerated = dlgOnRemoteVideoTrackGenerated;
    },

    WebGpuConnect__deps: ['$WebGpuSignalingSendMessage', '$WebGpuCreatePeer', '$WebGpuCreateVideoTrack'],
    WebGpuConnect: function () {
        console.log('=-== Connect');
        webgpu_o.ws = new WebSocket(webgpu_o.signalingServerUrl);
        webgpu_o.pc = null;

        webgpu_o.ws.onopen = function () {
            console.log('=-== SignalingServer Connected');
        };

        webgpu_o.ws.onerror = function (error) {
            console.error('=-== WebSocket Error:', error);
        };

        webgpu_o.ws.onclose = function () {
            console.log('=-== WebSocket Closed');
        };

        webgpu_o.ws.onmessage = async function (evt) {
            try {
                var msg = JSON.parse(evt.data);

                if (webgpu_o.pc === null) {
                    WebGpuCreatePeer();
                }

                if (msg.sdp) {
                    console.log('=-== SetRemoteDescription: ' + msg.type);
                    await webgpu_o.pc.setRemoteDescription(new RTCSessionDescription(msg));

                    if (msg.type === 'offer') {
                        const answer = await webgpu_o.pc.createAnswer();
                        await webgpu_o.pc.setLocalDescription(answer);
                        WebGpuSignalingSendMessage(webgpu_o.pc.localDescription);
                    }
                } else if (msg.candidate) {
                    console.log('=-== Adding ICE Candidate');
                    await webgpu_o.pc.addIceCandidate(new RTCIceCandidate(msg));
                }
            } catch (error) {
                console.error('=-== Error handling message:', error);
            }
        };
    },

    $WebGpuSignalingSendMessage: function (msg) {
        if (webgpu_o.ws && webgpu_o.ws.readyState === WebSocket.OPEN) {
            var json = JSON.stringify(msg);
            webgpu_o.ws.send(json);
            console.log('=-== Sent message:', msg.type);
        } else {
            console.error('=-== WebSocket not ready to send message');
        }
    },

    $WebGpuCreatePeer: function () {
        console.log('=-== CreatePC');

        webgpu_o.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });

        webgpu_o.pc.onicecandidate = function (evt) {
            if (evt.candidate) {
                console.log('=-== webgpu_o. ICE Candidate');
                WebGpuSignalingSendMessage({
                    type: 'candidate',
                    candidate: evt.candidate.candidate,
                    sdpMid: evt.candidate.sdpMid,
                    sdpMLineIndex: evt.candidate.sdpMLineIndex
                });
            } else {
                console.log('=-== ICE Gathering Complete');
            }
        };

        webgpu_o.pc.oniceconnectionstatechange = function () {
            console.log('=-== ICE Connection State:', webgpu_o.pc.iceConnectionState);
        };

        webgpu_o.pc.onconnectionstatechange = function () {
            console.log('=-== Connection State:', webgpu_o.pc.connectionState);
        };

        webgpu_o.pc.ontrack = function (evt) {
            console.log('=-== webgpu_o. Track: ' + evt.track.kind);

            if (evt.track.kind === 'video') {
                webgpu_o.video = document.createElement('video');
                webgpu_o.video.autoplay = true;
                webgpu_o.video.muted = true;
                webgpu_o.video.playsInline = true;

                webgpu_o.video.onloadedmetadata = function () {
                    console.log('=-== Video metadata loaded: ' + webgpu_o.video.videoWidth + 'x' + webgpu_o.video.videoHeight);
                    {{{makeDynCall('vii', 'webgpu_o.dlgOnRemoteVideoTrackGenerated')}}}(
                        webgpu_o.video.videoWidth,
                        webgpu_o.video.videoHeight
                    );
                };
                webgpu_o.video.onresize = function () {
                    console.log('=-== Video resized: ' + webgpu_o.video.videoWidth + 'x' + webgpu_o.video.videoHeight);
                    {{{makeDynCall('vii', 'webgpu_o.dlgOnRemoteVideoTrackGenerated')}}}(
                        webgpu_o.video.videoWidth,
                        webgpu_o.video.videoHeight
                    );
                };

                webgpu_o.video.srcObject = new MediaStream([evt.track]);
                webgpu_o.video.play().catch(function (error) {
                    console.error('=-== Video play error:', error);
                });
            }
        };

        WebGpuCreateVideoTrack();
        {{{makeDynCall('v', 'webgpu_o.dlgOnLocalVideoTrackCreated')}}}();
        console.log('=-== dlgOnLocalVideoTrackCreated called');
    },

    $WebGpuCreateVideoTrack: function () {
        console.log('=-== CreateVideoTrack');

        webgpu_o.cnv = document.createElement('canvas');
        webgpu_o.cnv.width = webgpu_o.sendWidth;
        webgpu_o.cnv.height = webgpu_o.sendHeight;
        webgpu_o.ctx = webgpu_o.cnv.getContext('2d', { alpha: false });
        webgpu_o.imageData = webgpu_o.ctx.createImageData(webgpu_o.sendWidth, webgpu_o.sendHeight);

        // Capture stream at specific frame rate
        var stream = webgpu_o.cnv.captureStream(webgpu_o.sendFPS); // 30 fps
        var track = stream.getVideoTracks()[0];

        document.documentElement.appendChild(webgpu_o.cnv);
        webgpu_o.cnv.style.position = 'absolute';
        webgpu_o.cnv.style.left = webgpu_o.cnv.top = 0;

        webgpu_o.pc.addTrack(track, stream);
        console.log('=-== Video track added to peer connection');
    },

    WebGpuRenderLocalVideoTrack: function () {
        try {
            var start = Date.now();
            if (webgpu_o.isLocalTrackRendering) {
                console.log('=-== Skip Frame Rendering of LocalVideoTrack');
            }
            webgpu_o.isLocalTrackRendering = true;
            var commandEncoder = webgpu_o.device.createCommandEncoder();
            webgpu_o.buffer = webgpu_o.device.createBuffer({
                size: webgpu_o.sendWidth * webgpu_o.sendHeight * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            commandEncoder.copyTextureToBuffer(
                { texture: webgpu_o.sendTexture },
                { buffer: webgpu_o.buffer },
                {
                    width: webgpu_o.sendWidth,
                    height: webgpu_o.sendHeight
                }
            );
            webgpu_o.device.queue.submit([commandEncoder.finish()]);
            webgpu_o.buffer.mapAsync(GPUMapMode.READ).then(function () {
                var arrayBuffer = webgpu_o.buffer.getMappedRange();
                webgpu_o.imageData.data.set(arrayBuffer);
                webgpu_o.ctx.putImageData(webgpu_o.imageData, 0, 0);
                webgpu_o.buffer.unmap();
                webgpu_o.buffer.destroy();
                arrayBuffer = null;
                webgpu_o.isLocalTrackRendering = false;
                console.log('=-== Local Render End: ' + (Date.now() - start));
            });
        } catch (error) {
            console.error('=-== RenderLocalVideoTrack error:', error);
        }
    },

    WebGpuRenderRemoteVideoTrack: function (texPtr) {
        if (!webgpu_o.video || webgpu_o.video.readyState < 2) {
            // Video not ready yet
            return;
        }

        try {
            var texture = webgpu_o.device.derivedObjects.get(texPtr);
            webgpu_o.device.queue.copyExternalImageToTexture(
                { 
                    source: webgpu_o.video, 
                    flipY: true 
                },
                { texture },
                { 
                    width: webgpu_o.video.videoWidth, 
                    height: webgpu_o.video.videoHeight 
                },
            );
        } catch (error) {
            console.error('=-== RenderRemoteVideoTrack error:', error);
        }
    },

    WebGpuDisconnect: function () {
        console.log('=-== Disconnect');

        if (webgpu_o.pc) {
            webgpu_o.pc.close();
            webgpu_o.pc = null;
        }

        if (webgpu_o.ws) {
            webgpu_o.ws.close();
            webgpu_o.ws = null;
        }

        if (webgpu_o.video) {
            webgpu_o.video.srcObject = null;
            webgpu_o.video = null;
        }

        if (webgpu_o.cnv) {
            var stream = webgpu_o.cnv.captureStream();
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            webgpu_o.cnv = null;
        }

        webgpu_o.ctx = null;
        webgpu_o.imageData = null;
    },

    WebGpuGetConnectionState: function () {
        if (!webgpu_o.pc) return 0; // Disconnected

        switch (webgpu_o.pc.connectionState) {
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

autoAddDeps(WebGpuNativeWebRTC, '$webgpu_o');
mergeInto(LibraryManager.library, WebGpuNativeWebRTC);