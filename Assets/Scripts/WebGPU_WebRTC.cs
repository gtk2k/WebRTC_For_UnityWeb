using System;
using UnityEngine;
using UnityEngine.UI;

public class WebGPU_WebRTC : MonoBehaviour
{
    [SerializeField] private string _signalingServerUrl;
    [SerializeField] private int _sendWidth;
    [SerializeField] private int _sendHeight;
    [SerializeField] private int _videoFrameRate;
    [SerializeField] private Camera _streamCamera;
    [SerializeField] private Button _button;
    [SerializeField] private RawImage _localPreview;
    [SerializeField] private RawImage _remotePreview;

    private RenderTexture _sendTexture;
    private RenderTexture _receiveTexture;
    private IntPtr _receiveTexturePtr;
    private bool _isRenderLocalVideo;
    private bool _isRenderRemoteVideo;

    private void Awake()
    {
        WebGPU_NativeWebRTC.OnLocalVideoTrack += OnLocalVideoTrack;
        WebGPU_NativeWebRTC.OnRemoteVideoTrack += OnRemoteVideoTrack;
    }

    void Start()
    {
        WebGPU_NativeWebRTC_Setup();
        _button.onClick.AddListener(Connect);
    }

    private void WebGPU_NativeWebRTC_Setup()
    {
        _sendTexture = new RenderTexture(
            _sendWidth,
            _sendHeight,
            0,
            RenderTextureFormat.ARGB32,
            0
        );
        _sendTexture.enableRandomWrite = true;
        _sendTexture.Create();
        _ = _sendTexture.colorBuffer;
        var sendTexturePtr = _sendTexture.GetNativeTexturePtr();
        _streamCamera.targetTexture = _sendTexture;
        _localPreview.texture = _sendTexture;
        WebGPU_NativeWebRTC.WebGpuSetup(
            _signalingServerUrl,
            _sendWidth,
            _sendHeight,
            _videoFrameRate,
            sendTexturePtr,
            WebGPU_NativeWebRTC.WebGpuOnLocalVideoTrackCreated,
            WebGPU_NativeWebRTC.WebGpuOnRemoteVideoTrackGenerated
        );
    }

    private void Connect()
    {
        WebGPU_NativeWebRTC.WebGpuConnect();
    }

    private void OnLocalVideoTrack()
    {
        Debug.Log($"=-== OnLocalVideoTrack");
        _isRenderLocalVideo = true;
    }

    private void OnRemoteVideoTrack(int width, int height)
    {        
        if (_receiveTexture != null)
        {
            _receiveTexture.Release();
            DestroyImmediate(_receiveTexture);
        }
        _receiveTexture = new RenderTexture(
            width, 
            height, 
            0, 
            RenderTextureFormat.ARGB32, 
            0
        );
        _receiveTexture.enableRandomWrite = true;
        _ = _receiveTexture.colorBuffer;
        _receiveTexturePtr = _receiveTexture.GetNativeTexturePtr();
        _remotePreview.texture = _receiveTexture;
        _isRenderRemoteVideo = true;
    }

    private void Update()
    {
        if (_isRenderLocalVideo)
            WebGPU_NativeWebRTC.WebGpuRenderLocalVideoTrack();

        if (_isRenderRemoteVideo)
            WebGPU_NativeWebRTC.WebGpuRenderRemoteVideoTrack(_receiveTexturePtr);
    }
}
