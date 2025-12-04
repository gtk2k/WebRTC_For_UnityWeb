using UnityEngine;
using System.Runtime.InteropServices;
using System;
using AOT;

public class WebGPU_NativeWebRTC
{
    public static event Action OnLocalVideoTrack;
    public static event Action<int, int> OnRemoteVideoTrack;

    public static RenderTexture RemoteVideoTrackTexture = null;
    public static IntPtr RemoteVideoTrackTexturePtr = IntPtr.Zero;
 
    [MonoPInvokeCallback(typeof(Action))]
    public static void WebGpuOnLocalVideoTrackCreated()
    {
        Debug.Log($"=-== WebGpuOnLocalVideoTrackCreated");
        OnLocalVideoTrack?.Invoke();
    }

    [MonoPInvokeCallback(typeof(Action<int, int>))]
    public static void WebGpuOnRemoteVideoTrackGenerated(int width, int height)
    {
        OnRemoteVideoTrack?.Invoke(width, height);
    }

    [DllImport("__Internal")]
    public static extern void WebGpuSetup(
        string signalingServerUrl,
        int sendWidth,
        int sendHeight,
        int videoFrameRate,
        IntPtr sendTexturePtr,
        Action dlgOnLocalVideoTrackCreated,
        Action<int, int> dlgOnRemoteVideoTrackGenerated);

    [DllImport("__Internal")]
    public static extern void WebGpuConnect();

    [DllImport("__Internal")]
    public static extern void WebGpuRenderLocalVideoTrack();

    [DllImport("__Internal")]
    public static extern void WebGpuRenderRemoteVideoTrack(IntPtr RemoteVideoTrackTexturePtr);
}

