using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.UI;

public class TestCode : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void InitCanvas(int width, int height);
    [DllImport("__Internal")]
    private static extern void GetNativePixcelData(int texPtr);

    [SerializeField] private Camera _captureCamera;
    [SerializeField] private RawImage _preview;
    [SerializeField] private int _width = 640;
    [SerializeField] private int _height = 360;
    private RenderTexture _rt;
    private IntPtr _rtPtr;
    
    private void Init()
    {
        _rt = new RenderTexture(_width, _height, 24, RenderTextureFormat.ARGB32, 0);
        _ = _rt.colorBuffer;
        _rtPtr = _rt.GetNativeTexturePtr();
        _captureCamera.targetTexture = _rt;
        _preview.texture = _rt;
        InitCanvas(_width, _height);
    }

    private void Update()
    {
        GetNativePixcelData((int)_rtPtr);
    }
}