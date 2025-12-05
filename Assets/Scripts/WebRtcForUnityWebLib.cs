using UnityEngine;
using System.Runtime.InteropServices;
using System;
using AOT;

public class WebRtcForUnityWebLib
{
    public static event Action OnLocalVideoTrack;
    public static event Action<int, int> OnRemoteVideoTrack;

    public static RenderTexture RemoteVideoTrackTexture = null;
    public static IntPtr RemoteVideoTrackTexturePtr = IntPtr.Zero;
 
    [MonoPInvokeCallback(typeof(Action))]
    public static void OnLocalVideoTrackCreated()
    {
        Debug.Log($"=-== WebGpuOnLocalVideoTrackCreated");
        OnLocalVideoTrack?.Invoke();
    }

    [MonoPInvokeCallback(typeof(Action<int, int>))]
    public static void OnRemoteVideoTrackGenerated(int width, int height)
    {
        OnRemoteVideoTrack?.Invoke(width, height);
    }

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebSetup(
        int isWebGPU,
        string signalingServerUrl,
        int sendWidth,
        int sendHeight,
        int videoFrameRate,
        IntPtr sendTexturePtr,
        Action dlgOnLocalVideoTrackCreated,
        Action<int, int> dlgOnRemoteVideoTrackGenerated
    );

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebConnect();

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebRenderLocalVideoTrackWebGL();

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebRenderRemoteVideoTrackWebGL(IntPtr RemoteVideoTrackTexturePtr);

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebRenderLocalVideoTrackWebGPU();

    [DllImport("__Internal")]
    public static extern void WebRtcForUnityWebRenderRemoteVideoTrackWebGPU(IntPtr RemoteVideoTrackTexturePtr);
}

