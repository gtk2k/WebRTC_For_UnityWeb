using System;
using UnityEngine;
using UnityEngine.UI;

public class WebGL_WebRTC : MonoBehaviour
{
    [SerializeField] private string _signalingServerUrl;
    [SerializeField] private int _sendWidth;
    [SerializeField] private int _sendHeight;
    [SerializeField] private Camera _streamCamera;
    [SerializeField] private Button _button;
    [SerializeField] private RawImage _localPreview;
    [SerializeField] private RawImage _remotePreview;

    private RenderTexture _captureTexture;
    private RenderTexture _sendTexture;
    private RenderTexture _receiveTexture;
    private IntPtr _receiveTexturePtr;
    private bool _isRenderLocalVideo;
    private bool _isRenderRemoteVideo;

    private void Awake()
    {
        NativeWebRTC.OnLocalVideoTrack += OnLocalVideoTrack;
        NativeWebRTC.OnRemoteVideoTrack += OnRemoteVideoTrack;
    }

    void Start()
    {
        NativeWebRTC_Setup();
        _button.onClick.AddListener(Connect);
    }

    private void NativeWebRTC_Setup()
    {
        _captureTexture = new RenderTexture(
            _sendWidth,
            _sendHeight,
            24,
            RenderTextureFormat.ARGB32,
            0
        );
        _sendTexture = new RenderTexture(
            _sendWidth,
            _sendHeight,
            0,
            RenderTextureFormat.ARGB32,
            0
        );
        _sendTexture.Create();
        _ = _sendTexture.colorBuffer;
        var sendTexturePtr = _sendTexture.GetNativeTexturePtr();
        _streamCamera.targetTexture = _captureTexture;
        _localPreview.texture = _captureTexture;
        NativeWebRTC.Setup(
            _signalingServerUrl,
            _sendWidth,
            _sendHeight,
            sendTexturePtr,
            NativeWebRTC.OnLocalVideoTrackCreated,
            NativeWebRTC.OnRemoteVideoTrackGenerated
        );
    }

    private void Connect()
    {
        NativeWebRTC.Connect();
    }

    private void OnLocalVideoTrack()
    {
        _isRenderLocalVideo = true;
    }

    private void OnRemoteVideoTrack(int width, int height)
    {
        if (_receiveTexture != null)
        {
            _receiveTexture.Release();
            DestroyImmediate(_receiveTexture);
        }
        _receiveTexture = new RenderTexture(width, height, 0, RenderTextureFormat.ARGB32, 0);
        _ = _receiveTexture.colorBuffer;
        _receiveTexturePtr = _receiveTexture.GetNativeTexturePtr();
        _remotePreview.texture = _receiveTexture;
        _isRenderRemoteVideo = true;
    }

    private void Update()
    {
        if (_isRenderLocalVideo)
        {
            Graphics.Blit(_captureTexture, _sendTexture);
            NativeWebRTC.RenderLocalVideoTrack();
        }

        if (_isRenderRemoteVideo)
            NativeWebRTC.RenderRemoteVideoTrack(_receiveTexturePtr);
    }
}
