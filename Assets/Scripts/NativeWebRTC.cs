using UnityEngine;
using System.Runtime.InteropServices;
using System;
using AOT;

public class NativeWebRTC
{
    public static event Action OnLocalVideoTrack;
    public static event Action<int, int> OnRemoteVideoTrack;

    public static RenderTexture RemoteVideoTrackTexture = null;
    public static IntPtr RemoteVideoTrackTexturePtr = IntPtr.Zero;
 
    [MonoPInvokeCallback(typeof(Action))]
    public static void OnLocalVideoTrackCreated()
    {
        OnLocalVideoTrack?.Invoke();
    }

    [MonoPInvokeCallback(typeof(Action<int, int>))]
    public static void OnRemoteVideoTrackGenerated(int width, int height)
    {
        OnRemoteVideoTrack?.Invoke(width, height);
    }

    [DllImport("__Internal")]
    public static extern void Setup(
        string signalingServerUrl,
        int sendWidth,
        int sendHeight,
        IntPtr sendTexturePtr,
        Action dlgOnLocalVideoTrackCreated,
        Action<int, int> dlgOnRemoteVideoTrackGenerated);

    [DllImport("__Internal")]
    public static extern void Connect();

    [DllImport("__Internal")]
    public static extern void RenderLocalVideoTrack();

    [DllImport("__Internal")]
    public static extern void RenderRemoteVideoTrack(IntPtr RemoteVideoTrackTexturePtr);
}

