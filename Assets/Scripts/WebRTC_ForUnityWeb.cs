using System;
using UnityEngine;
using UnityEngine.UI;

public class WebRTC_ForUnityWeb : MonoBehaviour
{
    [SerializeField] private string _signalingServerUrl;
    [SerializeField] private int _sendWidth;
    [SerializeField] private int _sendHeight;
    [SerializeField] private int _videoFrameRate;
    [SerializeField] private Camera _streamCamera;
    [SerializeField] private Button _button;
    [SerializeField] private RawImage _localPreview;
    [SerializeField] private RawImage _remotePreview;

    private bool _isWebGPU;
    private RenderTexture _sendTexture;
    private RenderTexture _receiveTexture;
    private IntPtr _receiveTexturePtr;
    private bool _isRenderLocalVideo;
    private bool _isRenderRemoteVideo;

    private void Awake()
    {
        WebRtcForUnityWebLib.OnLocalVideoTrack += OnLocalVideoTrack;
        WebRtcForUnityWebLib.OnRemoteVideoTrack += OnRemoteVideoTrack;
    }

    void Start()
    {
        Debug.Log($"=-== Application.platform: {Application.platform}");
        _isWebGPU = SystemInfo.graphicsDeviceType == UnityEngine.Rendering.GraphicsDeviceType.WebGPU;
        Setup();
        _button.onClick.AddListener(Connect);
    }

    private void Update()
    {
        RenderVideoTrack();
    }

    private void Setup()
    {
        _sendTexture = new RenderTexture(
            _sendWidth,
            _sendHeight,
            24,
            RenderTextureFormat.ARGB32,
            0
        );
        _sendTexture.Create();
        _ = _sendTexture.colorBuffer;
        var sendTexturePtr = _sendTexture.GetNativeTexturePtr();
        _streamCamera.targetTexture = _sendTexture;
        _localPreview.texture = _sendTexture;
        WebRtcForUnityWebLib.WebRtcForUnityWebSetup(
            _isWebGPU ? 1 : 0,
            _signalingServerUrl,
            _sendWidth,
            _sendHeight,
            _videoFrameRate,
            sendTexturePtr,
            WebRtcForUnityWebLib.OnLocalVideoTrackCreated,
            WebRtcForUnityWebLib.OnRemoteVideoTrackGenerated
        );
    }

    private void Connect()
    {
        WebRtcForUnityWebLib.WebRtcForUnityWebConnect();
    }

    private void OnLocalVideoTrack()
    {
        Debug.Log($"=-== OnLocalVideoTrack");
        _isRenderLocalVideo = true;
    }

    private void OnRemoteVideoTrack(int width, int height)
    {
        Debug.Log($"=-== OnRemoteVideoTrack: {width}x{height}");
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

    private void RenderVideoTrack()
    {
        if (Application.platform != RuntimePlatform.WebGLPlayer) return;

        if (_isRenderLocalVideo)
        {
            if (_isWebGPU)
            {
                WebRtcForUnityWebLib.WebRtcForUnityWebRenderLocalVideoTrackWebGPU();
            }
            else
            {
                WebRtcForUnityWebLib.WebRtcForUnityWebRenderLocalVideoTrackWebGL();
            }
        }

        if (_isRenderRemoteVideo)
        {
            if (_isWebGPU)
            {
                WebRtcForUnityWebLib.WebRtcForUnityWebRenderRemoteVideoTrackWebGPU(_receiveTexturePtr);
            }
            else
            {
                WebRtcForUnityWebLib.WebRtcForUnityWebRenderRemoteVideoTrackWebGL(_receiveTexturePtr);
            }
        }
    }
}
