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

    Connect__deps: ['$CreatePeer', '$CreateVideoTrack'],
    Connect: function () {
        console.log('=-== Connect');
        o.ws = new WebSocket(o.signalingServerUrl);
        o.pc = null;
        o.ws.onopen = function () {
            console.log('=-== SignalingServer Connected');
        };
        o.ws.onmessage = async function (evt) {
            var msg = JSON.parse(evt.data);
            if (o.pc === null) CreatePeer();
            if (msg.sdp) {
                console.log(`[SetRemoteDescription ${msg.type}]`);
                await o.pc.setRemoteDescription(msg);
                if (msg.type === 'offer') {
                    const answer = await o.pc.createAnswer();
                    await o.pc.setLocalDescription(answer);
                    o.ws.send(JSON.stringify(o.pc.localDescription.toJSON()));
                }
            } else if (msg.candidate) {
                await o.pc.addIceCandidate(msg);
            }
        }
    },

    $CreatePeer: function () {
        console.log('=-== CreatePC');
        o.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        o.pc.onicecandidate = function (evt) {
            console.log('=-== On Ice');
            if (evt.candidate === null) return;
            o.ws.send({
                type: 'candidate',
                candidate: evt.candidate.candidate,
                sdpMid: evt.candidate.sdpMid,
                sdpMLineIndex: evt.candidate.sdpMLineIndex
            });
        };
        o.pc.ontrack = function (evt) {
            console.log(`=-== On Track: ${evt.track.kind}`);
            if (evt.track.kind === 'video') {
                o.video = document.createElement('video');
                o.video.onloadedmetadata = function (evt) {
                    dynCall(
                        'vii',
                        o.dlgOnRemoteVideoTrackGenerated,
                        [o.video.videoWidth, o.video.videoHeight]
                    );
                };
                o.video.srcObject = new MediaStream([evt.track]);
                o.video.muted = true;
                o.video.play();
            }
        }
        var videoTrack = CreateVideoTrack();
        dynCall('v', o.dlgOnLocalVideoTrackCreated, []);
        o.pc.addTrack(videoTrack);
    },

    $CreateVideoTrack: function () {
        console.log('=-== CreateVideoTrack');
        o.cnv = document.createElement('canvas');
        document.documentElement.appendChild(o.cnv);
        o.cnv.style.position = 'absolute';
        o.cnv.style.left = o.cnv.style.top = 0;
        o.cnv.style.zIndex = 100;
        o.cnv.width = o.sendWidth;
        o.cnv.height = o.sendHeight;
        o.ctx = o.cnv.getContext('2d');
        o.imageData = o.ctx.createImageData(o.sendWidth, o.sendHeight);
        var stream = o.cnv.captureStream();
        var track = stream.getVideoTracks()[0];

        o.frameBuffer = GLctx.createFramebuffer();
        return track;
    },

    RenderLocalVideoTrack: function (trackPtr) {
        GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, o.frameBuffer);
        GLctx.framebufferTexture2D(
            GLctx.FRAMEBUFFER,
            GLctx.COLOR_ATTACHMENT0,
            GLctx.TEXTURE_2D,
            o.sendTexture,
            0
        );
        o.canRead = (GLctx.checkFramebufferStatus(GLctx.FRAMEBUFFER) === GLctx.FRAMEBUFFER_COMPLETE);
        GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
        console.log('=-== canRead: ' + o.canRead);

        GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, o.frameBuffer);
        GLctx.readPixels(0, 0, o.width, o.height, GLctx.RGBA, GLctx.UNSIGNED_BYTE, o.buffer);
        GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
        o.imageData.data.set(o.buffer);
        o.ctx.putImageData(o.imageData, 0, 0);
    },

    RenderRemoteVideoTrack: function (texPtr) {
        var tex = GL.textures[texPtr];
        GLctx.bindTexture(GLctx.TEXTURE_2D, tex);
        GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, o.video);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MAG_FILTER, GLctx.LINEAR);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, GLctx.LINEAR);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_S, GLctx.CLAMP_TO_EDGE);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_T, GLctx.CLAMP_TO_EDGE);
        GLctx.bindTexture(GLctx.TEXTURE_2D, null);
    }
};
autoAddDeps(NativeWebRTC, '$o');
mergeInto(LibraryManager.library, NativeWebRTC);