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
        o.ws.onmessage = async function (evt) {
            var msg = JSON.parse(evt.data);
            if (o.pc === null) CreatePeer();
            if (msg.sdp) {
                console.log('=-== SetRemoteDescription:' + msg.type);
                await o.pc.setRemoteDescription(msg);
                if (msg.type === 'offer') {
                    const answer = await o.pc.createAnswer();
                    await o.pc.setLocalDescription(answer);
                    SignalingSendMessage(o.pc.localDescription);
                }
            } else if (msg.candidate) {
                await o.pc.addIceCandidate(msg);
            }
        }
    },

    $SignalingSendMessage: function (msg) {
        var json = JSON.stringify(msg);
        o.ws.send(json);
    },

    $CreatePeer: function () {
        console.log('=-== CreatePC');
        o.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        o.pc.onicecandidate = function (evt) {
            console.log('=-== On Ice');
            if (evt.candidate === null) return;
            SignalingSendMessage({
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
                o.video.onloadedmetadata = o.video.onresize = function (evt) {
                    {{{makeDynCall('vii')}}}(
                        o.dlgOnRemoteVideoTrackGenerated,
                        o.video.videoWidth,
                        o.video.videoHeight
                    );
                };
                o.video.srcObject = new MediaStream([evt.track]);
                o.video.muted = true;
                o.video.play();
            }
        }
        CreateVideoTrack();
        {{{makeDynCall('v')}}}(o.dlgOnLocalVideoTrackCreated, null);
    },

    $CreateVideoTrack: function () {
        console.log('=-== CreateVideoTrack');
        o.cnv = document.createElement('canvas');
        o.cnv.width = o.sendWidth;
        o.cnv.height = o.sendHeight;
        o.ctx = o.cnv.getContext('2d');
        o.imageData = o.ctx.createImageData(o.sendWidth, o.sendHeight);
        var stream = o.cnv.captureStream();
        var track = stream.getVideoTracks()[0];
        o.pc.addTrack(track, stream);
    },

    RenderLocalVideoTrack: function () {
        // GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, o.frameBuffer);
        // GLctx.framebufferTexture2D(
        //     GLctx.FRAMEBUFFER,
        //     GLctx.COLOR_ATTACHMENT0,
        //     GLctx.TEXTURE_2D,
        //     o.sendTexture,
        //     0
        // );
        // o.canRead = (GLctx.checkFramebufferStatus(GLctx.FRAMEBUFFER) === GLctx.FRAMEBUFFER_COMPLETE);
        // GLctx.readPixels(0, 0, o.width, o.height, GLctx.RGBA, GLctx.UNSIGNED_BYTE, o.buffer);
        // GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, null);
        var fb = GLctx.createFramebuffer();
        GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, fb);
        GLctx.framebufferTexture2D(GLctx.FRAMEBUFFER, GLctx.COLOR_ATTACHMENT0, GLctx.TEXTURE_2D, o.sendTexture, 0);
        var res = new Uint8Array(o.sendWidth * o.sendHeight * 4);
        GLctx.readPixels(0, 0, o.sendWidth, o.sendHeight, GLctx.RGBA, GLctx.UNSIGNED_BYTE, res);

        o.imageData.data.set(res);
        o.ctx.putImageData(o.imageData, 0, 0);
        GLctx.deleteFramebuffer(fb);
    },

    // RenderLocalVideoTrack: function () {
    //     // var fb = GLctx.createFramebuffer();
    //     // GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, fb);
    //     // GLctx.framebufferTexture2D(GLctx.FRAMEBUFFER, GLctx.COLOR_ATTACHMENT0, GLctx.TEXTURE_2D, o.sendTexture, 0);
    //     GLctx.bindTexture(GLctx.TEXTURE_2D, o.sendTexture);
    //     GLctx.pixelStorei(GLctx.UNPACK_FLIP_Y_WEBGL, true);
    //     var res = new Uint8Array(o.sendWidth * o.sendHeight * 4);
    //     GLctx.readPixels(0, 0, o.sendWidth, o.sendHeight, GLctx.RGBA, GLctx.UNSIGNED_BYTE, res);
    //     GLctx.bindTexture(GLctx.TEXTURE_2D, null);

    //     o.imageData.data.set(res);
    //     o.ctx.putImageData(o.imageData, 0, 0);
    //     //GLctx.deleteFramebuffer(fb);
    // },

    RenderRemoteVideoTrack: function (texPtr) {
        var tex = GL.textures[texPtr];
        GLctx.bindTexture(GLctx.TEXTURE_2D, tex);
        GLctx.pixelStorei(GLctx.UNPACK_FLIP_Y_WEBGL, true);
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